package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.AppConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppConfigRepository extends JpaRepository<AppConfig, String> {
  List<AppConfig> findByCategory(String category);
}
