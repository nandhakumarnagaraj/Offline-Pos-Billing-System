package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.StockTransactionType;
import lombok.Data;

@Data
public class StockTransactionRequest {
  private Long stockItemId;
  private StockTransactionType transactionType;
  private double quantity;
  private String reason;
  private String wasteCategory;
  private java.time.LocalDate expiryDate;
  private Long orderId; // optional
}
