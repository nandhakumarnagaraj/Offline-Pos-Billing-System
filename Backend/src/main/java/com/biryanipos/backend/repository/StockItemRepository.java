package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.StockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockItemRepository extends JpaRepository<StockItem, Long> {
  Optional<StockItem> findByName(String name);

  List<StockItem> findByActiveTrue();

  @Query("SELECT s FROM StockItem s WHERE s.currentStock <= s.reorderLevel AND s.active = true")
  List<StockItem> findLowStockItems();

  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM StockItem s WHERE s.id = :id")
  Optional<StockItem> findByIdWithLock(Long id);
}
