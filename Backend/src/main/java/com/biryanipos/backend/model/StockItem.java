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
@Table(name = "stock_items")
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
  private double reorderLevel = 0; // Alert when stock falls below this

  private double costPerUnit;

  private String supplier;

  @Column(nullable = false)
  private boolean active = true;

  private LocalDateTime lastUpdated;

  @PrePersist
  @PreUpdate
  protected void onUpdate() {
    lastUpdated = LocalDateTime.now();
  }

  public boolean isLowStock() {
    return currentStock <= reorderLevel;
  }
}
