package com.biryanipos.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

  @Value("${jwt.secret:KhanaBookPOS-SuperSecretKey-2024-OfflineLAN-SystemKey123456}")
  private String secret;

  @Value("${jwt.expiration:86400000}") // 24 hours
  private long expirationMs;

  private SecretKey getSigningKey() {
    return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  public String generateToken(String username, String role) {
    return Jwts.builder()
        .subject(username)
        .claim("role", role)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + expirationMs))
        .signWith(getSigningKey())
        .compact();
  }

  public String getUsernameFromToken(String token) {
    return getClaims(token).getSubject();
  }

  public String getRoleFromToken(String token) {
    return getClaims(token).get("role", String.class);
  }

  public boolean validateToken(String token) {
    try {
      getClaims(token);
      return true;
    } catch (JwtException | IllegalArgumentException e) {
      return false;
    }
  }

  private Claims getClaims(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
