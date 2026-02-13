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

    Double todayExpenses = expenseRepository.sumAmountBetween(LocalDate.now(), LocalDate.now());

    List<DashboardData.TopSellingItem> topItems = orderItemRepository.findTopSellingItems(todayStart, todayEnd).stream()
        .limit(5)
        .map(row -> new DashboardData.TopSellingItem((String) row[0], ((Number) row[1]).intValue(),
            ((Number) row[2]).doubleValue() / 100.0))
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
    dashboard.setTodayRevenue(todayRevenue);
    dashboard.setTodayOrders((int) orderRepository.countByCreatedAtBetween(todayStart, todayEnd));
    dashboard.setActiveOrders((int) orderRepository.countActiveOrders());
    dashboard.setTodayExpenses(todayExpenses != null ? todayExpenses : 0);
    dashboard.setTopSellingItems(topItems);
    dashboard.setPaymentModeBreakdown(paymentBreakdown);
    dashboard.setRecentOrders(recentOrders);
    dashboard.setLowStockCount(lowStockCount);
    dashboard.setExpiringItemsCount(expiringCount);
    dashboard.setTotalWastageValue(totalWastage);

    return dashboard;
  }

  public Map<String, Object> getSalesReport(LocalDate startDate, LocalDate endDate) {
    LocalDateTime start = startDate.atStartOfDay();
    LocalDateTime end = endDate.atTime(LocalTime.MAX);

    List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);
    List<Payment> payments = paymentRepository.findCompletedPaymentsBetween(start, end);
    // Keep these lists for now as we still need them for Tax Calculations involved
    // in the report (CGST, SGST)
    // unless we add specific sum queries for them.
    // To make this fully optimal, we should calculate Tax sums in DB too.

    /*
     * Optimization: We can remove 'orders' list fetching if we don't need it for
     * anything else.
     * We removed most usages of 'orders' list above.
     * Let's check:
     * - totalOrders (replaced by count)
     * - paidOrders (replaced by count)
     * - cancelledOrders (replaced by count)
     * - dineInOrders (replaced by count)
     * - takeawayOrders (replaced by count)
     * - waiterPerformance (replaced by query)
     * - topItems (replaced by OrderItem query)
     * 
     * So 'orders' list is NOT needed anymore!
     * 
     * 'payments' list is used for:
     * - totalRevenue (replaced by sum query)
     * - totalCgst (STILL NEEDED)
     * - totalSgst (STILL NEEDED)
     * - totalDiscount (STILL NEEDED)
     * - paymentBreakdown (replaced by query)
     * 
     * So we only need 'payments' list for Tax breakdown.
     */

    // Removed manual summation of revenue using streams as it's now handled by DB
    // query below
    // double totalRevenue =
    // payments.stream().mapToDouble(Payment::getTotalAmount).sum();
    double totalCgst = payments.stream().mapToDouble(Payment::getCgst).sum();
    double totalSgst = payments.stream().mapToDouble(Payment::getSgst).sum();
    double totalDiscount = payments.stream().mapToDouble(Payment::getDiscount).sum();

    Double totalExpenses = expenseRepository.sumAmountBetween(startDate, endDate);

    // Order status counts
    long totalOrders = orderRepository.countByCreatedAtBetween(start, end);
    long paidOrders = orderRepository.countByStatusAndCreatedAtBetween(OrderStatus.PAID, start, end);
    long cancelledOrders = orderRepository.countByStatusAndCreatedAtBetween(OrderStatus.CANCELLED, start, end);

    // Revenue Aggregations
    Double totalRevenue = paymentRepository.sumTotalAmountBetween(start, end);

    // TODO: Add specific queries for Tax and Discount sums if needed,
    // for now we can iterate only payments (smaller dataset than orders) or add
    // more Sum queries.
    // Given the constraints, let's keep fetching payments for detailed tax
    // breakdown
    // OR add sum queries for CGST/SGST/Discount.
    // For now, let's stick to fetching payments for tax details as it's complex to
    // aggregate multiple columns in one query cleanly without a DTO or array.
    // Actually, finding payments is okay if we paginate, but for a full report we
    // might need them.
    // However, let's optimize the simple counts first.

    // Order type breakdown
    long dineInOrders = orderRepository.countByOrderTypeAndCreatedAtBetween(OrderType.DINE_IN, start, end);
    long takeawayOrders = orderRepository.countByOrderTypeAndCreatedAtBetween(OrderType.TAKEAWAY, start, end);

    // Top Items - ALREADY OPTIMIZED (Step 168)

    // Payment breakdown
    List<Object[]> modeStats = paymentRepository.findPaymentModeBreakdownBetween(start, end);
    Map<String, Double> paymentBreakdown = new HashMap<>();
    for (Object[] row : modeStats) {
      paymentBreakdown.put(row[0].toString(), (Double) row[1]);
    }

    // COGS and Wastage (using existing sumWastageValueBetween)
    // We need sumCogsValueBetween (Order Deduct)
    // Let's assume we add sumCogsValueBetween later or use loop for now if not
    // added.
    // Actually, let's just use the loop for COGS for now as I didn't add
    // sumCogsValueBetween yet.
    // Wait, I fetch all transactions below. Let's fix that.

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
          m.put("revenue", ((Number) row[2]).doubleValue() / 100.0);
          return m;
        })
        .collect(Collectors.toList());

    // Payment breakdown - Replaced by DB Query above

    // Cost of Goods Sold (COGS) and Wastage
    // COGS - Replaced by DB Query
    Double cogsVal = stockTransactionRepository.sumCogsValueBetween(start, end);
    double cogs = cogsVal != null ? cogsVal : 0.0;

    // Wastage is already calculated via DB query above.

    // Employee Performance - Aggregated from DB means we don't need 'orders' loop
    // Code block replaced by query above.

    Map<String, Object> report = new LinkedHashMap<>();
    report.put("period", startDate + " to " + endDate);
    report.put("totalOrders", totalOrders);
    report.put("paidOrders", paidOrders);
    report.put("cancelledOrders", cancelledOrders);
    report.put("dineInOrders", dineInOrders);
    report.put("takeawayOrders", takeawayOrders);
    report.put("totalRevenue", totalRevenue);
    report.put("totalCgst", totalCgst);
    report.put("totalSgst", totalSgst);
    report.put("totalGst", totalCgst + totalSgst);
    report.put("totalDiscount", totalDiscount);
    report.put("totalExpenses", totalExpenses != null ? totalExpenses : 0);
    report.put("cogs", cogs);
    report.put("wastageValue", wastageValue);
    report.put("netProfit", totalRevenue - (totalExpenses != null ? totalExpenses : 0) - cogs - wastageValue);
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
    csv.append("Date,Invoice No,Customer,Total Amount,Taxable Value,CGST,SGST,Total GST,Payment Mode\n");

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
          .append(p.getPaymentMode()).append("\n");
    }
    return csv.toString();
  }
}
