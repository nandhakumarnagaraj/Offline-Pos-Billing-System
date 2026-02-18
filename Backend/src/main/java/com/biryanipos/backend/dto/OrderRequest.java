package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.OrderType;
import lombok.Data;
import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Data
public class OrderRequest {
  @NotNull(message = "Customer name required")
  @Size(min = 2, max = 100)
  private String customerName;

  @Pattern(regexp = "^[0-9]{10}$", message = "Invalid phone number")
  private String customerPhone;

  private String tableNumber;
  private OrderType orderType = OrderType.DINE_IN;
  private String createdBy;
  private boolean gstEnabled = false;

  @NotEmpty(message = "Order must have at least one item")
  private List<OrderItemRequest> items;
}
