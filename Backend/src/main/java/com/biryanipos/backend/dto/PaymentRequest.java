package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.PaymentMode;
import lombok.Data;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
  private Long orderId;
  private PaymentMode paymentMode;
  private double discount;
  private double amountReceived; // For cash — to compute change
  private String transactionRef; // UPI ref / card auth code
  private java.util.List<PaymentModeDetail> paymentModes;

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class PaymentModeDetail {
    private PaymentMode mode;
    private double amount;
    private String ref; // Optional ref for specific mode
  }
}
