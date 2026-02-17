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
@Table(name = "stock_items", indexes = {
    @Index(name = "idx_stock_active", columnList = "active")
})
public class StockItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String name;

  private String unit; // KG, LITRE, PIECE, PACKET

  @Column(nullable = false)
  private double currentStock = 0;

  @Column(nullable = false)
  private double reorderLevel = 50.0; // Alert when stock falls below this (Default 50)

  private double costPerUnit;

  private String supplier; // String for backward compatibility or simple entry

  @ManyToOne
  @JoinColumn(name = "supplier_id")
  private Supplier supplierRef;

  @Column(nullable = false)
  private boolean active = true;

  private LocalDateTime lastUpdated;

  private LocalDateTime lastAuditDate;

  @PrePersist
  @PreUpdate
  protected void onUpdate() {
    lastUpdated = LocalDateTime.now();
  }

  public boolean isLowStock() {
    return currentStock <= reorderLevel;
  }
}
