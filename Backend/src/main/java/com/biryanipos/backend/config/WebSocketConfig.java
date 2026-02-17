package com.biryanipos.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  private final AppProperties appProperties; // Added field for AppProperties

  public WebSocketConfig(AppProperties appProperties) { // Added constructor for injection
    this.appProperties = appProperties;
  }

  @Override
  public void configureMessageBroker(@org.springframework.lang.NonNull MessageBrokerRegistry config) {
    config.enableSimpleBroker("/topic");
    config.setApplicationDestinationPrefixes("/app");
  }

  @Override
  public void registerStompEndpoints(@org.springframework.lang.NonNull StompEndpointRegistry registry) {
    String allowed = appProperties.getSecurity().getAllowedOrigins(); // Get allowed origins from properties
    registry.addEndpoint("/ws")
        .setAllowedOriginPatterns(allowed.split(",")) // Use setAllowedOriginPatterns for pattern matching
        .withSockJS();
  }
}
