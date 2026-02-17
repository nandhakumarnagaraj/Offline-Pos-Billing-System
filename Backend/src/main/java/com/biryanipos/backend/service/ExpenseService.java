package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.ExpenseRequest;
import com.biryanipos.backend.model.Expense;
import com.biryanipos.backend.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseService {
  private final ExpenseRepository expenseRepository;
  private final com.biryanipos.backend.repository.SupplierRepository supplierRepository;

  public Expense createExpense(ExpenseRequest request) {
    Expense expense = new Expense();
    expense.setCategory(request.getCategory());
    expense.setDescription(request.getDescription());
    expense.setAmount(request.getAmount());
    expense.setSupplierName(request.getSupplierName());
    expense.setPaymentMethod(request.getPaymentMethod());
    expense.setExpenseDate(request.getExpenseDate() != null ? request.getExpenseDate() : LocalDate.now());
    expense.setNotes(request.getNotes());

    expense.setGstAmount(request.getGstAmount());
    expense.setRecurring(request.isRecurring());
    expense.setRecurringInterval(request.getRecurringInterval());
    expense.setReceiptImageUrl(request.getReceiptImageUrl());

    if (request.getSupplierId() != null) {
      supplierRepository.findById(request.getSupplierId()).ifPresent(expense::setSupplier);
    }

    return expenseRepository.save(expense);
  }

  public List<Expense> getExpensesBySupplier(Long supplierId) {
    return expenseRepository.findBySupplierId(supplierId);
  }

  public Expense updateExpense(Long id, ExpenseRequest request) {
    Expense existing = expenseRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Expense not found: " + id));
    existing.setCategory(request.getCategory());
    existing.setDescription(request.getDescription());
    existing.setAmount(request.getAmount());
    existing.setSupplierName(request.getSupplierName());
    existing.setPaymentMethod(request.getPaymentMethod());
    existing.setExpenseDate(request.getExpenseDate());
    existing.setNotes(request.getNotes());
    return expenseRepository.save(existing);
  }

  public void deleteExpense(Long id) {
    expenseRepository.deleteById(id);
  }

  public List<Expense> getAllExpenses() {
    return expenseRepository.findAll();
  }

  public List<Expense> getExpensesByDate(LocalDate date) {
    return expenseRepository.findByExpenseDate(date);
  }

  public List<Expense> getExpensesByDateRange(LocalDate start, LocalDate end) {
    return expenseRepository.findByExpenseDateBetween(start, end);
  }

  public List<Expense> getExpensesByCategory(String category) {
    return expenseRepository.findByCategory(category);
  }

  public Double getTotalExpenses(LocalDate start, LocalDate end) {
    Double total = expenseRepository.sumAmountBetween(start, end);
    return total != null ? total : 0.0;
  }
}
