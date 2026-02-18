package com.biryanipos.backend.service;

import com.biryanipos.backend.config.AppProperties;
import com.biryanipos.backend.model.AppConfig;
import com.biryanipos.backend.repository.AppConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigurationService {

  private final AppConfigRepository configRepository;
  private final AppProperties appProperties;

  @PostConstruct
  public void init() {
    try {
      configRepository.fixColumnLength();
      log.info("Database column for AppConfig expanded to LONGTEXT.");
    } catch (Exception e) {
      log.warn("Could not modify column length (possible already modified or not MySQL): {}", e.getMessage());
    }
    refreshProperties();
  }

  public void refreshProperties() {
    List<AppConfig> dbConfigs = configRepository.findAll();
    Map<String, String> configMap = new HashMap<>();
    for (AppConfig config : dbConfigs) {
      configMap.put(config.getConfigKey(), config.getConfigValue());
    }

    applyConfigsToProperties(configMap);
  }

  private void applyConfigsToProperties(Map<String, String> configMap) {
    // Reflection to map keys like "shop.name" to appProperties.getShop().setName()
    // For simplicity in this implementation, we'll do it manually for major fields
    // or use a more robust mapping if needed.

    if (configMap.isEmpty())
      return;

    log.info("Applying {} configurations from database", configMap.size());

    // Shop
    if (configMap.containsKey("shop.name"))
      appProperties.getShop().setName(configMap.get("shop.name"));
    if (configMap.containsKey("shop.address"))
      appProperties.getShop().setAddress(configMap.get("shop.address"));
    if (configMap.containsKey("shop.phone"))
      appProperties.getShop().setPhone(configMap.get("shop.phone"));
    if (configMap.containsKey("shop.whatsapp"))
      appProperties.getShop().setWhatsapp(configMap.get("shop.whatsapp"));
    if (configMap.containsKey("shop.gstin"))
      appProperties.getShop().setGstin(configMap.get("shop.gstin"));
    if (configMap.containsKey("shop.fssai"))
      appProperties.getShop().setFssai(configMap.get("shop.fssai"));
    if (configMap.containsKey("shop.tagline"))
      appProperties.getShop().setTagline(configMap.get("shop.tagline"));
    if (configMap.containsKey("shop.footerMessage"))
      appProperties.getShop().setFooterMessage(configMap.get("shop.footerMessage"));
    if (configMap.containsKey("shop.softwareBy"))
      appProperties.getShop().setSoftwareBy(configMap.get("shop.softwareBy"));
    if (configMap.containsKey("shop.logoUrl"))
      appProperties.getShop().setLogoUrl(configMap.get("shop.logoUrl"));

    // Tax
    try {
      if (configMap.containsKey("tax.defaultGstPercent") && !configMap.get("tax.defaultGstPercent").isEmpty())
        appProperties.getTax().setDefaultGstPercent(Double.parseDouble(configMap.get("tax.defaultGstPercent")));
    } catch (Exception e) {
      log.warn("Invalid tax.defaultGstPercent: {}", configMap.get("tax.defaultGstPercent"));
    }

    if (configMap.containsKey("tax.enabled"))
      appProperties.getTax().setEnabled(Boolean.parseBoolean(configMap.get("tax.enabled")));

    // Order
    if (configMap.containsKey("order.defaultPrepTimeMinutes"))
      appProperties.getOrder()
          .setDefaultPrepTimeMinutes(Integer.parseInt(configMap.get("order.defaultPrepTimeMinutes")));

    // Inventory
    if (configMap.containsKey("inventory.defaultLowStockThreshold"))
      appProperties.getInventory()
          .setDefaultLowStockThreshold(Double.parseDouble(configMap.get("inventory.defaultLowStockThreshold")));
  }

  @Transactional
  public void updateConfig(String key, String value) {
    saveConfig(key, value);
    refreshProperties();
  }

  @Transactional
  public void updateConfigs(Map<String, String> configs) {
    configs.forEach(this::saveConfig);
    refreshProperties();
  }

  private void saveConfig(String key, String value) {
    String category = key.contains(".") ? key.split("\\.")[0].toUpperCase() : "GENERAL";
    AppConfig config = configRepository.findById(key)
        .orElse(new AppConfig(key, value, null, category));
    config.setConfigValue(value);
    configRepository.save(config);
  }

  public Map<String, String> getAllConfigs() {
    Map<String, String> configs = new HashMap<>();
    configRepository.findAll().forEach(c -> configs.put(c.getConfigKey(), c.getConfigValue()));
    return configs;
  }
}
