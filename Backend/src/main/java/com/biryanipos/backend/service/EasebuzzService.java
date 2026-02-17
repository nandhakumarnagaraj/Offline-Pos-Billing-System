package com.biryanipos.backend.service;

import com.biryanipos.backend.config.AppProperties;
import com.biryanipos.backend.model.Order;
import com.biryanipos.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EasebuzzService {

  private final AppProperties appProperties;
  private final OrderRepository orderRepository;

  public Map<String, Object> initiatePayment(Long orderId, double discount) {
    Order order = orderRepository.findById(Objects.requireNonNull(orderId))
        .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

    AppProperties.Easebuzz config = appProperties.getEasebuzz();
    validateConfig(config);

    String txnid = generateTxnId(order.getId());
    String amount = String.format(Locale.US, "%.2f", computePayableAmount(order, discount));
    String productinfo = "Order" + order.getId();
    String firstname = (order.getCustomerName() != null && !order.getCustomerName().trim().isEmpty())
        ? order.getCustomerName().trim()
        : "Guest";
    String email = "customer@example.com";
    String phone = (order.getCustomerPhone() != null && !order.getCustomerPhone().trim().isEmpty())
        ? order.getCustomerPhone().trim()
        : "9999999999";

    // SURL and FURL must be POST endpoints where Easebuzz will post the response
    String surl = config.getSuccessUrl();
    String furl = config.getFailureUrl();

    // Hash Sequence:
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    String hashSequence = config.getKey() + "|" + txnid + "|" + amount + "|" + productinfo + "|"
        + firstname + "|" + email + "|||||||||||" + config.getSalt();
    String hash = generateSHA512(hashSequence);

    Map<String, String> fields = new HashMap<>();
    fields.put("key", config.getKey());
    fields.put("txnid", txnid);
    fields.put("amount", amount);
    fields.put("productinfo", productinfo);
    fields.put("firstname", firstname);
    fields.put("phone", phone);
    fields.put("email", email);
    fields.put("surl", surl);
    fields.put("furl", furl);
    fields.put("hash", hash);

    if (config.getSubMerchantId() != null && !config.getSubMerchantId().trim().isEmpty()) {
      fields.put("sub_merchant_id", config.getSubMerchantId().trim());
    }

    Map<String, Object> response = new HashMap<>();
    response.put("action", config.getBaseUrl());
    response.put("fields", fields);

    log.info("Easebuzz Redirect Payload Generated for Order: {}", orderId);
    return response;
  }

  private void validateConfig(AppProperties.Easebuzz config) {
    if (config.getKey() == null || config.getKey().isBlank())
      throw new IllegalArgumentException("Easebuzz Key is missing");
    if (config.getSalt() == null || config.getSalt().isBlank())
      throw new IllegalArgumentException("Easebuzz Salt is missing");
    if (config.getBaseUrl() == null || config.getBaseUrl().isBlank())
      throw new IllegalArgumentException("Easebuzz Base URL is missing");
  }

  private String generateTxnId(Long orderId) {
    String randomPart = UUID.randomUUID().toString().replaceAll("-", "").substring(0, 6).toUpperCase();
    return "T" + orderId + "R" + randomPart;
  }

  private double computePayableAmount(Order order, double discount) {
    double subtotal = order.getSubtotal();
    double disc = Math.max(0.0, discount);
    double discountedSubtotal = Math.max(0.0, subtotal - disc);

    double cgst = 0;
    double sgst = 0;

    if (appProperties.getTax().isEnabled()) {
      // Use order's original tax ratio if available, or fall back to default
      double taxFactor = subtotal > 0 ? (discountedSubtotal / subtotal) : 1.0;
      cgst = order.getCgst() * taxFactor;
      sgst = order.getSgst() * taxFactor;
    }

    return discountedSubtotal + cgst + sgst;
  }

  public boolean verifyPaymentResponse(Map<String, String> data) {
    AppProperties.Easebuzz config = appProperties.getEasebuzz();
    String key = config.getKey();
    String salt = config.getSalt();

    String status = data.getOrDefault("status", "");
    String firstname = data.getOrDefault("firstname", "");
    String amount = data.getOrDefault("amount", "");
    String txnid = data.getOrDefault("txnid", "");
    String email = data.getOrDefault("email", "");
    String productinfo = data.getOrDefault("productinfo", "");
    String postedHash = data.getOrDefault("hash", "");

    // Reverse Hash:
    // salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
    String hashSequence = salt + "|" + status + "|||||||||||" + email + "|" + firstname + "|"
        + productinfo + "|" + amount + "|" + txnid + "|" + key;

    String calculatedHash = generateSHA512(hashSequence);
    return calculatedHash.equalsIgnoreCase(postedHash);
  }

  private String generateSHA512(String input) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-512");
      byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (byte b : digest) {
        sb.append(String.format("%02x", b));
      }
      return sb.toString();
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException("SHA-512 not supported", e);
    }
  }
}
