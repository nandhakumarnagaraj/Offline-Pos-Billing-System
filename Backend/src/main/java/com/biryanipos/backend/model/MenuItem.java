package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
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

  @Column(nullable = false)
  private boolean available = true;

  private String imageUrl;

  // GST percentage for this item (default 5% for restaurant food)
  @Column(nullable = false)
  private double gstPercent = 5.0;

  // Preparation time in minutes (for KDS)
  private int prepTimeMinutes = 15;

  // Is this a vegetarian item?
  private boolean vegetarian = false;

  // Display order within category
  private int displayOrder = 0;
}
