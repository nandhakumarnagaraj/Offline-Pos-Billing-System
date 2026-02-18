package com.biryanipos.backend.repository;

import com.biryanipos.backend.model.AppConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface AppConfigRepository extends JpaRepository<AppConfig, String> {
  List<AppConfig> findByCategory(String category);

  @Modifying
  @Transactional
  @Query(value = "ALTER TABLE app_config MODIFY config_value LONGTEXT", nativeQuery = true)
  void fixColumnLength();
}
