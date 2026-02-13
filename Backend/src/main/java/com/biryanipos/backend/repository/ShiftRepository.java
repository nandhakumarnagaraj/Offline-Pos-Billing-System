package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {
  Optional<Shift> findByActiveTrue();

  Optional<Shift> findTopByOrderByClosingTimeDesc();
}
