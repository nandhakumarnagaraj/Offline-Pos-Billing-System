package com.biryanipos.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

  private Shop shop = new Shop();
  private Tax tax = new Tax();
  private Order order = new Order();
  private Inventory inventory = new Inventory();
  private Security security = new Security();
  private System system = new System();
  private Easebuzz easebuzz = new Easebuzz();

  @Data
  public static class Easebuzz {
    private String key;
    private String salt;
    private String env = "test"; // "test" or "prod"
    private String subMerchantId;
    private String baseUrl = "https://pay.easebuzz.in/pay/secure";
    private String successUrl;
    private String failureUrl;
  }

  @Data
  public static class Shop {
    private String name = "Biryani POS";
    private String address = "Enter Address Here";
    private String phone = "0000000000";
    private String whatsapp = "0000000000";
    private String gstin = "";
    private String fssai = "";
    private String tagline = "Savory Delights for Every Occasion";
    private String footerMessage = "Thank you for visiting!";
    private String softwareBy = "KhanaBook";
    private String logoUrl = "/assets/logo.png";
  }

  @Data
  public static class Tax {
    private double defaultGstPercent = 5.0;
    private boolean enabled = true;
    private boolean inclusiveTax = false;
    private String currencySymbol = "₹";
  }

  @Data
  public static class Order {
    private int defaultPrepTimeMinutes = 15;
    private int freezeWindowMinutes = 10;
    private boolean autoPrintKds = true;
    private boolean autoPrintBill = false;
    private String defaultOrderType = "DINE_IN";
    private boolean allowVoidAfterPrint = false;
  }

  @Data
  public static class Inventory {
    private double defaultLowStockThreshold = 50.0;
    private int expiryAlertDays = 7;
    private boolean autoDeductOnOrder = true;
  }

  @Data
  public static class Security {
    private String jwtSecret = "default_secret_key_change_in_production";
    private long jwtExpirationMs = 86400000; // 24 hours
    private String allowedOrigins = "http://localhost:5173";
  }

  @Data
  public static class System {
    private int maxBackupHistoryDays = 7;
    private String backupPath = "./backups";
    private boolean enableSoundAlerts = true;
  }
}
