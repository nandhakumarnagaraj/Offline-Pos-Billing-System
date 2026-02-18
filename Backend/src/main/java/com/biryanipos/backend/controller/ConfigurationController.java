package com.biryanipos.backend.controller;

import com.biryanipos.backend.config.AppProperties;
import com.biryanipos.backend.service.ConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigurationController {

  private final ConfigurationService configurationService;
  private final AppProperties appProperties;

  @GetMapping
  public Map<String, String> getAllConfigs() {
    return configurationService.getAllConfigs();
  }

  @GetMapping("/current")
  public AppProperties getCurrentProperties() {
    // Return the bean directly; if proxy issues occur, Jackson usually handles
    // them,
    // but we'll ensure the service has refreshed it.
    configurationService.refreshProperties();
    return appProperties;
  }

  @PostMapping("/{key}")
  public void updateConfig(@PathVariable String key, @RequestBody String value) {
    configurationService.updateConfig(key, value);
  }

  @PostMapping("/batch")
  public void updateConfigs(@RequestBody Map<String, String> configs) {
    configurationService.updateConfigs(configs);
  }
}
