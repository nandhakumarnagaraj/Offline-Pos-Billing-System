package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
  List<Expense> findByExpenseDateBetween(LocalDate start, LocalDate end);

  List<Expense> findByExpenseDate(LocalDate date);

  List<Expense> findByCategory(String category);

  @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end")
  Double sumAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

  @Query("SELECT COALESCE(SUM(e.gstAmount), 0) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end")
  Double sumGstAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

  List<Expense> findByIsRecurringTrue();

  List<Expense> findBySupplierId(Long supplierId);
}
