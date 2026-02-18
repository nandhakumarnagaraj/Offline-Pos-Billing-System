package com.biryanipos.backend.dto;

import lombok.Data;

@Data
public class InitiateDigitalPaymentRequest {
    private Long orderId;
    private Double discount;
    private Double amount;
    private String mode;
    private String upiId;
    private String metadata;
}
