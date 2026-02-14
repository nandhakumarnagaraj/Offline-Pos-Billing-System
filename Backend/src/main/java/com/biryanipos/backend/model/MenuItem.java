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
@Table(name = "menu_items", indexes = {
    @Index(name = "idx_menu_category", columnList = "category"),
    @Index(name = "idx_menu_name", columnList = "name"),
    @Index(name = "idx_menu_available", columnList = "available")
})
public class MenuItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String name;

  @Column(unique = true)
  private String barcode;

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
  @Column(nullable = false, columnDefinition = "double precision default 5.0")
  @Builder.Default
  private double gstPercent = 5.0;

  // Preparation time in minutes (for KDS)
  @Column(nullable = false, columnDefinition = "integer default 15")
  @Builder.Default
  private int prepTimeMinutes = 15;

  // Is this a vegetarian item?
  @Column(nullable = false, columnDefinition = "boolean default false")
  @Builder.Default
  private boolean vegetarian = false;

  // Display order within category
  @Column(nullable = false, columnDefinition = "integer default 0")
  @Builder.Default
  private int displayOrder = 0;

  private String preparationStation; // e.g., "Main Kitchen", "Bar", "Dessert Station"

  @OneToMany(mappedBy = "menuItem", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private java.util.List<MenuItemVariation> variations = new java.util.ArrayList<>();

  @OneToMany(mappedBy = "menuItem", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private java.util.List<MenuItemIngredient> ingredients = new java.util.ArrayList<>();

  // Inventory tracking for this specific item (e.g., for bottled drinks)
  @Column(nullable = false, columnDefinition = "boolean default false")
  @Builder.Default
  private boolean trackStock = false;

  @Column(nullable = false, columnDefinition = "double precision default 0.0")
  @Builder.Default
  private double stockLevel = 0.0;

  // Explicit constructor for backward compatibility
  public MenuItem(Long id, String name, String description, double price, String category, Long categoryId,
      boolean available, String imageUrl, double gstPercent, int prepTimeMinutes, boolean vegetarian,
      int displayOrder, boolean trackStock, double stockLevel, String preparationStation) {
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
    this.trackStock = trackStock;
    this.stockLevel = stockLevel;
    this.preparationStation = preparationStation;
    this.variations = new java.util.ArrayList<>();
  }

  // Legacy constructor for simpler seed data
  public MenuItem(Long id, String name, String description, double price, String category, Long categoryId,
      boolean available, String imageUrl, double gstPercent, int prepTimeMinutes, boolean vegetarian,
      int displayOrder, boolean trackStock, double stockLevel) {
    this(id, name, description, price, category, categoryId, available, imageUrl, gstPercent, prepTimeMinutes,
        vegetarian, displayOrder, trackStock, stockLevel, null);
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

  public void setIngredients(java.util.List<MenuItemIngredient> ingredients) {
    this.ingredients.clear();
    if (ingredients != null) {
      for (MenuItemIngredient ingredient : ingredients) {
        addIngredient(ingredient);
      }
    }
  }

  public void addIngredient(MenuItemIngredient ingredient) {
    ingredients.add(ingredient);
    ingredient.setMenuItem(this);
  }

  public double getDisplayPrice() {
    if (variations != null && !variations.isEmpty()) {
      return variations.get(0).getPrice();
    }
    return price;
  }
}
