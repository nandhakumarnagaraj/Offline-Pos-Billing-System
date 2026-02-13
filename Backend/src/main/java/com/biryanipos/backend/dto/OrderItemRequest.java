package com.biryanipos.backend.dto;

import lombok.Data;

@Data
public class OrderItemRequest {
  private Long menuItemId;
  private Long variationId;
  private int quantity;
}
