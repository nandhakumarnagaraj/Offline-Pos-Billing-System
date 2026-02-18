package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.Payment;
import com.biryanipos.backend.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
  Optional<Payment> findByOrderId(Long orderId);

  List<Payment> findByPaymentStatus(PaymentStatus status);

  @Query("SELECT p FROM Payment p WHERE p.paidAt BETWEEN :start AND :end AND p.paymentStatus = 'COMPLETED'")
  List<Payment> findCompletedPaymentsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

  @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Payment p WHERE p.paidAt BETWEEN :start AND :end AND p.paymentStatus = 'COMPLETED'")
  Double sumTotalAmountBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

  @Query("SELECT COALESCE(SUM(p.cgst), 0) FROM Payment p WHERE p.paidAt BETWEEN :start AND :end AND p.paymentStatus = 'COMPLETED'")
  Double sumCgstBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

  @Query("SELECT COALESCE(SUM(p.sgst), 0) FROM Payment p WHERE p.paidAt BETWEEN :start AND :end AND p.paymentStatus = 'COMPLETED'")
  Double sumSgstBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

  @Query("SELECT p.paymentMode, SUM(p.totalAmount) FROM Payment p WHERE p.paidAt BETWEEN :start AND :end AND p.paymentStatus = 'COMPLETED' GROUP BY p.paymentMode")
  List<Object[]> findPaymentModeBreakdownBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

  @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Payment p WHERE p.paidAt BETWEEN :start AND :end AND p.paymentStatus = 'COMPLETED' AND p.gstEnabled = true")
  Double sumTaxableRevenueBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

  @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Payment p WHERE p.paidAt BETWEEN :start AND :end AND p.paymentStatus = 'COMPLETED' AND p.gstEnabled = false")
  Double sumExemptRevenueBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
