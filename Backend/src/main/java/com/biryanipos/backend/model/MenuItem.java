package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "menu_items")
public class MenuItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String name;

  private String description;

  @Column(nullable = false)
  private double price;

  @Column(nullable = false)
  private String category; // Kept as string for backward compat with existing data

  private Long categoryId; // Optional FK to Category entity

  @Builder.Default
  private boolean available = true;

  @Lob
  @Column(columnDefinition = "LONGTEXT")
  private String imageUrl;

  // GST percentage for this item (default 5% for restaurant food)
  @Column(nullable = false)
  @Builder.Default
  private double gstPercent = 5.0;

  // Preparation time in minutes (for KDS)
  @Builder.Default
  private int prepTimeMinutes = 15;

  // Is this a vegetarian item?
  @Builder.Default
  private boolean vegetarian = false;

  // Display order within category
  @Builder.Default
  private int displayOrder = 0;

  @OneToMany(mappedBy = "menuItem", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private java.util.List<MenuItemVariation> variations = new java.util.ArrayList<>();

  // Explicit constructor for backward compatibility with 12 parameters
  public MenuItem(Long id, String name, String description, double price, String category, Long categoryId,
      boolean available, String imageUrl, double gstPercent, int prepTimeMinutes, boolean vegetarian,
      int displayOrder) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = price;
    this.category = category;
    this.categoryId = categoryId;
    this.available = available;
    this.imageUrl = imageUrl;
    this.gstPercent = gstPercent;
    this.prepTimeMinutes = prepTimeMinutes;
    this.vegetarian = vegetarian;
    this.displayOrder = displayOrder;
    this.variations = new java.util.ArrayList<>();
  }

  public void setVariations(java.util.List<MenuItemVariation> variations) {
    this.variations.clear();
    if (variations != null) {
      for (MenuItemVariation variation : variations) {
        addVariation(variation);
      }
    }
  }

  public void addVariation(MenuItemVariation variation) {
    variations.add(variation);
    variation.setMenuItem(this);
  }

  public double getDisplayPrice() {
    if (variations != null && !variations.isEmpty()) {
      return variations.get(0).getPrice();
    }
    return price;
  }
}
