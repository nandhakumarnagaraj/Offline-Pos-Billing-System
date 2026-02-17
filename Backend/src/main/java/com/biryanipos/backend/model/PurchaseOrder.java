package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "purchase_orders")
public class PurchaseOrder {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "supplier_id", nullable = false)
  private Supplier supplier;

  private LocalDateTime orderDate;
  private LocalDateTime deliveryDate;

  @Enumerated(EnumType.STRING)
  private PurchaseOrderStatus status; // PENDING, DELIVERED, CANCELLED

  private double totalAmount;

  @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<PurchaseOrderItem> items = new ArrayList<>();

  @PrePersist
  protected void onCreate() {
    orderDate = LocalDateTime.now();
    if (status == null)
      status = PurchaseOrderStatus.PENDING;
  }

  public void addItem(PurchaseOrderItem item) {
    items.add(item);
    item.setPurchaseOrder(this);
    calculateTotal();
  }

  public void calculateTotal() {
    this.totalAmount = items.stream()
        .mapToDouble(PurchaseOrderItem::getLineTotal)
        .sum();
  }
}
