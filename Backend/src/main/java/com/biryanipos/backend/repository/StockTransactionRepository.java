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

    @org.springframework.data.jpa.repository.Query("SELECT st FROM StockTransaction st WHERE st.expiryDate IS NOT NULL AND st.expiryDate <= :date")
    List<StockTransaction> findExpiringByDate(
            @org.springframework.data.repository.query.Param("date") java.time.LocalDate date);

    List<StockTransaction> findByTransactionDateAfter(LocalDateTime date);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(st.quantity * st.unitCostSnapshot), 0) FROM StockTransaction st WHERE st.transactionType = 'WASTE' AND st.transactionDate BETWEEN :start AND :end")
    Double sumWastageValueBetween(@org.springframework.data.repository.query.Param("start") LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") LocalDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(st.quantity * st.unitCostSnapshot), 0) FROM StockTransaction st WHERE st.transactionType = 'ORDER_DEDUCT' AND st.transactionDate BETWEEN :start AND :end")
    Double sumCogsValueBetween(@org.springframework.data.repository.query.Param("start") LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") LocalDateTime end);
}
