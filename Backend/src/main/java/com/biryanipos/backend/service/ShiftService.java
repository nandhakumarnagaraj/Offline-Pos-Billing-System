package com.biryanipos.backend.service;

import com.biryanipos.backend.model.*;
import com.biryanipos.backend.repository.OrderRepository;
import com.biryanipos.backend.repository.PaymentRepository;
import com.biryanipos.backend.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ShiftService {
  private final ShiftRepository shiftRepository;
  private final OrderRepository orderRepository;
  private final PaymentRepository paymentRepository;

  public Optional<Shift> getActiveShift() {
    return shiftRepository.findByActiveTrue();
  }

  @Transactional
  public Shift openShift(String user, double openingCash) {
    if (getActiveShift().isPresent()) {
      throw new RuntimeException("A shift is already active");
    }
    Shift shift = new Shift();
    shift.setOpenedBy(user);
    shift.setOpeningCash(openingCash);
    shift.setActive(true);
    return shiftRepository.save(shift);
  }

  public Shift generateXReport() {
    Shift activeShift = getActiveShift()
        .orElseThrow(() -> new RuntimeException("No active shift found"));

    updateShiftStats(activeShift);
    return activeShift;
  }

  @Transactional
  public Shift closeShift(String user, double actualCash) {
    Shift shift = getActiveShift()
        .orElseThrow(() -> new RuntimeException("No active shift found"));

    updateShiftStats(shift);
    shift.setClosedBy(user);
    shift.setClosingTime(LocalDateTime.now());
    shift.setClosingCash(actualCash);

    // Expected cash = opening cash + total cash sales
    double cashSales = paymentRepository.findCompletedPaymentsBetween(shift.getOpeningTime(), shift.getClosingTime())
        .stream()
        .filter(p -> p.getPaymentMode() == PaymentMode.CASH)
        .mapToDouble(Payment::getTotalAmount)
        .sum();

    shift.setExpectedCash(shift.getOpeningCash() + cashSales);
    shift.setVariance(actualCash - shift.getExpectedCash());
    shift.setActive(false);

    return shiftRepository.save(shift);
  }

  private void updateShiftStats(Shift shift) {
    LocalDateTime start = shift.getOpeningTime();
    LocalDateTime end = shift.getClosingTime() != null ? shift.getClosingTime() : LocalDateTime.now();

    List<Order> shiftOrders = orderRepository.findByCreatedAtBetween(start, end);
    List<Payment> shiftPayments = paymentRepository.findCompletedPaymentsBetween(start, end);

    shift.setOrderCount(shiftOrders.size());
    shift.setTotalSales(shiftPayments.stream().mapToDouble(Payment::getTotalAmount).sum());
    shift.setTotalCgst(shiftPayments.stream().mapToDouble(Payment::getCgst).sum());
    shift.setTotalSgst(shiftPayments.stream().mapToDouble(Payment::getSgst).sum());
    shift.setTotalDiscount(shiftPayments.stream().mapToDouble(Payment::getDiscount).sum());
  }
}
