package com.biryanipos.backend.controller;

import com.biryanipos.backend.dto.OrderRequest;
import com.biryanipos.backend.dto.OrderItemRequest;
import com.biryanipos.backend.model.Order;
import com.biryanipos.backend.model.OrderStatus;
import com.biryanipos.backend.repository.PaymentRepository;
import com.biryanipos.backend.service.OrderService;
import com.biryanipos.backend.service.PrintingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

  private final OrderService orderService;
  private final PrintingService printingService;
  private final PaymentRepository paymentRepository;

  @PostMapping
  public ResponseEntity<Order> createOrder(@RequestBody OrderRequest request,
      org.springframework.security.core.Authentication auth) {
    if (auth != null) {
      request.setCreatedBy(auth.getName());
    }
    return ResponseEntity.ok(orderService.createOrder(request));
  }

  @GetMapping
  public ResponseEntity<List<Order>> getAllOrders() {
    return ResponseEntity.ok(orderService.getAllOrders());
  }

  @GetMapping("/active")
  public ResponseEntity<List<Order>> getActiveOrders() {
    return ResponseEntity.ok(orderService.getActiveOrders());
  }

  @GetMapping("/kitchen")
  public ResponseEntity<List<Order>> getKitchenOrders() {
    return ResponseEntity.ok(orderService.getKitchenOrders());
  }

  @GetMapping("/{id}")
  public ResponseEntity<Order> getOrder(@PathVariable Long id) {
    return ResponseEntity.ok(orderService.getOrderById(id));
  }

  @PutMapping("/{id}/status")
  public ResponseEntity<Order> updateStatus(@PathVariable Long id, @RequestParam OrderStatus status) {
    return ResponseEntity.ok(orderService.updateStatus(id, status));
  }

  @PostMapping("/{id}/items")
  public ResponseEntity<Order> addItems(@PathVariable Long id, @RequestBody List<OrderItemRequest> items) {
    return ResponseEntity.ok(orderService.addItemsToOrder(id, items));
  }

  @PutMapping("/items/{itemId}/status")
  public ResponseEntity<com.biryanipos.backend.model.OrderItem> updateItemStatus(
      @PathVariable Long itemId, @RequestParam OrderStatus status) {
    return ResponseEntity.ok(orderService.updateOrderItemStatus(itemId, status));
  }

  @PutMapping("/{id}/cancel")
  public ResponseEntity<Order> cancelOrder(@PathVariable Long id) {
    return ResponseEntity.ok(orderService.cancelOrder(id));
  }

  @PutMapping("/{id}/extend-time")
  public ResponseEntity<Order> extendPrepTime(@PathVariable Long id, @RequestParam int minutes) {
    return ResponseEntity.ok(orderService.extendOrderPrepTime(id, minutes));
  }

  @GetMapping("/by-date")
  public ResponseEntity<List<Order>> getOrdersByDate(
      @RequestParam String start,
      @RequestParam String end) {
    try {
      return ResponseEntity.ok(orderService.getOrdersByDateRange(
          LocalDate.parse(start).atStartOfDay(),
          LocalDate.parse(end).atTime(LocalTime.MAX)));
    } catch (DateTimeParseException e) {
      return ResponseEntity.badRequest().body(null); // Or return a specific error DTO if needed
    }
  }

  @GetMapping("/{id}/print")
  public ResponseEntity<String> printReceipt(@PathVariable Long id) {
    Order order = orderService.getOrderById(id);
    com.biryanipos.backend.model.Payment payment = paymentRepository.findByOrderId(id).orElse(null);
    return ResponseEntity.ok(printingService.generateTextReceipt(order, payment));
  }
}
