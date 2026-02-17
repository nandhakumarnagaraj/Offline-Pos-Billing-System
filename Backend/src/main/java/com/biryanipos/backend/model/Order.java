package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_status", columnList = "status"),
    @Index(name = "idx_order_table", columnList = "tableNumber"),
    @Index(name = "idx_order_created", columnList = "createdAt")
})
public class Order {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String customerName;
  private String customerPhone;

  private String tableNumber;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private OrderType orderType = OrderType.DINE_IN;

  @Enumerated(EnumType.STRING)
  private OrderStatus status = OrderStatus.NEW;

  @Enumerated(EnumType.STRING)
  private PaymentStatus paymentStatus = PaymentStatus.PENDING;

  private LocalDateTime createdAt;
  private LocalDateTime completedAt;
  private LocalDateTime frozenAt; // When modification window expired
  private LocalDateTime estimatedReadyTime;

  // Monetary fields
  private double subtotal; // Before tax
  private double cgst; // Central GST
  private double sgst; // State GST
  private double totalAmount; // subtotal + cgst + sgst
  private double discount;

  // Freeze logic: true = order cannot be modified (items can still be added
  // separately)
  @Column(nullable = false)
  private boolean frozen = false;

  // Who created this order
  private String createdBy; // waiter name / "CUSTOMER_QR" / "CASHIER"

  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<OrderItem> items = new ArrayList<>();

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
  }
}
