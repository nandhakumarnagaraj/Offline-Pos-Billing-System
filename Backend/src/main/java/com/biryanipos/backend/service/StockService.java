package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.StockTransactionRequest;
import com.biryanipos.backend.model.StockItem;
import com.biryanipos.backend.model.StockTransaction;
import com.biryanipos.backend.model.StockTransactionType;
import com.biryanipos.backend.repository.StockItemRepository;
import com.biryanipos.backend.repository.StockTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StockService {
  private final StockItemRepository stockItemRepository;
  private final StockTransactionRepository stockTransactionRepository;
  private final SimpMessagingTemplate messagingTemplate;

  // ===== Stock Item CRUD =====

  public StockItem createStockItem(StockItem item) {
    return stockItemRepository.save(item);
  }

  public StockItem updateStockItem(Long id, StockItem updated) {
    StockItem existing = stockItemRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Stock item not found: " + id));
    existing.setName(updated.getName());
    existing.setUnit(updated.getUnit());
    existing.setReorderLevel(updated.getReorderLevel());
    existing.setCostPerUnit(updated.getCostPerUnit());
    existing.setSupplier(updated.getSupplier());
    existing.setActive(updated.isActive());
    return stockItemRepository.save(existing);
  }

  public List<StockItem> getAllStockItems() {
    return stockItemRepository.findByActiveTrue();
  }

  public List<StockItem> getLowStockItems() {
    return stockItemRepository.findLowStockItems();
  }

  public void deleteStockItem(Long id) {
    stockItemRepository.deleteById(id);
  }

  // ===== Stock Transactions =====

  @Transactional
  public StockTransaction recordTransaction(StockTransactionRequest request) {
    StockItem item = stockItemRepository.findByIdWithLock(request.getStockItemId())
        .orElseThrow(() -> new RuntimeException("Stock item not found: " + request.getStockItemId()));

    StockTransaction transaction = new StockTransaction();
    transaction.setStockItem(item);
    transaction.setTransactionType(request.getTransactionType());
    transaction.setQuantity(request.getQuantity());
    transaction.setUnitCostSnapshot(item.getCostPerUnit());
    transaction.setReason(request.getReason());
    transaction.setOrderId(request.getOrderId());
    transaction.setExpiryDate(request.getExpiryDate());
    transaction.setWasteCategory(request.getWasteCategory());

    // Update stock levels based on transaction type
    switch (request.getTransactionType()) {
      case PURCHASE:
      case RETURN_FROM_ORDER:
        item.setCurrentStock(item.getCurrentStock() + request.getQuantity());
        break;
      case ISSUE_TO_KITCHEN:
      case ORDER_DEDUCT:
      case WASTE:
        if (item.getCurrentStock() < request.getQuantity()) {
          throw new RuntimeException("Insufficient stock for " + item.getName()
              + ". Available: " + item.getCurrentStock() + ", Requested: " + request.getQuantity());
        }
        item.setCurrentStock(item.getCurrentStock() - request.getQuantity());
        break;
      case ADJUSTMENT:
        item.setCurrentStock(request.getQuantity()); // Direct set
        item.setLastAuditDate(java.time.LocalDateTime.now());
        break;
    }

    stockItemRepository.save(item);
    StockTransaction saved = stockTransactionRepository.save(transaction);

    // Notify if low stock
    if (item.isLowStock()) {
      messagingTemplate.convertAndSend("/topic/stock/alerts",
          "RUNNING OUT OF STOCK: " + item.getName() + " (" + item.getCurrentStock() + " " + item.getUnit()
              + " remaining)");
    }

    return saved;
  }

  public List<StockTransaction> getExpiringItems(int days) {
    return stockTransactionRepository.findExpiringByDate(java.time.LocalDate.now().plusDays(days));
  }

  public List<StockTransaction> getTransactionsByItem(Long stockItemId) {
    return stockTransactionRepository.findByStockItemId(stockItemId);
  }

  public List<StockTransaction> getWasteTransactions() {
    return stockTransactionRepository.findByTransactionType(StockTransactionType.WASTE);
  }
}
