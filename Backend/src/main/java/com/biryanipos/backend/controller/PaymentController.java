package com.biryanipos.backend.controller;

import com.biryanipos.backend.dto.BillResponse;
import com.biryanipos.backend.dto.InitiateDigitalPaymentRequest;

import com.biryanipos.backend.dto.PaymentRequest;
import com.biryanipos.backend.model.Payment;
import com.biryanipos.backend.service.EasebuzzService;
import com.biryanipos.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

  private final PaymentService paymentService;
  private final EasebuzzService easebuzzService;

  @PostMapping("/initiate-digital")
  public ResponseEntity<Map<String, Object>> initiateDigitalPayment(
      @RequestBody InitiateDigitalPaymentRequest request) {
    System.out.println("Initiate Digital Payment - OrderId: " + request.getOrderId() + ", Amount: "
        + request.getAmount() + ", Metadata: " + request.getMetadata());
    return ResponseEntity.ok(easebuzzService.initiatePayment(
        request.getOrderId(),
        request.getDiscount(),
        request.getAmount(),
        request.getMetadata()));
  }

  @PostMapping("/easebuzz/success")
  public ResponseEntity<String> handleEasebuzzSuccess(@RequestParam Map<String, String> payload) {
    try {
      log("Easebuzz Success Callback: " + payload);
      boolean isValid = easebuzzService.verifyPaymentResponse(payload);
      String status = payload.getOrDefault("status", "");
      String txnid = payload.getOrDefault("txnid", "");
      String easepayId = payload.getOrDefault("easepay_id", "");

      if (isValid && "success".equalsIgnoreCase(status)) {
        Long orderId = parseOrderIdFromTxnId(txnid);

        PaymentRequest pr = new PaymentRequest();
        pr.setOrderId(orderId);
        pr.setDiscount(0.0); // Discount already applied to order total in initiation

        // Reconstruct split payments from metadata (udf1)
        java.util.List<PaymentRequest.PaymentModeDetail> modes = new java.util.ArrayList<>();
        double onlineAmount = 0;
        try {
          onlineAmount = Double.parseDouble(payload.getOrDefault("amount", "0"));
        } catch (NumberFormatException e) {
          onlineAmount = 0;
        }
        modes.add(new PaymentRequest.PaymentModeDetail(com.biryanipos.backend.model.PaymentMode.ONLINE, onlineAmount,
            easepayId != null ? easepayId : txnid));

        String metadata = payload.get("udf1");
        // In PaymentController: parse udf1 using ~ and _ separators instead of , and :.
        // The udf1 is expected to be in the format MODE_AMOUNT~MODE_AMOUNT (e.g.
        // CASH_772~CARD_100)
        if (metadata != null && !metadata.isBlank()) {
          try {
            // Format: CASH_772~CARD_100 (safe Easebuzz encoding)
            String[] parts = metadata.split("~");
            for (String part : parts) {
              String[] kv = part.split("_", 2);
              if (kv.length == 2) {
                try {
                  modes.add(new PaymentRequest.PaymentModeDetail(
                      com.biryanipos.backend.model.PaymentMode.valueOf(kv[0]),
                      Double.parseDouble(kv[1]),
                      null));
                } catch (Exception ignore) {
                }
              }
            }
          } catch (Exception ignore) {
          }
        }
        pr.setPaymentModes(modes);
        pr.setAmountReceived(modes.stream().mapToDouble(m -> m.getAmount()).sum());

        paymentService.processPayment(pr);

        return ResponseEntity.ok()
            .header("Content-Type", "text/html")
            .body("<html><body style='text-align:center; font-family:sans-serif; padding:50px;'>"
                + "<h1 style='color:green'>Payment Successful!</h1>"
                + "<p>Transaction ID: " + txnid + "</p>"
                + "<p>Order updated. You can close this window.</p>"
                + "<script>setTimeout(function(){ window.location.href='http://localhost:5173/payment-success?orderId="
                + orderId + "&txnid=" + txnid + "'; }, 2000);</script>"
                + "</body></html>");
      } else {
        return ResponseEntity.badRequest().body("Invalid Payment Signature or Status");
      }
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.internalServerError().body("Error processing payment: " + e.getMessage());
    }
  }

  @PostMapping("/easebuzz/failure")
  public ResponseEntity<String> handleEasebuzzFailure(@RequestParam Map<String, String> payload) {
    log("Easebuzz Failure Callback: " + payload);
    String txnid = payload.getOrDefault("txnid", "");
    String status = payload.getOrDefault("status", "failure");
    String error = payload.getOrDefault("error_Message", "Unknown Error");
    Long orderId = parseOrderIdFromTxnId(txnid);

    return ResponseEntity.ok()
        .header("Content-Type", "text/html")
        .body("<html><body style='text-align:center; font-family:sans-serif; padding:50px;'>"
            + "<h1 style='color:red'>Payment Failed</h1>"
            + "<p>Reason: " + error + "</p>"
            + "<p>Redirecting back to app...</p>"
            + "<script>setTimeout(function(){ window.location.href='http://localhost:5173/payment-failure?orderId="
            + orderId + "&txnid=" + txnid + "&status=" + status + "&error=" + error + "'; }, 3000);</script>"
            + "</body></html>");
  }

  private void log(String msg) {
    System.out.println(msg);
  }

  private Long parseOrderIdFromTxnId(String txnid) {
    try {
      if (txnid != null && txnid.startsWith("T") && txnid.contains("R")) {
        int rIndex = txnid.indexOf("R");
        String idStr = txnid.substring(1, rIndex);
        return Long.parseLong(idStr);
      }
    } catch (Exception e) {
      // ignore
    }
    return 0L;
  }

  @PostMapping
  public ResponseEntity<Payment> processPayment(@RequestBody PaymentRequest request) {
    return ResponseEntity.ok(paymentService.processPayment(request));
  }

  @GetMapping("/bill/{orderId}")
  public ResponseEntity<BillResponse> getBill(@PathVariable Long orderId) {
    return ResponseEntity.ok(paymentService.generateBill(orderId));
  }

  @GetMapping("/order/{orderId}")
  public ResponseEntity<Payment> getPaymentByOrder(@PathVariable Long orderId) {
    Payment payment = paymentService.getPaymentByOrderId(orderId);
    if (payment == null) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(payment);
  }
}
