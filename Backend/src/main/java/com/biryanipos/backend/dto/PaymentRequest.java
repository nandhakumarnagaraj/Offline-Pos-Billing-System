package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.PaymentMode;
import lombok.Data;

@Data
public class PaymentRequest {
  private Long orderId;
  private PaymentMode paymentMode;
  private double discount;
  private double amountReceived; // For cash — to compute change
  private String transactionRef; // UPI ref / card auth code
}
