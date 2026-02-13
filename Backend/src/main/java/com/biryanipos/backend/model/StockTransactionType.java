package com.biryanipos.backend.model;

public enum StockTransactionType {
  PURCHASE, // Stock bought and added to storeroom
  ISSUE_TO_KITCHEN, // Moved from storeroom to kitchen
  ORDER_DEDUCT, // Auto-deducted when order is placed
  WASTE, // Waste / expired / damaged
  ADJUSTMENT, // Manual correction
  RETURN_FROM_ORDER // Restored stock if order cancelled
}
