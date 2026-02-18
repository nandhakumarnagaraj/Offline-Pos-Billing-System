package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "app_config")
public class AppConfig {
  @Id
  private String configKey;

  @Lob
  @Column(columnDefinition = "LONGTEXT")
  private String configValue;

  private String description;
  private String category; // e.g., "SHOP", "TAX", "SYSTEM"

}
