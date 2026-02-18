package com.biryanipos.backend.service;

import com.biryanipos.backend.config.AppProperties;
import com.biryanipos.backend.dto.BillResponse;
import com.biryanipos.backend.dto.PaymentRequest;
import com.biryanipos.backend.model.*;
import com.biryanipos.backend.repository.OrderRepository;
import com.biryanipos.backend.repository.PaymentRepository;
import com.biryanipos.backend.repository.TableRepository;
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
  private final TableRepository tableRepository;
  private final CustomerService customerService;
  private final SimpMessagingTemplate messagingTemplate;
  private final AppProperties appProperties;

  @Transactional
  public Payment processPayment(PaymentRequest request) {
    if (request.getOrderId() == null) {
      throw new RuntimeException("Order ID is required");
    }
    Order order = orderRepository.findById(java.util.Objects.requireNonNull(request.getOrderId()))
        .orElseThrow(() -> new RuntimeException("Order not found: " + request.getOrderId()));

    if (order.getPaymentStatus() == PaymentStatus.COMPLETED) {
      throw new RuntimeException("Order already paid");
    }

    // Support on-the-fly GST toggle
    if (request.getGstEnabled() != null) {
      order.setGstEnabled(request.getGstEnabled());
    }

    double subtotal = order.getSubtotal();
    double discount = request.getDiscount();
    double discountedSubtotal = subtotal - discount;

    double cgst = 0;
    double sgst = 0;

    if (order.isGstEnabled() && appProperties.getTax().isEnabled()) {
      // Proportional GST adjustment: if subtotal is $100 and CGST is $5,
      // and we give $10 discount ($90 new subtotal), then new CGST is $5 * (90/100) =
      double taxFactor = subtotal > 0 ? (discountedSubtotal / subtotal) : 1.0;
      cgst = (order.getCgst() * taxFactor);
      sgst = (order.getSgst() * taxFactor);
    }

    double totalAmount = discountedSubtotal + cgst + sgst;

    Payment payment = new Payment();
    payment.setOrderId(request.getOrderId());
    payment.setPaymentStatus(PaymentStatus.COMPLETED);
    payment.setSubtotal(discountedSubtotal);
    payment.setCgst(cgst);
    payment.setSgst(sgst);
    payment.setTotalAmount(totalAmount);
    payment.setDiscount(discount);
    payment.setGstEnabled(order.isGstEnabled());
    payment.setTransactionRef(request.getTransactionRef());
    payment.setPaidAt(LocalDateTime.now());

    double totalReceived = 0;

    if (request.getPaymentModes() != null && !request.getPaymentModes().isEmpty()) {
      // Multi-mode payment
      for (PaymentRequest.PaymentModeDetail detailReq : request.getPaymentModes()) {
        PaymentDetail detail = new PaymentDetail();
        detail.setPaymentMode(detailReq.getMode());
        detail.setAmount(detailReq.getAmount());
        detail.setTransactionRef(detailReq.getRef());
        payment.addDetail(detail);
        totalReceived += detailReq.getAmount();
      }
      // Set primary mode as MIXED if multiple, or the single one
      if (request.getPaymentModes().size() > 1) {
        payment.setPaymentMode(PaymentMode.MIXED); // Assuming MIXED is added to enum, or use CASH as default/fallback
      } else {
        payment.setPaymentMode(request.getPaymentModes().get(0).getMode());
      }
    } else {
      // Legacy single mode
      PaymentDetail detail = new PaymentDetail();
      detail.setPaymentMode(request.getPaymentMode());
      detail.setAmount(request.getAmountReceived() > 0 ? request.getAmountReceived() : totalAmount);
      detail.setTransactionRef(request.getTransactionRef());
      payment.addDetail(detail);

      if (request.getPaymentMode() != null) {
        payment.setPaymentMode(request.getPaymentMode());
      } else {
        payment.setPaymentMode(PaymentMode.CASH);
        detail.setPaymentMode(PaymentMode.CASH);
      }
      totalReceived = request.getAmountReceived();
    }

    // If totalReceived is 0 (e.g. card payment exact), assume they paid totalAmount
    if (totalReceived <= 0) {
      if (payment.getPaymentMode() == PaymentMode.CASH) {
        throw new RuntimeException("Cash payment requires amount received");
      }
      totalReceived = totalAmount; // Assume exact for digital payments
    }

    payment.setAmountReceived(totalReceived);
    payment.setChangeReturned(totalReceived > totalAmount ? totalReceived - totalAmount : 0);

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

    // Update table status if DINE_IN
    if (order.getOrderType() == OrderType.DINE_IN && order.getTableNumber() != null) {
      tableRepository.findByTableNumber(order.getTableNumber()).ifPresent(table -> {
        table.setStatus(TableStatus.AVAILABLE);
        table.setCurrentOrderId(null);
        tableRepository.save(table);
        messagingTemplate.convertAndSend("/topic/tables", "TABLE_UPDATE");
      });
    }

    // Record customer visit for loyalty points
    if (order.getCustomerPhone() != null) {
      customerService.recordVisit(order.getCustomerPhone(), totalAmount);
    }

    return savedPayment;
  }

  public BillResponse generateBill(Long orderId) {
    if (orderId == null) {
      throw new RuntimeException("Order ID is required");
    }
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
    bill.setGstEnabled(order.isGstEnabled());
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
