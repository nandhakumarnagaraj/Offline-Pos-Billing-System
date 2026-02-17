package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "expenses")
public class Expense {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String category; // UTILITY, SALARY, SUPPLIES, RENT, MAINTENANCE, OTHER

  @Column(nullable = false)
  private String description;

  @Column(nullable = false)
  private double amount;

  private String supplierName;

  private String paymentMethod; // CASH, BANK_TRANSFER, UPI

  @Column(nullable = false)
  private LocalDate expenseDate;

  @ManyToOne
  @JoinColumn(name = "supplier_id")
  private Supplier supplier;

  private double gstAmount;

  private boolean isRecurring = false;
  private String recurringInterval; // MONTHLY, WEEKLY

  private String receiptImageUrl;

  private String notes;

  private LocalDateTime createdAt;

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    if (expenseDate == null) {
      expenseDate = LocalDate.now();
    }
  }
}
