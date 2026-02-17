package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.Order;
import com.biryanipos.backend.model.OrderStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class OrderResponseDTO {
  private Long id;
  private String customerName;
  private String tableNumber;
  private OrderStatus status;
  private List<OrderItemResponseDTO> items;
  private Double totalAmount;
  private Double subtotal;
  private Double cgst;
  private Double sgst;
  private Double discount;
  private LocalDateTime createdAt;
  private String createdBy;

  public static OrderResponseDTO from(Order order) {
    OrderResponseDTO dto = new OrderResponseDTO();
    dto.setId(order.getId());
    dto.setCustomerName(order.getCustomerName());
    dto.setTableNumber(order.getTableNumber());
    dto.setStatus(order.getStatus());
    dto.setTotalAmount(order.getTotalAmount());
    dto.setSubtotal(order.getSubtotal());
    dto.setCgst(order.getCgst());
    dto.setSgst(order.getSgst());
    dto.setDiscount(order.getDiscount());
    dto.setCreatedAt(order.getCreatedAt());
    dto.setCreatedBy(order.getCreatedBy());

    if (order.getItems() != null) {
      dto.setItems(order.getItems().stream()
          .map(OrderItemResponseDTO::from)
          .collect(Collectors.toList()));
    }
    return dto;
  }
}
