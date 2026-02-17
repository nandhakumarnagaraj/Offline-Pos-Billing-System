package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
  List<MenuItem> findByCategory(String category);

  List<MenuItem> findByAvailableTrue();

  List<MenuItem> findByCategoryId(Long categoryId);

  java.util.Optional<MenuItem> findByBarcode(String barcode);

  @Query("SELECT m FROM MenuItem m WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%'))")
  List<MenuItem> searchByName(@Param("query") String query);

  List<MenuItem> findByCategoryAndAvailableTrue(String category);

  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT m FROM MenuItem m WHERE m.id = :id")
  java.util.Optional<MenuItem> findByIdWithLock(@Param("id") Long id);
}
