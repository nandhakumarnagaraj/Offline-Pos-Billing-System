package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.OrderItemRequest;
import com.biryanipos.backend.dto.OrderRequest;
import com.biryanipos.backend.dto.StockTransactionRequest;
import com.biryanipos.backend.model.*;
import com.biryanipos.backend.repository.MenuItemRepository;
import com.biryanipos.backend.repository.OrderItemRepository;
import com.biryanipos.backend.repository.OrderRepository;
import com.biryanipos.backend.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.biryanipos.backend.config.AppProperties;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

  private final OrderRepository orderRepository;
  private final OrderItemRepository orderItemRepository;
  private final MenuItemRepository menuItemRepository;
  private final TableRepository tableRepository;
  private final StockService stockService;
  private final SimpMessagingTemplate messagingTemplate;
  private final AppProperties appProperties;

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
    int maxPrepTime = 0;
    List<OrderItem> orderItems = new ArrayList<>();

    if (request.getItems() == null) {
      throw new RuntimeException("Items list is required");
    }

    // Atomic pass: Lock, Validate, and Deduct
    for (OrderItemRequest itemRequest : request.getItems()) {
      if (itemRequest.getMenuItemId() == null) {
        throw new RuntimeException("Menu item ID is required");
      }

      // Fetch with lock to prevent race conditions during deduction
      MenuItem menuItem = menuItemRepository.findByIdWithLock(itemRequest.getMenuItemId())
          .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemRequest.getMenuItemId()));

      MenuItemVariation variation = null;
      if (itemRequest.getVariationId() != null) {
        variation = menuItem.getVariations().stream()
            .filter(v -> v.getId().equals(itemRequest.getVariationId()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Variation not found"));
      }

      // Deduct stock (validation happens inside deductStock which is now locked)
      deductStock(menuItem, variation, itemRequest.getQuantity());

      OrderItem orderItem = new OrderItem();
      orderItem.setMenuItem(menuItem);
      orderItem.setQuantity(itemRequest.getQuantity());

      double itemPrice = menuItem.getPrice();
      if (variation != null) {
        orderItem.setMenuItemVariation(variation);
        itemPrice = variation.getPrice();
      }

      orderItem.setPrice(itemPrice);
      orderItem.setOrder(order);

      subtotal += itemPrice * itemRequest.getQuantity();
      int prepTime = menuItem.getPrepTimeMinutes() > 0 ? menuItem.getPrepTimeMinutes()
          : appProperties.getOrder().getDefaultPrepTimeMinutes();
      if (prepTime > maxPrepTime)
        maxPrepTime = prepTime;

      orderItems.add(orderItem);
    }

    if (maxPrepTime < appProperties.getOrder().getDefaultPrepTimeMinutes())
      maxPrepTime = appProperties.getOrder().getDefaultPrepTimeMinutes();

    order.setEstimatedReadyTime(LocalDateTime.now().plusMinutes(maxPrepTime));
    order.setItems(orderItems);
    order.setSubtotal(subtotal);

    // Calculate GST based on items
    double totalCgst = 0;
    double totalSgst = 0;
    for (OrderItem item : orderItems) {
      double itemSubtotal = item.getPrice() * item.getQuantity();
      double itemGstPercent = item.getMenuItem().getGstPercent();
      totalCgst += (itemSubtotal * (itemGstPercent / 2.0)) / 100.0;
      totalSgst += (itemSubtotal * (itemGstPercent / 2.0)) / 100.0;
    }

    order.setCgst(totalCgst);
    order.setSgst(totalSgst);
    order.setTotalAmount(subtotal + order.getCgst() + order.getSgst());

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
    if (orderId == null) {
      throw new RuntimeException("Order ID is required");
    }
    if (newItems == null || newItems.isEmpty()) {
      throw new RuntimeException("New items list is required");
    }
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

    if (order.getStatus() == OrderStatus.PAID || order.getStatus() == OrderStatus.CANCELLED) {
      throw new RuntimeException("Cannot add items to a completed/cancelled order");
    }

    // Reset status to NEW if currently READY or SERVED so kitchen sees the new
    // items
    if (order.getStatus() == OrderStatus.READY || order.getStatus() == OrderStatus.SERVED) {
      order.setStatus(OrderStatus.NEW);
    }

    for (OrderItemRequest itemRequest : newItems) {
      if (itemRequest.getMenuItemId() == null) {
        throw new RuntimeException("Menu item ID is required");
      }
      MenuItem menuItem = menuItemRepository.findById(java.util.Objects.requireNonNull(itemRequest.getMenuItemId()))
          .orElseThrow(() -> new RuntimeException("Menu item not found: " + itemRequest.getMenuItemId()));

      if (!menuItem.isAvailable()) {
        throw new RuntimeException("Menu item not available: " + menuItem.getName());
      }

      MenuItemVariation variation = null;
      if (itemRequest.getVariationId() != null) {
        variation = menuItem.getVariations().stream()
            .filter(v -> v.getId().equals(itemRequest.getVariationId()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Variation not found"));
      }

      // Deduct stock if tracking is enabled
      deductStock(menuItem, variation, itemRequest.getQuantity());

      OrderItem orderItem = new OrderItem();
      orderItem.setMenuItem(menuItem);
      orderItem.setQuantity(itemRequest.getQuantity());

      double itemPrice = menuItem.getPrice();
      if (variation != null) {
        orderItem.setMenuItemVariation(variation);
        itemPrice = variation.getPrice();
      }

      orderItem.setPrice(itemPrice);
      orderItem.setOrder(order);

      order.getItems().add(orderItem);
    }

    // Recalculate totals
    double newSubtotal = 0;
    double totalCgst = 0;
    double totalSgst = 0;

    for (OrderItem item : order.getItems()) {
      double itemSubtotal = item.getPrice() * item.getQuantity();
      newSubtotal += itemSubtotal;
      double itemGstPercent = item.getMenuItem().getGstPercent();
      totalCgst += (itemSubtotal * (itemGstPercent / 2.0)) / 100.0;
      totalSgst += (itemSubtotal * (itemGstPercent / 2.0)) / 100.0;
    }

    order.setSubtotal(newSubtotal);
    order.setCgst(totalCgst);
    order.setSgst(totalSgst);
    order.setTotalAmount(newSubtotal + order.getCgst() + order.getSgst());

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
    if (orderId == null) {
      throw new RuntimeException("Order ID is required");
    }
    if (status == null) {
      throw new RuntimeException("Status is required");
    }
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

  @Transactional
  public OrderItem updateOrderItemStatus(Long itemId, OrderStatus status) {
    if (itemId == null || status == null) {
      throw new RuntimeException("Item ID and status are required");
    }

    OrderItem item = orderItemRepository.findById(itemId)
        .orElseThrow(() -> new RuntimeException("Order item not found: " + itemId));

    item.setStatus(status);
    OrderItem savedItem = orderItemRepository.save(item);

    // Propagate status to the parent order
    Order order = item.getOrder();
    if (order != null) {
      boolean orderUpdated = false;

      // 1. If any item is COOKING, order must be COOKING (if it was NEW)
      if (status == OrderStatus.COOKING && order.getStatus() == OrderStatus.NEW) {
        order.setStatus(OrderStatus.COOKING);
        orderUpdated = true;
      }

      // 2. If ALL items are READY, order becomes READY (if it wasn't already)
      boolean allReady = order.getItems().stream()
          .allMatch(i -> i.getStatus() == OrderStatus.READY || i.getStatus() == OrderStatus.SERVED);

      if (allReady && order.getStatus() != OrderStatus.READY && order.getStatus() != OrderStatus.SERVED
          && order.getStatus() != OrderStatus.PAID && order.getStatus() != OrderStatus.CANCELLED) {
        order.setStatus(OrderStatus.READY);
        orderUpdated = true;
      }

      if (orderUpdated) {
        orderRepository.save(order);
        messagingTemplate.convertAndSend("/topic/orders", order);
        messagingTemplate.convertAndSend("/topic/orders/update", order);
      } else {
        // Even if order status didn't change, the item status did, so notify KDS
        messagingTemplate.convertAndSend("/topic/orders", order);
      }
    }

    return savedItem;
  }

  public Order getOrderById(Long id) {
    return orderRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Order not found: " + id));
  }

  @Transactional
  public Order cancelOrder(Long orderId) {
    if (orderId == null) {
      throw new RuntimeException("Order ID is required");
    }
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new RuntimeException("Order not found"));

    if (order.getStatus() == OrderStatus.PAID) {
      throw new RuntimeException("Cannot cancel a paid order");
    }

    order.setStatus(OrderStatus.CANCELLED);
    order.setCompletedAt(LocalDateTime.now());
    Order saved = orderRepository.save(order);

    // Restore stock if it was deducted
    for (OrderItem item : order.getItems()) {
      restoreStock(item.getMenuItem(), item.getMenuItemVariation(), item.getQuantity());
    }

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

  private void restoreStock(MenuItem menuItem, MenuItemVariation variation, int quantity) {
    double multiplier = (variation != null) ? variation.getStockMultiplier() : 1.0;

    // 1. Direct tracking
    if (menuItem.isTrackStock()) {
      menuItem.setStockLevel(menuItem.getStockLevel() + (quantity * multiplier));
      menuItemRepository.save(menuItem);
    }

    // 2. Recipe-based
    if (menuItem.getIngredients() != null) {
      for (MenuItemIngredient ingredient : menuItem.getIngredients()) {
        StockItem rawItem = ingredient.getStockItem();
        double amountToRestore = ingredient.getQuantity() * quantity * multiplier;

        StockTransactionRequest request = new StockTransactionRequest();
        request.setStockItemId(rawItem.getId());
        request.setTransactionType(StockTransactionType.RETURN_FROM_ORDER);
        request.setQuantity(amountToRestore);
        request.setReason("Cancelled order: " + menuItem.getName());
        stockService.recordTransaction(request);
      }
    }
  }

  @Transactional
  public Order extendOrderPrepTime(Long orderId, int extraMinutes) {
    if (orderId == null) {
      throw new RuntimeException("Order ID is required");
    }
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

    if (order.getEstimatedReadyTime() == null) {
      order.setEstimatedReadyTime(LocalDateTime.now().plusMinutes(extraMinutes));
    } else {
      order.setEstimatedReadyTime(order.getEstimatedReadyTime().plusMinutes(extraMinutes));
    }

    Order saved = orderRepository.save(order);
    messagingTemplate.convertAndSend("/topic/orders", saved);
    messagingTemplate.convertAndSend("/topic/orders/update", saved);
    return saved;
  }

  private void deductStock(MenuItem menuItem, MenuItemVariation variation, int quantity) {
    double multiplier = (variation != null) ? variation.getStockMultiplier() : 1.0;

    // 1. Direct tracking for the MenuItem (e.g., bottled drinks)
    if (menuItem.isTrackStock()) {
      double required = quantity * multiplier;
      if (menuItem.getStockLevel() < required) {
        throw new RuntimeException("Insufficient stock for \"" + menuItem.getName() +
            "\". Available: " + menuItem.getStockLevel() + ", Requested: " + required);
      }
      menuItem.setStockLevel(menuItem.getStockLevel() - required);
      if (menuItem.getStockLevel() <= 0) {
        menuItem.setAvailable(false);
      }

      // Stock Alert
      if (menuItem.getStockLevel() < appProperties.getInventory().getDefaultLowStockThreshold()) {
        messagingTemplate.convertAndSend("/topic/stock/alerts",
            "RUNNING OUT OF STOCK: " + menuItem.getName() + " (" + menuItem.getStockLevel() + " remaining)");
      }

      menuItemRepository.save(menuItem);
    }

    // 2. Recipe-based Ingredient Tracking
    if (menuItem.getIngredients() != null && !menuItem.getIngredients().isEmpty()) {
      for (MenuItemIngredient ingredient : menuItem.getIngredients()) {
        StockItem rawItem = ingredient.getStockItem();
        double amountToDeduct = ingredient.getQuantity() * quantity * multiplier;

        if (rawItem.getCurrentStock() < amountToDeduct) {
          throw new RuntimeException("Insufficient raw material: " + rawItem.getName() +
              " for " + menuItem.getName() + ". Available: " + rawItem.getCurrentStock() +
              " " + rawItem.getUnit());
        }

        // Record the deduction as a transaction
        StockTransactionRequest request = new StockTransactionRequest();
        request.setStockItemId(rawItem.getId());
        request.setTransactionType(StockTransactionType.ORDER_DEDUCT);
        request.setQuantity(amountToDeduct);
        request.setReason("Ingredients for Order Item: " + menuItem.getName());
        // If order object was available we could link orderId here
        stockService.recordTransaction(request);
      }
    }
  }
}
