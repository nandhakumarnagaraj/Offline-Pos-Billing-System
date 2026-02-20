package com.biryanipos.backend.service;

import com.biryanipos.backend.model.Order;
import com.biryanipos.backend.model.OrderItem;
import com.biryanipos.backend.model.Payment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class PrintingService {

  public String generateTextReceipt(Order order, Payment payment) {
    StringBuilder sb = new StringBuilder();
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    sb.append("      BIRYANI POS      \n");
    sb.append("-----------------------\n");
    sb.append("Order: #").append(order.getId()).append("\n");
    sb.append("Date: ").append(order.getCreatedAt().format(formatter)).append("\n");
    if (order.getTableNumber() != null) {
      sb.append("Table: ").append(order.getTableNumber()).append("\n");
    }
    sb.append("Type: ").append(order.getOrderType()).append("\n");
    sb.append("-----------------------\n");

    for (OrderItem item : order.getItems()) {
      String name = item.getMenuItem().getName();
      if (name.length() > 20)
        name = name.substring(0, 17) + "...";
      sb.append(String.format("%-20s %2d\n", name, item.getQuantity()));
      sb.append(String.format("      @%-10.2f %7.2f\n", item.getPrice(), item.getPrice() * item.getQuantity()));
    }

    sb.append("-----------------------\n");
    sb.append(String.format("Subtotal:       %8.2f\n", order.getSubtotal()));
    sb.append(String.format("CGST (2.5%%):    %8.2f\n", order.getCgst()));
    sb.append(String.format("SGST (2.5%%):    %8.2f\n", order.getSgst()));
    if (order.getDiscount() > 0) {
      sb.append(String.format("Discount:      -%8.2f\n", order.getDiscount()));
    }
    sb.append("-----------------------\n");
    sb.append(String.format("TOTAL:          %8.2f\n", order.getTotalAmount()));
    sb.append("-----------------------\n");

    if (payment != null) {
      if (payment.getPaymentMode() == com.biryanipos.backend.model.PaymentMode.MIXED && payment.getDetails() != null) {
        sb.append("Payment Details:\n");
        for (com.biryanipos.backend.model.PaymentDetail detail : payment.getDetails()) {
          sb.append(String.format("  %-12s: %8.2f\n", detail.getPaymentMode(), detail.getAmount()));
        }
      } else {
        sb.append("Payment Mode: ").append(payment.getPaymentMode()).append("\n");
      }

      if (payment.getAmountReceived() > 0) {
        sb.append(String.format("Total Received:  %8.2f\n", payment.getAmountReceived()));
        if (payment.getChangeReturned() > 0) {
          sb.append(String.format("Change:         %8.2f\n", payment.getChangeReturned()));
        }
      }
    }

    sb.append("\n   Thank You! Visit Again   \n\n\n");

    return sb.toString();
  }
}
