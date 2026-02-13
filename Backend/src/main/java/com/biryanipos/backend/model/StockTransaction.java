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
@Table(name = "stock_transactions")
public class StockTransaction {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "stock_item_id", nullable = false)
  private StockItem stockItem;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StockTransactionType transactionType;

  @Column(nullable = false)
  private double quantity;

  @Column(nullable = false, columnDefinition = "double precision default 0.0")

  private double unitCostSnapshot; // Unit cost at the time of transaction for COGS

  private String reason; // e.g., "Expired", "Damaged", "Daily kitchen issue"

  private String wasteCategory; // SPOILAGE, PREP_ERROR, DAMAGED, CUSTOMER_RETURN

  private java.time.LocalDate expiryDate; // For PURCHASE transactions

  private Long orderId; // If linked to an order (ORDER_DEDUCT type)

  private LocalDateTime transactionDate;

  @PrePersist
  protected void onCreate() {
    transactionDate = LocalDateTime.now();
  }
}
