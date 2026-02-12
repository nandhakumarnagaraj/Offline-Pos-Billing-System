package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.BillResponse;
import com.biryanipos.backend.dto.PaymentRequest;
import com.biryanipos.backend.model.*;
import com.biryanipos.backend.repository.OrderRepository;
import com.biryanipos.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

  private final PaymentRepository paymentRepository;
  private final OrderRepository orderRepository;
  private final SimpMessagingTemplate messagingTemplate;

  @Transactional
  public Payment processPayment(PaymentRequest request) {
    Order order = orderRepository.findById(request.getOrderId())
        .orElseThrow(() -> new RuntimeException("Order not found: " + request.getOrderId()));

    if (order.getPaymentStatus() == PaymentStatus.COMPLETED) {
      throw new RuntimeException("Order already paid");
    }

    double subtotal = order.getSubtotal();
    double discount = request.getDiscount();
    double discountedSubtotal = subtotal - discount;
    double cgst = Math.round(discountedSubtotal * 2.5) / 100.0;
    double sgst = Math.round(discountedSubtotal * 2.5) / 100.0;
    double totalAmount = discountedSubtotal + cgst + sgst;

    Payment payment = new Payment();
    payment.setOrderId(request.getOrderId());
    payment.setPaymentMode(request.getPaymentMode());
    payment.setPaymentStatus(PaymentStatus.COMPLETED);
    payment.setSubtotal(discountedSubtotal);
    payment.setCgst(cgst);
    payment.setSgst(sgst);
    payment.setTotalAmount(totalAmount);
    payment.setDiscount(discount);
    payment.setAmountReceived(request.getAmountReceived());
    payment.setChangeReturned(request.getAmountReceived() > 0 ? request.getAmountReceived() - totalAmount : 0);
    payment.setTransactionRef(request.getTransactionRef());
    payment.setPaidAt(LocalDateTime.now());

    Payment savedPayment = paymentRepository.save(payment);

    // Update order status
    order.setPaymentStatus(PaymentStatus.COMPLETED);
    order.setDiscount(discount);
    order.setTotalAmount(totalAmount);
    order.setCgst(cgst);
    order.setSgst(sgst);
    order.setStatus(OrderStatus.PAID);
    order.setCompletedAt(LocalDateTime.now());
    orderRepository.save(order);

    // Notify all listeners
    messagingTemplate.convertAndSend("/topic/orders/update", order);

    return savedPayment;
  }

  public BillResponse generateBill(Long orderId) {
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

    Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);

    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    BillResponse bill = new BillResponse();
    bill.setOrderId(order.getId());
    bill.setCustomerName(order.getCustomerName());
    bill.setCustomerPhone(order.getCustomerPhone());
    bill.setTableNumber(order.getTableNumber());
    bill.setOrderType(order.getOrderType().name());
    bill.setSubtotal(order.getSubtotal());
    bill.setCgst(order.getCgst());
    bill.setSgst(order.getSgst());
    bill.setDiscount(order.getDiscount());
    bill.setTotalAmount(order.getTotalAmount());
    bill.setCreatedAt(order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : "");

    if (payment != null) {
      bill.setPaymentMode(payment.getPaymentMode().name());
      bill.setPaymentStatus(payment.getPaymentStatus().name());
      bill.setAmountReceived(payment.getAmountReceived());
      bill.setChangeReturned(payment.getChangeReturned());
      bill.setTransactionRef(payment.getTransactionRef());
      bill.setPaidAt(payment.getPaidAt() != null ? payment.getPaidAt().format(formatter) : "");
    } else {
      bill.setPaymentStatus(order.getPaymentStatus().name());
    }

    List<BillResponse.BillItem> billItems = order.getItems().stream()
        .map(item -> new BillResponse.BillItem(
            item.getMenuItem().getName(),
            item.getQuantity(),
            item.getPrice(),
            item.getPrice() * item.getQuantity()))
        .collect(Collectors.toList());

    bill.setItems(billItems);
    return bill;
  }

  public List<Payment> getPaymentsByDateRange(LocalDateTime start, LocalDateTime end) {
    return paymentRepository.findCompletedPaymentsBetween(start, end);
  }

  public Payment getPaymentByOrderId(Long orderId) {
    return paymentRepository.findByOrderId(orderId).orElse(null);
  }
}
