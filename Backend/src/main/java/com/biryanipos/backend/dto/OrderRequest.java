package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.OrderType;
import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {
  private String customerName;
  private String customerPhone;
  private String tableNumber;
  private OrderType orderType = OrderType.DINE_IN;
  private String createdBy;
  private List<OrderItemRequest> items;
}
