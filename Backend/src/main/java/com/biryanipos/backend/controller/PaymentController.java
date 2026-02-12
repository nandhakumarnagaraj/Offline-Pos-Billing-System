package com.biryanipos.backend.controller;

import com.biryanipos.backend.dto.BillResponse;
import com.biryanipos.backend.dto.PaymentRequest;
import com.biryanipos.backend.model.Payment;
import com.biryanipos.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

  private final PaymentService paymentService;

  @PostMapping
  public ResponseEntity<Payment> processPayment(@RequestBody PaymentRequest request) {
    return ResponseEntity.ok(paymentService.processPayment(request));
  }

  @GetMapping("/bill/{orderId}")
  public ResponseEntity<BillResponse> getBill(@PathVariable Long orderId) {
    return ResponseEntity.ok(paymentService.generateBill(orderId));
  }

  @GetMapping("/order/{orderId}")
  public ResponseEntity<Payment> getPaymentByOrder(@PathVariable Long orderId) {
    Payment payment = paymentService.getPaymentByOrderId(orderId);
    if (payment == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(payment);
  }
}
