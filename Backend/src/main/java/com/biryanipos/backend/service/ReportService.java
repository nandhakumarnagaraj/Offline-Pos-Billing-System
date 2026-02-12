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

  public DashboardData getDashboardData() {
    LocalDateTime todayStart = LocalDate.now().atStartOfDay();
    LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);

    List<Order> todayOrders = orderRepository.findByCreatedAtBetween(todayStart, todayEnd);
    List<Order> activeOrders = orderRepository.findActiveOrders();
    List<Payment> todayPayments = paymentRepository.findCompletedPaymentsBetween(todayStart, todayEnd);

    double todayRevenue = todayPayments.stream()
        .mapToDouble(Payment::getTotalAmount)
        .sum();

    Double todayExpenses = expenseRepository.sumAmountBetween(LocalDate.now(), LocalDate.now());

    // Top selling items
    Map<String, int[]> itemSales = new HashMap<>(); // name -> [quantity, revenue*100]
    for (Order order : todayOrders) {
      if (order.getStatus() == OrderStatus.PAID) {
        for (OrderItem item : order.getItems()) {
          String name = item.getMenuItem().getName();
          int[] data = itemSales.getOrDefault(name, new int[] { 0, 0 });
          data[0] += item.getQuantity();
          data[1] += (int) (item.getPrice() * item.getQuantity() * 100);
          itemSales.put(name, data);
        }
      }
    }

    List<DashboardData.TopSellingItem> topItems = itemSales.entrySet().stream()
        .sorted((a, b) -> b.getValue()[0] - a.getValue()[0])
        .limit(5)
        .map(e -> new DashboardData.TopSellingItem(e.getKey(), e.getValue()[0], e.getValue()[1] / 100.0))
        .collect(Collectors.toList());

    // Payment mode breakdown
    Map<String, Double> paymentBreakdown = todayPayments.stream()
        .collect(Collectors.groupingBy(
            p -> p.getPaymentMode().name(),
            Collectors.summingDouble(Payment::getTotalAmount)));

    // Recent orders
    List<DashboardData.RecentOrder> recentOrders = todayOrders.stream()
        .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
        .limit(10)
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

    DashboardData dashboard = new DashboardData();
    dashboard.setTodayRevenue(todayRevenue);
    dashboard.setTodayOrders(todayOrders.size());
    dashboard.setActiveOrders(activeOrders.size());
    dashboard.setTodayExpenses(todayExpenses != null ? todayExpenses : 0);
    dashboard.setTopSellingItems(topItems);
    dashboard.setPaymentModeBreakdown(paymentBreakdown);
    dashboard.setRecentOrders(recentOrders);
    dashboard.setLowStockCount(lowStockCount);

    return dashboard;
  }

  public Map<String, Object> getSalesReport(LocalDate startDate, LocalDate endDate) {
    LocalDateTime start = startDate.atStartOfDay();
    LocalDateTime end = endDate.atTime(LocalTime.MAX);

    List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);
    List<Payment> payments = paymentRepository.findCompletedPaymentsBetween(start, end);

    long totalOrders = orders.size();
    long paidOrders = orders.stream().filter(o -> o.getStatus() == OrderStatus.PAID).count();
    long cancelledOrders = orders.stream().filter(o -> o.getStatus() == OrderStatus.CANCELLED).count();

    double totalRevenue = payments.stream().mapToDouble(Payment::getTotalAmount).sum();
    double totalCgst = payments.stream().mapToDouble(Payment::getCgst).sum();
    double totalSgst = payments.stream().mapToDouble(Payment::getSgst).sum();
    double totalDiscount = payments.stream().mapToDouble(Payment::getDiscount).sum();

    Double totalExpenses = expenseRepository.sumAmountBetween(startDate, endDate);

    // Order type breakdown
    long dineInOrders = orders.stream().filter(o -> o.getOrderType() == OrderType.DINE_IN).count();
    long takeawayOrders = orders.stream().filter(o -> o.getOrderType() == OrderType.TAKEAWAY).count();

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
    report.put("netProfit", totalRevenue - (totalExpenses != null ? totalExpenses : 0));

    return report;
  }
}
