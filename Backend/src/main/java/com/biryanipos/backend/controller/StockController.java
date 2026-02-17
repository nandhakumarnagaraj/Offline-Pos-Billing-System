package com.biryanipos.backend.controller;

import com.biryanipos.backend.dto.StockTransactionRequest;
import com.biryanipos.backend.model.StockItem;
import com.biryanipos.backend.model.StockTransaction;
import com.biryanipos.backend.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

  private final StockService stockService;

  // ===== Stock Items =====

  @GetMapping("/items")
  public ResponseEntity<List<StockItem>> getAllStockItems() {
    return ResponseEntity.ok(stockService.getAllStockItems());
  }

  @GetMapping("/items/low-stock")
  public ResponseEntity<List<StockItem>> getLowStockItems() {
    return ResponseEntity.ok(stockService.getLowStockItems());
  }

  @PostMapping("/items")
  public ResponseEntity<StockItem> createStockItem(@RequestBody StockItem item) {
    return ResponseEntity.ok(stockService.createStockItem(item));
  }

  @PutMapping("/items/{id}")
  public ResponseEntity<StockItem> updateStockItem(@PathVariable Long id, @RequestBody StockItem item) {
    return ResponseEntity.ok(stockService.updateStockItem(id, item));
  }

  @DeleteMapping("/items/{id}")
  public ResponseEntity<Void> deleteStockItem(@PathVariable Long id) {
    stockService.deleteStockItem(id);
    return ResponseEntity.ok().build();
  }

  // ===== Stock Transactions =====

  @PostMapping("/transactions")
  public ResponseEntity<StockTransaction> recordTransaction(@RequestBody StockTransactionRequest request) {
    return ResponseEntity.ok(stockService.recordTransaction(request));
  }

  @GetMapping("/transactions/item/{itemId}")
  public ResponseEntity<List<StockTransaction>> getTransactionsByItem(@PathVariable Long itemId) {
    return ResponseEntity.ok(stockService.getTransactionsByItem(itemId));
  }

  @GetMapping("/transactions/waste")
  public ResponseEntity<List<StockTransaction>> getWasteTransactions() {
    return ResponseEntity.ok(stockService.getWasteTransactions());
  }

  @GetMapping("/transactions/expiring")
  public ResponseEntity<List<StockTransaction>> getExpiringItems(@RequestParam(defaultValue = "7") int days) {
    return ResponseEntity.ok(stockService.getExpiringItems(days));
  }
}
