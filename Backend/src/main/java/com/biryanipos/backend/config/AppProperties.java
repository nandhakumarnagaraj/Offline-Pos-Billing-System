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

  @Data
  public static class Shop {
    private String name = "BIRYANIWALE ANNA";
    private String address = "B.N MARKET, JAGDEO PATH, ANISABAD RD, KHAJPURA, PATNA";
    private String phone = "7418135699";
    private String whatsapp = "7418135699";
    private String gstin = "3############T";
    private String fssai = "10425000000318";
    private String tagline = "SAVE OUR NUMBER FOR EXCITING OFFERS!";
    private String footerMessage = "VISIT AGAIN!";
    private String softwareBy = "KhanaBook";
    private String logoUrl = "/assets/logo.png";
  }

  @Data
  public static class Tax {
    private double defaultGstPercent = 5.0;
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
