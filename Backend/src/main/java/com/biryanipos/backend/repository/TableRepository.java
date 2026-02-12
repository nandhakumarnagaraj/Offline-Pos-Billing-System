package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.RestaurantTable;
import com.biryanipos.backend.model.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TableRepository extends JpaRepository<RestaurantTable, Long> {
  Optional<RestaurantTable> findByTableNumber(String tableNumber);

  List<RestaurantTable> findByStatus(TableStatus status);

  List<RestaurantTable> findAllByOrderByTableNumberAsc();
}
