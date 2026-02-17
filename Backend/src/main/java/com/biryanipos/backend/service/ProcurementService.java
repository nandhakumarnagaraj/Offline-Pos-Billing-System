package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.StockTransactionRequest;
import com.biryanipos.backend.model.*;
import com.biryanipos.backend.repository.PurchaseOrderRepository;
import com.biryanipos.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProcurementService {
  private final SupplierRepository supplierRepository;
  private final PurchaseOrderRepository purchaseOrderRepository;
  private final StockService stockService;

  // ===== Supplier Management =====

  public List<Supplier> getAllSuppliers() {
    return supplierRepository.findAll();
  }

  public Supplier createSupplier(Supplier supplier) {
    if (supplier == null) {
      throw new RuntimeException("Supplier is required");
    }
    return supplierRepository.save(supplier);
  }

  public Supplier updateSupplier(Long id, Supplier updated) {
    if (id == null || updated == null) {
      throw new RuntimeException("Supplier ID and update data are required");
    }
    Supplier existing = supplierRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Supplier not found"));
    existing.setName(updated.getName());
    existing.setContactPerson(updated.getContactPerson());
    existing.setPhone(updated.getPhone());
    existing.setEmail(updated.getEmail());
    existing.setAddress(updated.getAddress());
    existing.setActive(updated.isActive());
    return supplierRepository.save(existing);
  }

  // ===== Purchase Order Management =====

  public List<PurchaseOrder> getAllPurchaseOrders() {
    return purchaseOrderRepository.findAll();
  }

  @Transactional
  public PurchaseOrder createPurchaseOrder(PurchaseOrder po) {
    po.calculateTotal();
    return purchaseOrderRepository.save(po);
  }

  @Transactional
  public PurchaseOrder updatePurchaseOrderStatus(Long poId, PurchaseOrderStatus status) {
    if (poId == null || status == null) {
      throw new RuntimeException("Purchase Order ID and status are required");
    }
    PurchaseOrder po = purchaseOrderRepository.findById(poId)
        .orElseThrow(() -> new RuntimeException("Purchase Order not found: " + poId));

    PurchaseOrderStatus oldStatus = po.getStatus();
    if (oldStatus == status)
      return po;

    po.setStatus(status);

    if (status == PurchaseOrderStatus.DELIVERED) {
      po.setDeliveryDate(LocalDateTime.now());
      // Record stock transactions for each item
      for (PurchaseOrderItem item : po.getItems()) {
        StockTransactionRequest request = new StockTransactionRequest();
        request.setStockItemId(item.getStockItem().getId());
        request.setTransactionType(StockTransactionType.PURCHASE);
        request.setQuantity(item.getQuantity());
        request.setReason("Purchase Order Delivered: #" + po.getId());
        stockService.recordTransaction(request);
      }
    }

    return purchaseOrderRepository.save(po);
  }
}
