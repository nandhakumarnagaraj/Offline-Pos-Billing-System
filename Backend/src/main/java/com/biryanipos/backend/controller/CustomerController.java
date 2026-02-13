package com.biryanipos.backend.controller;

import com.biryanipos.backend.model.Customer;
import com.biryanipos.backend.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {
  private final CustomerService customerService;

  @GetMapping
  public ResponseEntity<List<Customer>> getAllCustomers() {
    return ResponseEntity.ok(customerService.getAllCustomers());
  }

  @GetMapping("/{phone}")
  public ResponseEntity<Customer> getCustomerByPhone(@PathVariable String phone) {
    return customerService.getCustomerByPhone(phone)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping
  public ResponseEntity<Customer> registerCustomer(@RequestBody Customer customer) {
    return ResponseEntity.ok(customerService.registerOrUpdateCustomer(customer));
  }

  @PostMapping("/{phone}/redeem")
  public ResponseEntity<Double> redeemPoints(@PathVariable String phone, @RequestParam double points) {
    return ResponseEntity.ok(customerService.redeemPoints(phone, points));
  }
}
