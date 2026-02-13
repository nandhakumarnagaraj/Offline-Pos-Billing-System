package com.biryanipos.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payment_details")
public class PaymentDetail {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "payment_id", nullable = false)
  @JsonIgnore
  private Payment payment;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PaymentMode paymentMode;

  @Column(nullable = false)
  private double amount;

  private String transactionRef;
}
