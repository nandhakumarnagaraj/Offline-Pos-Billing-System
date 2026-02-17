package com.biryanipos.backend.controller;

import com.biryanipos.backend.model.PurchaseOrder;
import com.biryanipos.backend.model.PurchaseOrderStatus;
import com.biryanipos.backend.model.Supplier;
import com.biryanipos.backend.service.ProcurementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/procurement")
@RequiredArgsConstructor
public class ProcurementController {
  private final ProcurementService procurementService;

  // ===== Suppliers =====

  @GetMapping("/suppliers")
  public ResponseEntity<List<Supplier>> getAllSuppliers() {
    return ResponseEntity.ok(procurementService.getAllSuppliers());
  }

  @PostMapping("/suppliers")
  public ResponseEntity<Supplier> createSupplier(@RequestBody Supplier supplier) {
    return ResponseEntity.ok(procurementService.createSupplier(supplier));
  }

  @PutMapping("/suppliers/{id}")
  public ResponseEntity<Supplier> updateSupplier(@PathVariable Long id, @RequestBody Supplier supplier) {
    return ResponseEntity.ok(procurementService.updateSupplier(id, supplier));
  }

  // ===== Purchase Orders =====

  @GetMapping("/pos")
  public ResponseEntity<List<PurchaseOrder>> getAllPurchaseOrders() {
    return ResponseEntity.ok(procurementService.getAllPurchaseOrders());
  }

  @PostMapping("/pos")
  public ResponseEntity<PurchaseOrder> createPurchaseOrder(@RequestBody PurchaseOrder po) {
    return ResponseEntity.ok(procurementService.createPurchaseOrder(po));
  }

  @PatchMapping("/pos/{id}/status")
  public ResponseEntity<PurchaseOrder> updateStatus(@PathVariable Long id, @RequestParam PurchaseOrderStatus status) {
    return ResponseEntity.ok(procurementService.updatePurchaseOrderStatus(id, status));
  }
}
