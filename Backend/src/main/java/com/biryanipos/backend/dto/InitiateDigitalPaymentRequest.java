package com.biryanipos.backend.dto;

import lombok.Data;

@Data
public class InitiateDigitalPaymentRequest {
    private Long orderId;
    private Double discount;
    private String mode;
    private String upiId;
}
