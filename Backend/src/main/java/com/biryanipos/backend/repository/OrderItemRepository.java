package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

  @org.springframework.data.jpa.repository.Query("SELECT i.menuItem.name, SUM(i.quantity), SUM(i.quantity * i.price) "
      + "FROM OrderItem i JOIN i.order o " + "WHERE o.createdAt BETWEEN :start AND :end AND o.status = 'PAID' "
      + "GROUP BY i.menuItem.name " + "ORDER BY SUM(i.quantity) DESC")
  java.util.List<Object[]> findTopSellingItems(
      @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
      @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);
}
