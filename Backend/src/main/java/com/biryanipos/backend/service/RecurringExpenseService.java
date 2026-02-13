package com.biryanipos.backend.service;

import com.biryanipos.backend.model.Expense;
import com.biryanipos.backend.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecurringExpenseService {

  private final ExpenseRepository expenseRepository;

  // Runs every day at 1 AM
  @Scheduled(cron = "0 0 1 * * ?")
  public void processRecurringExpenses() {
    log.info("Processing recurring expenses...");
    List<Expense> recurringExpenses = expenseRepository.findByIsRecurringTrue();
    LocalDate today = LocalDate.now();

    for (Expense parent : recurringExpenses) {
      // Check if we need to create a new expense based on the last one's date
      // For simplicity, if it's MONTHLY and today is the same day of the month as the
      // original expense
      if ("MONTHLY".equalsIgnoreCase(parent.getRecurringInterval())) {
        if (today.getDayOfMonth() == parent.getExpenseDate().getDayOfMonth()) {
          createDuplicate(parent, today);
        }
      } else if ("WEEKLY".equalsIgnoreCase(parent.getRecurringInterval())) {
        if (today.getDayOfWeek() == parent.getExpenseDate().getDayOfWeek()) {
          createDuplicate(parent, today);
        }
      }
    }
  }

  private void createDuplicate(Expense parent, LocalDate today) {
    // Check if already created for today to avoid duplicates
    List<Expense> existing = expenseRepository.findByExpenseDate(today);
    boolean alreadyExists = existing.stream()
        .anyMatch(e -> e.getDescription().equals(parent.getDescription()) && e.getAmount() == parent.getAmount());

    if (!alreadyExists) {
      Expense child = new Expense();
      child.setCategory(parent.getCategory());
      child.setDescription(parent.getDescription() + " (Recurring)");
      child.setAmount(parent.getAmount());
      child.setSupplierName(parent.getSupplierName());
      child.setSupplier(parent.getSupplier());
      child.setPaymentMethod(parent.getPaymentMethod());
      child.setExpenseDate(today);
      child.setGstAmount(parent.getGstAmount());
      child.setRecurring(false); // The duplicate itself is not recurring, only the parent template is
      expenseRepository.save(child);
      log.info("Created recurring expense: {}", child.getDescription());
    }
  }
}
