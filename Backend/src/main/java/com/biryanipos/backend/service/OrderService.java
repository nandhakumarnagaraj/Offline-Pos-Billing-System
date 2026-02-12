package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.OrderItemRequest;
import com.biryanipos.backend.dto.OrderRequest;
import com.biryanipos.backend.model.*;
import com.biryanipos.backend.repository.MenuItemRepository;
import com.biryanipos.backend.repository.OrderRepository;
import com.biryanipos.backend.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

  private final OrderRepository orderRepository;
  private final MenuItemRepository menuItemRepository;
  private final TableRepository tableRepository;
  private final SimpMessagingTemplate messagingTemplate;

  @Transactional
  public Order createOrder(OrderRequest request) {
    Order order = new Order();
    order.setCustomerName(request.getCustomerName());
    order.setCustomerPhone(request.getCustomerPhone());
    order.setTableNumber(request.getTableNumber());
    order.setOrderType(request.getOrderType() != null ? request.getOrderType() : OrderType.DINE_IN);
    order.setStatus(OrderStatus.NEW);
    order.setPaymentStatus(PaymentStatus.PENDING);
    order.setCreatedBy(request.getCreatedBy());

    double subtotal = 0;
    List<OrderItem> orderItems = new ArrayList<>();

    for (OrderItemRequest itemRequest : request.getItems()) {
      MenuItem menuItem = menuItemRepository.findById(itemRequest.getMenuItemId())
          .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemRequest.getMenuItemId()));

      if (!menuItem.isAvailable()) {
        throw new RuntimeException("Menu item not available: " + menuItem.getName());
      }

      OrderItem orderItem = new OrderItem();
      orderItem.setMenuItem(menuItem);
      orderItem.setQuantity(itemRequest.getQuantity());
      orderItem.setPrice(menuItem.getPrice());
      orderItem.setOrder(order);

      subtotal += menuItem.getPrice() * itemRequest.getQuantity();
      orderItems.add(orderItem);
    }

    order.setItems(orderItems);
    order.setSubtotal(subtotal);

    // Calculate GST (5% total = 2.5% CGST + 2.5% SGST for restaurant food)
    double cgst = Math.round(subtotal * 2.5) / 100.0;
    double sgst = Math.round(subtotal * 2.5) / 100.0;
    order.setCgst(cgst);
    order.setSgst(sgst);
    order.setTotalAmount(subtotal + cgst + sgst);

    Order savedOrder = orderRepository.save(order);

    // Mark table as occupied for dine-in orders
    if (order.getOrderType() == OrderType.DINE_IN && request.getTableNumber() != null) {
      tableRepository.findByTableNumber(request.getTableNumber()).ifPresent(table -> {
        table.setStatus(TableStatus.OCCUPIED);
        table.setCurrentOrderId(savedOrder.getId());
        tableRepository.save(table);
      });
    }

    // Notify KDS via WebSocket
    messagingTemplate.convertAndSend("/topic/orders", savedOrder);
    messagingTemplate.convertAndSend("/topic/tables", "TABLE_UPDATE");

    return savedOrder;
  }

  @Transactional
  public Order addItemsToOrder(Long orderId, List<OrderItemRequest> newItems) {
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

    if (order.getStatus() == OrderStatus.PAID || order.getStatus() == OrderStatus.CANCELLED) {
      throw new RuntimeException("Cannot add items to a completed/cancelled order");
    }

    double additionalSubtotal = 0;

    for (OrderItemRequest itemRequest : newItems) {
      MenuItem menuItem = menuItemRepository.findById(itemRequest.getMenuItemId())
          .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemRequest.getMenuItemId()));

      if (!menuItem.isAvailable()) {
        throw new RuntimeException("Menu item not available: " + menuItem.getName());
      }

      OrderItem orderItem = new OrderItem();
      orderItem.setMenuItem(menuItem);
      orderItem.setQuantity(itemRequest.getQuantity());
      orderItem.setPrice(menuItem.getPrice());
      orderItem.setOrder(order);

      additionalSubtotal += menuItem.getPrice() * itemRequest.getQuantity();
      order.getItems().add(orderItem);
    }

    // Recalculate totals
    double newSubtotal = order.getSubtotal() + additionalSubtotal;
    order.setSubtotal(newSubtotal);
    double cgst = Math.round(newSubtotal * 2.5) / 100.0;
    double sgst = Math.round(newSubtotal * 2.5) / 100.0;
    order.setCgst(cgst);
    order.setSgst(sgst);
    order.setTotalAmount(newSubtotal + cgst + sgst);

    Order saved = orderRepository.save(order);

    // Notify KDS of updated order
    messagingTemplate.convertAndSend("/topic/orders", saved);

    return saved;
  }

  public List<Order> getAllOrders() {
    return orderRepository.findAll();
  }

  public List<Order> getActiveOrders() {
    return orderRepository.findActiveOrders();
  }

  public List<Order> getKitchenOrders() {
    return orderRepository.findKitchenOrders();
  }

  public List<Order> getOrdersByDateRange(LocalDateTime start, LocalDateTime end) {
    return orderRepository.findByCreatedAtBetween(start, end);
  }

  @Transactional
  public Order updateStatus(Long orderId, OrderStatus status) {
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new RuntimeException("Order not found"));

    order.setStatus(status);

    if (status == OrderStatus.SERVED || status == OrderStatus.PAID) {
      order.setCompletedAt(LocalDateTime.now());
    }

    // Mark order as frozen after status change from NEW
    if (status == OrderStatus.COOKING && !order.isFrozen()) {
      order.setFrozen(true);
      order.setFrozenAt(LocalDateTime.now());
    }

    Order updatedOrder = orderRepository.save(order);

    // Notify all listeners
    messagingTemplate.convertAndSend("/topic/orders/update", updatedOrder);

    // If PAID, release the table
    if (status == OrderStatus.PAID && order.getOrderType() == OrderType.DINE_IN && order.getTableNumber() != null) {
      tableRepository.findByTableNumber(order.getTableNumber()).ifPresent(table -> {
        table.setStatus(TableStatus.AVAILABLE);
        table.setCurrentOrderId(null);
        tableRepository.save(table);
        messagingTemplate.convertAndSend("/topic/tables", "TABLE_UPDATE");
      });
    }

    return updatedOrder;
  }

  public Order getOrderById(Long id) {
    return orderRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Order not found: " + id));
  }

  @Transactional
  public Order cancelOrder(Long orderId) {
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new RuntimeException("Order not found"));

    if (order.getStatus() == OrderStatus.PAID) {
      throw new RuntimeException("Cannot cancel a paid order");
    }

    order.setStatus(OrderStatus.CANCELLED);
    order.setCompletedAt(LocalDateTime.now());
    Order saved = orderRepository.save(order);

    // Release the table
    if (order.getOrderType() == OrderType.DINE_IN && order.getTableNumber() != null) {
      tableRepository.findByTableNumber(order.getTableNumber()).ifPresent(table -> {
        table.setStatus(TableStatus.AVAILABLE);
        table.setCurrentOrderId(null);
        tableRepository.save(table);
        messagingTemplate.convertAndSend("/topic/tables", "TABLE_UPDATE");
      });
    }

    messagingTemplate.convertAndSend("/topic/orders/update", saved);
    return saved;
  }
}
