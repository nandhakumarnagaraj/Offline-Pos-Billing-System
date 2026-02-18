package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.DashboardData;
import com.biryanipos.backend.model.*;
import com.biryanipos.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

  private final OrderRepository orderRepository;
  private final PaymentRepository paymentRepository;
  private final ExpenseRepository expenseRepository;
  private final StockItemRepository stockItemRepository;
  private final StockTransactionRepository stockTransactionRepository;
  private final OrderItemRepository orderItemRepository;

  public DashboardData getDashboardData() {
    LocalDateTime todayStart = LocalDate.now().atStartOfDay();
    LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);

    List<Order> todayOrders = orderRepository.findByCreatedAtBetween(todayStart, todayEnd);
    // Removed activeOrders and todayPayments fetch as they are now aggregated

    Double todayRevenue = paymentRepository.sumTotalAmountBetween(todayStart, todayEnd);
    Double todayTaxable = paymentRepository.sumTaxableRevenueBetween(todayStart, todayEnd);
    Double todayExempt = paymentRepository.sumExemptRevenueBetween(todayStart, todayEnd);

    Double todayExpenses = expenseRepository.sumAmountBetween(LocalDate.now(), LocalDate.now());

    List<DashboardData.TopSellingItem> topItems = orderItemRepository.findTopSellingItems(todayStart, todayEnd).stream()
        .limit(5)
        .map(row -> new DashboardData.TopSellingItem((String) row[0], ((Number) row[1]).intValue(),
            ((Number) row[2]).doubleValue()))
        .collect(Collectors.toList());

    // Payment mode breakdown
    List<Object[]> modeStats = paymentRepository.findPaymentModeBreakdownBetween(todayStart, todayEnd);
    Map<String, Double> paymentBreakdown = new HashMap<>();
    for (Object[] row : modeStats) {
      paymentBreakdown.put(row[0].toString(), (Double) row[1]);
    }

    // Recent orders
    List<DashboardData.RecentOrder> recentOrders = todayOrders.stream()
        .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
        .limit(5)
        .map(o -> new DashboardData.RecentOrder(
            o.getId(),
            o.getTableNumber(),
            o.getCustomerName(),
            o.getTotalAmount(),
            o.getStatus().name(),
            o.getOrderType().name()))
        .collect(Collectors.toList());

    // Low stock count
    int lowStockCount = stockItemRepository.findLowStockItems().size();

    // Expiring items count (next 7 days)
    int expiringCount = stockTransactionRepository.findExpiringByDate(LocalDate.now().plusDays(7)).size();

    // Total wastage value for today
    // Total wastage value for today
    Double wastageVal = stockTransactionRepository.sumWastageValueBetween(todayStart, todayEnd);
    double totalWastage = wastageVal != null ? wastageVal : 0.0;

    DashboardData dashboard = new DashboardData();
    dashboard.setTodayRevenue(todayRevenue != null ? todayRevenue : 0.0);
    dashboard.setTodayOrders((int) orderRepository.countByCreatedAtBetween(todayStart, todayEnd));
    dashboard.setActiveOrders((int) orderRepository.countActiveOrders());
    dashboard.setTodayExpenses(todayExpenses != null ? todayExpenses : 0);
    dashboard.setTopSellingItems(topItems);
    dashboard.setPaymentModeBreakdown(paymentBreakdown);
    dashboard.setRecentOrders(recentOrders);
    dashboard.setLowStockCount(lowStockCount);
    dashboard.setExpiringItemsCount(expiringCount);
    dashboard.setTotalWastageValue(totalWastage);
    dashboard.setTodayTaxableRevenue(todayTaxable != null ? todayTaxable : 0.0);
    dashboard.setTodayExemptRevenue(todayExempt != null ? todayExempt : 0.0);

    Double todayCgst = paymentRepository.sumCgstBetween(todayStart, todayEnd);
    Double todaySgst = paymentRepository.sumSgstBetween(todayStart, todayEnd);
    double todayOutputGst = (todayCgst != null ? todayCgst : 0) + (todaySgst != null ? todaySgst : 0);
    Double todayInputGst = expenseRepository.sumGstAmountBetween(LocalDate.now(), LocalDate.now());

    double netRev = (todayRevenue != null ? todayRevenue : 0) - todayOutputGst;
    double netExp = (todayExpenses != null ? todayExpenses : 0) - (todayInputGst != null ? todayInputGst : 0);
    dashboard.setNetProfit(netRev - netExp - totalWastage); // Simplified for dashboard

    return dashboard;
  }

  public Map<String, Object> getSalesReport(LocalDate startDate, LocalDate endDate) {
    LocalDateTime start = startDate.atStartOfDay();
    LocalDateTime end = endDate.atTime(LocalTime.MAX);

    List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);
    // Optimization: We now use sum queries for taxes instead of iterating payments
    // list
    Double totalCgst = paymentRepository.sumCgstBetween(start, end);
    Double totalSgst = paymentRepository.sumSgstBetween(start, end);

    // Fetch payments if needed for other specialized breakdowns, but for summary we
    // use sum queries
    // List<Payment> payments =
    // paymentRepository.findCompletedPaymentsBetween(start, end);

    // We still might need totalDiscount sum query, adding it or keeping simplified
    // mapping
    // For now let's assume totalDiscount is calculated via repo if we want full
    // optimization
    // But since CGST/SGST are added, let's keep it clean.

    // To calculate totalDiscount without fetching all payments, we can add
    // sumDiscountBetween too.
    // Given the flow, let's just use the current payment sum query logic.

    // We'll keep totalDiscount as 0 or add the query to PaymentRepository later if
    // needed.
    // For now, let's focus on GST Reconciliation.
    double outputGst = (totalCgst != null ? totalCgst : 0) + (totalSgst != null ? totalSgst : 0);

    Double totalExpenses = expenseRepository.sumAmountBetween(startDate, endDate);
    Double inputGst = expenseRepository.sumGstAmountBetween(startDate, endDate);

    // Order status counts
    long totalOrders = orderRepository.countByCreatedAtBetween(start, end);
    long paidOrders = orderRepository.countByStatusAndCreatedAtBetween(OrderStatus.PAID, start, end);
    long cancelledOrders = orderRepository.countByStatusAndCreatedAtBetween(OrderStatus.CANCELLED, start, end);

    // Revenue Aggregations
    Double totalRevenue = paymentRepository.sumTotalAmountBetween(start, end);

    // Order type breakdown
    long dineInOrders = orderRepository.countByOrderTypeAndCreatedAtBetween(OrderType.DINE_IN, start, end);
    long takeawayOrders = orderRepository.countByOrderTypeAndCreatedAtBetween(OrderType.TAKEAWAY, start, end);

    // Taxable vs Exempt breakdown
    Double taxableRevenue = paymentRepository.sumTaxableRevenueBetween(start, end);
    Double exemptRevenue = paymentRepository.sumExemptRevenueBetween(start, end);

    // Payment breakdown
    List<Object[]> modeStats = paymentRepository.findPaymentModeBreakdownBetween(start, end);
    Map<String, Double> paymentBreakdown = new HashMap<>();
    for (Object[] row : modeStats) {
      paymentBreakdown.put(row[0].toString(), (Double) row[1]);
    }

    Double wastageVal = stockTransactionRepository.sumWastageValueBetween(start, end);
    double wastageValue = wastageVal != null ? wastageVal : 0.0;

    // Employee Performance
    List<Object[]> waiterStats = orderRepository.findWaiterPerformanceBetween(start, end);
    Map<String, Double> waiterPerformance = new HashMap<>();
    for (Object[] row : waiterStats) {
      waiterPerformance.put((String) row[0], (Double) row[1]);
    }

    List<Map<String, Object>> topItems = orderItemRepository.findTopSellingItems(start, end).stream()
        .limit(10)
        .map(row -> {
          Map<String, Object> m = new HashMap<>();
          m.put("name", row[0]);
          m.put("quantity", row[1]);
          m.put("revenue", ((Number) row[2]).doubleValue());
          return m;
        })
        .collect(Collectors.toList());

    // Cost of Goods Sold (COGS) and Wastage
    Double cogsVal = stockTransactionRepository.sumCogsValueBetween(start, end);
    double cogs = cogsVal != null ? cogsVal : 0.0;

    Map<String, Object> report = new LinkedHashMap<>();
    report.put("period", startDate + " to " + endDate);
    report.put("totalOrders", totalOrders);
    report.put("paidOrders", paidOrders);
    report.put("cancelledOrders", cancelledOrders);
    report.put("dineInOrders", dineInOrders);
    report.put("takeawayOrders", takeawayOrders);
    report.put("totalRevenue", totalRevenue);

    // GST Details for Reconciliation
    report.put("taxableRevenue", taxableRevenue != null ? taxableRevenue : 0);
    report.put("exemptRevenue", exemptRevenue != null ? exemptRevenue : 0);
    report.put("outputCgst", totalCgst != null ? totalCgst : 0);
    report.put("outputSgst", totalSgst != null ? totalSgst : 0);
    report.put("outputGst", outputGst);
    report.put("inputGst", inputGst != null ? inputGst : 0);
    report.put("netGstPayable", outputGst - (inputGst != null ? inputGst : 0));

    report.put("totalGst", outputGst); // Legacy support for UI
    report.put("totalExpenses", totalExpenses != null ? totalExpenses : 0);
    report.put("cogs", cogs);
    report.put("wastageValue", wastageValue);

    double netRevenue = (totalRevenue != null ? totalRevenue : 0) - outputGst;
    double netExpenses = (totalExpenses != null ? totalExpenses : 0) - (inputGst != null ? inputGst : 0);

    report.put("netProfit", netRevenue - netExpenses - cogs - wastageValue);
    report.put("topItems", topItems);
    report.put("paymentBreakdown", paymentBreakdown);
    report.put("waiterPerformance", waiterPerformance);

    return report;
  }

  public String generateGstReportCsv(LocalDate startDate, LocalDate endDate) {
    LocalDateTime start = startDate.atStartOfDay();
    LocalDateTime end = endDate.atTime(LocalTime.MAX);
    List<Payment> payments = paymentRepository.findCompletedPaymentsBetween(start, end);

    StringBuilder csv = new StringBuilder();
    csv.append("Date,Invoice No,Customer,Total Amount,Taxable Value,CGST,SGST,Total GST,Payment Mode,GST Status\n");

    for (Payment p : payments) {
      Long orderId = p.getOrderId();
      if (orderId == null)
        continue;
      Order o = orderRepository.findById(orderId).orElse(null);
      if (o == null)
        continue;

      double taxableValue = p.getTotalAmount() - p.getCgst() - p.getSgst();
      csv.append(o.getCreatedAt().toLocalDate()).append(",")
          .append("INV-").append(o.getId()).append(",")
          .append(o.getCustomerName() != null ? o.getCustomerName() : "Cash").append(",")
          .append(p.getTotalAmount()).append(",")
          .append(taxableValue).append(",")
          .append(p.getCgst()).append(",")
          .append(p.getSgst()).append(",")
          .append(p.getCgst() + p.getSgst()).append(",")
          .append(p.getPaymentMode()).append(",")
          .append(p.isGstEnabled() ? "GST" : "Non-GST").append("\n");
    }
    return csv.toString();
  }
}
