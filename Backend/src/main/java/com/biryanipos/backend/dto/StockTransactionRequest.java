package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.StockTransactionType;
import lombok.Data;

@Data
public class StockTransactionRequest {
  private Long stockItemId;
  private StockTransactionType transactionType;
  private double quantity;
  private String reason;
  private Long orderId; // optional
}
