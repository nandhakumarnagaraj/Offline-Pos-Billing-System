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

  @Query("SELECT o FROM Order o WHERE o.status NOT IN ('PAID', 'CANCELLED') ORDER BY o.createdAt DESC")
  List<Order> findActiveOrders();

  @Query("SELECT o FROM Order o WHERE o.status IN ('NEW', 'COOKING') ORDER BY o.createdAt ASC")
  List<Order> findKitchenOrders();
}
