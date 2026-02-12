package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.OrderItemRequest;
import com.biryanipos.backend.dto.OrderRequest;
import com.biryanipos.backend.model.MenuItem;
import com.biryanipos.backend.model.Order;
import com.biryanipos.backend.model.OrderStatus;
import com.biryanipos.backend.repository.MenuItemRepository;
import com.biryanipos.backend.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Collections;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OrderServiceTest {

  @Mock
  private OrderRepository orderRepository;

  @Mock
  private MenuItemRepository menuItemRepository;

  @Mock
  private SimpMessagingTemplate messagingTemplate;

  @InjectMocks
  private OrderService orderService;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
  }

  @Test
  void createOrder_Success() {
    // Arrange
    MenuItem menuItem = new MenuItem(1L, "Biryani", "Spicy", 250.0, "Main", true, null);
    when(menuItemRepository.findById(1L)).thenReturn(Optional.of(menuItem));

    OrderRequest request = new OrderRequest();
    request.setCustomerName("John Doe");
    request.setTableNumber("T1");

    OrderItemRequest itemRequest = new OrderItemRequest();
    itemRequest.setMenuItemId(1L);
    itemRequest.setQuantity(2);
    request.setItems(Collections.singletonList(itemRequest));

    Order savedOrder = new Order();
    savedOrder.setId(101L);
    savedOrder.setCustomerName("John Doe");
    savedOrder.setTotalAmount(500.0);
    savedOrder.setStatus(OrderStatus.NEW);

    when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);

    // Act
    Order result = orderService.createOrder(request);

    // Assert
    assertNotNull(result);
    assertEquals(101L, result.getId());
    assertEquals(500.0, result.getTotalAmount());
    verify(orderRepository).save(any(Order.class));
    verify(messagingTemplate).convertAndSend(eq("/topic/orders"), any(Order.class));
  }

  @Test
  void createOrder_ItemNotFound() {
    // Arrange
    when(menuItemRepository.findById(99L)).thenReturn(Optional.empty());

    OrderRequest request = new OrderRequest();
    OrderItemRequest itemRequest = new OrderItemRequest();
    itemRequest.setMenuItemId(99L);
    request.setItems(Collections.singletonList(itemRequest));

    // Act & Assert
    assertThrows(RuntimeException.class, () -> orderService.createOrder(request));
  }

  @Test
  void updateStatus_Success() {
    // Arrange
    Order existingOrder = new Order();
    existingOrder.setId(101L);
    existingOrder.setStatus(OrderStatus.NEW);

    when(orderRepository.findById(101L)).thenReturn(Optional.of(existingOrder));
    when(orderRepository.save(any(Order.class))).thenReturn(existingOrder);

    // Act
    Order result = orderService.updateStatus(101L, OrderStatus.COOKING);

    // Assert
    assertEquals(OrderStatus.COOKING, result.getStatus());
    verify(messagingTemplate).convertAndSend(eq("/topic/orders/update"), any(Order.class));
  }
}
