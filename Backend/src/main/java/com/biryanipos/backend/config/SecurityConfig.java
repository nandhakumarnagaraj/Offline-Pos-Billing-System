package com.biryanipos.backend.config;

import com.biryanipos.backend.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthFilter jwtAuthFilter;

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> {
        }) // Use existing CorsConfig
        .csrf(csrf -> csrf.disable()) // Stateless REST API
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            // Public endpoints — login, WebSocket, Config, Payment Callbacks
            .requestMatchers("/api/auth/login").permitAll()
            .requestMatchers("/ws/**").permitAll()
            .requestMatchers("/api/config", "/api/config/**").permitAll()
            .requestMatchers("/api/payments/easebuzz/**").permitAll()
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

            // Restricted access
            .requestMatchers("/h2-console/**").hasRole("ADMIN")
            .requestMatchers("/api/auth/change-password").authenticated()

            // Admin/Manager only endpoints
            .requestMatchers("/api/auth/create-user").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers("/api/auth/users").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers("/api/auth/reset-password/**").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers("/api/reports/**").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers("/api/expenses/**").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers("/api/stock/**").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers(HttpMethod.POST, "/api/menu-items").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers(HttpMethod.PUT, "/api/menu-items/**").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers(HttpMethod.DELETE, "/api/menu-items/**").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers(HttpMethod.POST, "/api/categories").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers(HttpMethod.PUT, "/api/categories/**").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasAnyRole("ADMIN", "MANAGER")

            // All authenticated users can access these
            .requestMatchers(HttpMethod.GET, "/api/menu-items/**").authenticated()
            .requestMatchers(HttpMethod.GET, "/api/categories/**").authenticated()
            .requestMatchers("/api/orders/**").authenticated()
            .requestMatchers("/api/tables/**").authenticated()
            .requestMatchers("/api/payments/**").authenticated()
            .requestMatchers("/api/system/**").hasAnyRole("ADMIN", "MANAGER")
            .requestMatchers("/api/backup/**").hasAnyRole("ADMIN", "MANAGER")

            // Everything else needs authentication
            .anyRequest().authenticated())
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

    // H2 console frame options
    http.headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));

    return http.build();
  }
}
