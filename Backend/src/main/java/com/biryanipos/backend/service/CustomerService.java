package com.biryanipos.backend.service;

import com.biryanipos.backend.model.Customer;
import com.biryanipos.backend.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomerService {
  private final CustomerRepository customerRepository;

  public List<Customer> getAllCustomers() {
    return customerRepository.findAll();
  }

  public Optional<Customer> getCustomerByPhone(String phone) {
    return customerRepository.findByPhone(phone);
  }

  @Transactional
  public Customer registerOrUpdateCustomer(Customer customer) {
    Optional<Customer> existing = customerRepository.findByPhone(customer.getPhone());
    if (existing.isPresent()) {
      Customer c = existing.get();
      c.setName(customer.getName());
      c.setEmail(customer.getEmail());
      if (customer.getDateOfBirth() != null)
        c.setDateOfBirth(customer.getDateOfBirth());
      return customerRepository.save(c);
    }
    return customerRepository.save(customer);
  }

  @Transactional
  public void recordVisit(String phone, double amount) {
    customerRepository.findByPhone(phone).ifPresent(c -> {
      c.setVisitCount(c.getVisitCount() + 1);
      c.setTotalSpent(c.getTotalSpent() + amount);
      c.setLastVisit(LocalDateTime.now());

      // Logic: 1 point for every 100 rupees
      double newPoints = amount / 100.0;
      c.setLoyaltyPoints(c.getLoyaltyPoints() + newPoints);

      customerRepository.save(c);
    });
  }

  @Transactional
  public double redeemPoints(String phone, double pointsToRedeem) {
    return customerRepository.findByPhone(phone).map(c -> {
      if (c.getLoyaltyPoints() < pointsToRedeem) {
        throw new RuntimeException("Insufficient loyalty points");
      }
      c.setLoyaltyPoints(c.getLoyaltyPoints() - pointsToRedeem);
      customerRepository.save(c);
      // Conversion: 1 point = 1 rupee
      return pointsToRedeem;
    }).orElseThrow(() -> new RuntimeException("Customer not found"));
  }
}
