package com.biryanipos.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import com.biryanipos.backend.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@RequiredArgsConstructor
public class JwtUtil {

  private final AppProperties appProperties;

  private SecretKey getSigningKey() {
    return Keys.hmacShaKeyFor(appProperties.getSecurity().getJwtSecret().getBytes(StandardCharsets.UTF_8));
  }

  public String generateToken(String username, String role) {
    return Jwts.builder()
        .subject(username)
        .claim("role", role)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + appProperties.getSecurity().getJwtExpirationMs()))
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
