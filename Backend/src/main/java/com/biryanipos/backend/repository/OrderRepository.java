package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.Order;
import com.biryanipos.backend.model.OrderStatus;
import com.biryanipos.backend.model.OrderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
  List<Order> findByStatus(OrderStatus status);

  List<Order> findByStatusNot(OrderStatus status);

  List<Order> findByOrderType(OrderType orderType);

  List<Order> findByTableNumber(String tableNumber);

  @Query("SELECT o FROM Order o WHERE o.createdAt BETWEEN :start AND :end")
  List<Order> findByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

  @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.status NOT IN ('PAID', 'CANCELLED') ORDER BY o.createdAt DESC")
  List<Order> findActiveOrders();

  @Query("SELECT COUNT(o) FROM Order o WHERE o.status NOT IN ('PAID', 'CANCELLED')")
  long countActiveOrders();

  @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt BETWEEN :start AND :end")
  long countByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

  @Query("SELECT o FROM Order o WHERE o.status IN ('NEW', 'COOKING') ORDER BY o.createdAt ASC")
  List<Order> findKitchenOrders();

  @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status AND o.createdAt BETWEEN :start AND :end")
  long countByStatusAndCreatedAtBetween(@Param("status") OrderStatus status, @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end);

  @Query("SELECT COUNT(o) FROM Order o WHERE o.orderType = :type AND o.createdAt BETWEEN :start AND :end")
  long countByOrderTypeAndCreatedAtBetween(@Param("type") OrderType type, @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end);

  @Query("SELECT o.createdBy, SUM(o.totalAmount) FROM Order o WHERE o.status = 'PAID' AND o.createdBy IS NOT NULL AND o.createdAt BETWEEN :start AND :end GROUP BY o.createdBy")
  List<Object[]> findWaiterPerformanceBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
