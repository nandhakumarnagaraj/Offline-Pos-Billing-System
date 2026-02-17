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
@Table(name = "order_items")
public class OrderItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "menu_item_id", nullable = false)
  private MenuItem menuItem;

  @ManyToOne
  @JoinColumn(name = "menu_item_variation_id")
  private MenuItemVariation menuItemVariation;

  private int quantity;

  private double price; // Snapshot price

  @Column(nullable = false, columnDefinition = "varchar(255) default 'NEW'")
  @Enumerated(EnumType.STRING)
  private OrderStatus status = OrderStatus.NEW;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "order_id")
  @JsonIgnore
  private Order order;
}
