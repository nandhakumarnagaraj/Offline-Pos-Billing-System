package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.PurchaseOrder;
import com.biryanipos.backend.model.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
  List<PurchaseOrder> findBySupplierId(Long supplierId);

  List<PurchaseOrder> findByStatus(PurchaseOrderStatus status);
}
