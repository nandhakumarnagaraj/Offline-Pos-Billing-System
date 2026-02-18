package com.biryanipos.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DashboardData {
  private double todayRevenue;
  private int todayOrders;
  private int activeOrders;
  private double todayExpenses;
  private double todayTaxableRevenue;
  private double todayExemptRevenue;
  private List<TopSellingItem> topSellingItems;
  private Map<String, Double> paymentModeBreakdown;
  private List<RecentOrder> recentOrders;
  private int lowStockCount;
  private int expiringItemsCount;
  private double totalWastageValue;
  private double netProfit;

  @Data
  @AllArgsConstructor
  @NoArgsConstructor
  public static class TopSellingItem {
    private String name;
    private int quantity;
    private double revenue;
  }

  @Data
  @AllArgsConstructor
  @NoArgsConstructor
  public static class RecentOrder {
    private Long id;
    private String tableNumber;
    private String customerName;
    private double totalAmount;
    private String status;
    private String orderType;
  }
}
