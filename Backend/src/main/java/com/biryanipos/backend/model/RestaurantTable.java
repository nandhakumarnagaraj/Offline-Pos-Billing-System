package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "restaurant_tables")
public class RestaurantTable {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String tableNumber;

  @Column(nullable = false)
  private int capacity = 4;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TableStatus status = TableStatus.AVAILABLE;

  // Current active order on this table (null if available)
  private Long currentOrderId;
}
