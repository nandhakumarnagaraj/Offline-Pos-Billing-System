package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.StockTransaction;
import com.biryanipos.backend.model.StockTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {
  List<StockTransaction> findByStockItemId(Long stockItemId);

  List<StockTransaction> findByTransactionType(StockTransactionType type);

  List<StockTransaction> findByTransactionDateBetween(LocalDateTime start, LocalDateTime end);
}
