package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
  List<Supplier> findByActiveTrue();

  java.util.Optional<Supplier> findByName(String name);
}
