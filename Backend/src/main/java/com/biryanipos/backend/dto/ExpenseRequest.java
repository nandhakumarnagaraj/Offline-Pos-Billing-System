package com.biryanipos.backend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ExpenseRequest {
  private String category;
  private String description;
  private double amount;
  private String supplierName;
  private String paymentMethod;
  private LocalDate expenseDate;
  private Long supplierId;
  private double gstAmount;
  private boolean isRecurring;
  private String recurringInterval;
  private String receiptImageUrl;
  private String notes;
}
