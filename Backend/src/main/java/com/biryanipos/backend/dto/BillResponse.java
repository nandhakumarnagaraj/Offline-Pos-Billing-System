package com.biryanipos.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BillResponse {
  private Long orderId;
  private String customerName;
  private String customerPhone;
  private String tableNumber;
  private String orderType;
  private boolean gstEnabled;

  private double subtotal;
  private double cgst;
  private double sgst;
  private double discount;
  private double totalAmount;

  private String paymentMode;
  private String paymentStatus;
  private double amountReceived;
  private double changeReturned;
  private String transactionRef;

  private String createdAt;
  private String paidAt;

  private java.util.List<PaymentModeDetail> paymentModes;
  private java.util.List<BillItem> items;

  @Data
  @AllArgsConstructor
  @NoArgsConstructor
  public static class PaymentModeDetail {
    private String mode;
    private double amount;
  }

  @Data
  @AllArgsConstructor
  @NoArgsConstructor
  public static class BillItem {
    private String name;
    private int quantity;
    private double unitPrice;
    private double total;
  }
}
