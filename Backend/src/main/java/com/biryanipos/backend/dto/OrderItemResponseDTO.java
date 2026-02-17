package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.OrderItem;
import lombok.Data;

@Data
public class OrderItemResponseDTO {
  private Long id;
  private String menuItemName;
  private int quantity;
  private double price;
  private String variationName;

  public static OrderItemResponseDTO from(OrderItem item) {
    OrderItemResponseDTO dto = new OrderItemResponseDTO();
    dto.setId(item.getId());
    dto.setMenuItemName(item.getMenuItem().getName());
    dto.setQuantity(item.getQuantity());
    dto.setPrice(item.getPrice());
    if (item.getMenuItemVariation() != null) {
      dto.setVariationName(item.getMenuItemVariation().getName());
    }
    return dto;
  }
}
