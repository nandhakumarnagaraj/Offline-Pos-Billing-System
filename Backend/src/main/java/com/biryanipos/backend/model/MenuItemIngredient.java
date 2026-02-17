package com.biryanipos.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "menu_item_ingredients")
public class MenuItemIngredient {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "menu_item_id", nullable = false)
  @JsonIgnore
  private MenuItem menuItem;

  @ManyToOne
  @JoinColumn(name = "stock_item_id", nullable = false)
  private StockItem stockItem;

  @Column(nullable = false)
  private double quantity; // Quantity required for one unit of the menu item (base portion)
}
