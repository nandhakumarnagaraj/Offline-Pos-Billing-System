package com.biryanipos.backend.controller;

import com.biryanipos.backend.dto.ExpenseRequest;
import com.biryanipos.backend.model.Expense;
import com.biryanipos.backend.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

  private final ExpenseService expenseService;

  @PostMapping
  public ResponseEntity<Expense> createExpense(@RequestBody ExpenseRequest request) {
    return ResponseEntity.ok(expenseService.createExpense(request));
  }

  @PutMapping("/{id}")
  public ResponseEntity<Expense> updateExpense(@PathVariable Long id, @RequestBody ExpenseRequest request) {
    return ResponseEntity.ok(expenseService.updateExpense(id, request));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
    expenseService.deleteExpense(id);
    return ResponseEntity.ok().build();
  }

  @GetMapping
  public ResponseEntity<List<Expense>> getAllExpenses() {
    return ResponseEntity.ok(expenseService.getAllExpenses());
  }

  @GetMapping("/today")
  public ResponseEntity<List<Expense>> getTodayExpenses() {
    return ResponseEntity.ok(expenseService.getExpensesByDate(LocalDate.now()));
  }

  @GetMapping("/by-date")
  public ResponseEntity<List<Expense>> getExpensesByDateRange(
      @RequestParam String start,
      @RequestParam String end) {
    return ResponseEntity.ok(expenseService.getExpensesByDateRange(
        LocalDate.parse(start), LocalDate.parse(end)));
  }

  @GetMapping("/category/{category}")
  public ResponseEntity<List<Expense>> getByCategory(@PathVariable String category) {
    return ResponseEntity.ok(expenseService.getExpensesByCategory(category));
  }

  @GetMapping("/total")
  public ResponseEntity<Double> getTotalExpenses(
      @RequestParam String start,
      @RequestParam String end) {
    return ResponseEntity.ok(expenseService.getTotalExpenses(
        LocalDate.parse(start), LocalDate.parse(end)));
  }

  @GetMapping("/supplier/{supplierId}")
  public ResponseEntity<List<Expense>> getBySupplier(@PathVariable Long supplierId) {
    return ResponseEntity.ok(expenseService.getExpensesBySupplier(supplierId));
  }
}
