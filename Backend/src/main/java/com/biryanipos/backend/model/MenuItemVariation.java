package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "menu_item_variations")
public class MenuItemVariation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String name; // e.g., "Regular", "Large", "Spicy"

  @Column(nullable = false)
  private double price;

  @Column(nullable = false, columnDefinition = "double precision default 1.0")
  private double stockMultiplier = 1.0; // Multiplier for ingredient usage (e.g. 0.5 for half portion)

  // Explicit constructor for backward compatibility
  public MenuItemVariation(Long id, String name, double price, MenuItem menuItem) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.menuItem = menuItem;
    this.stockMultiplier = 1.0;
  }

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "menu_item_id")
  @JsonIgnore
  private MenuItem menuItem;
}
