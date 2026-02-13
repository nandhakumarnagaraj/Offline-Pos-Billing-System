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
@Table(name = "purchase_order_items")
public class PurchaseOrderItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "purchase_order_id", nullable = false)
  @JsonIgnore
  private PurchaseOrder purchaseOrder;

  @ManyToOne
  @JoinColumn(name = "stock_item_id", nullable = false)
  private StockItem stockItem;

  @Column(nullable = false)
  private double quantity;

  @Column(nullable = false)
  private double unitCost;

  public double getLineTotal() {
    return quantity * unitCost;
  }
}
