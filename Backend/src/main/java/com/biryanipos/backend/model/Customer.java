package com.biryanipos.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "customers")
public class Customer {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String phone;

  private String name;
  private String email;
  private LocalDateTime dateOfBirth;

  private double loyaltyPoints = 0.0;
  private double totalSpent = 0.0;
  private int visitCount = 0;

  private LocalDateTime createdAt;
  private LocalDateTime lastVisit;

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
  }
}
