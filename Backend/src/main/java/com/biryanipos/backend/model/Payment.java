package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payments")
public class Payment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long orderId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PaymentMode paymentMode;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PaymentStatus paymentStatus = PaymentStatus.PENDING;

  @Column(nullable = false)
  private double subtotal; // Before tax

  @Column(nullable = false)
  private double cgst; // Central GST (2.5%)

  @Column(nullable = false)
  private double sgst; // State GST (2.5%)

  @Column(nullable = false)
  private double totalAmount; // subtotal + cgst + sgst

  private double discount;

  private double amountReceived;

  private double changeReturned;

  private String transactionRef; // UPI ref / card auth code

  private LocalDateTime paidAt;

  @PrePersist
  protected void onCreate() {
    if (paidAt == null && paymentStatus == PaymentStatus.COMPLETED) {
      paidAt = LocalDateTime.now();
    }
  }
}
