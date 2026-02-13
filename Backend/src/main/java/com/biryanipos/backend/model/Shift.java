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
@Table(name = "shifts")
public class Shift {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String openedBy;
  private LocalDateTime openingTime;
  private double openingCash;

  private String closedBy;
  private LocalDateTime closingTime;
  private double closingCash;
  private double expectedCash; // Calculated from sales
  private double variance; // difference between actual and expected

  private boolean active = true;

  // Shift summary stats
  private double totalSales;
  private double totalCgst;
  private double totalSgst;
  private double totalDiscount;
  private int orderCount;

  @PrePersist
  protected void onCreate() {
    if (openingTime == null)
      openingTime = LocalDateTime.now();
  }
}
