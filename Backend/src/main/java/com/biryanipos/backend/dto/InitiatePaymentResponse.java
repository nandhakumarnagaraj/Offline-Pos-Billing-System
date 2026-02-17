package com.biryanipos.backend.dto;

import lombok.Data;

@Data
public class InitiatePaymentResponse {
  private String status;
  private String message;
  private String accessKey;
  private String paymentUrl;
  private String qrCodeUrl;
}
