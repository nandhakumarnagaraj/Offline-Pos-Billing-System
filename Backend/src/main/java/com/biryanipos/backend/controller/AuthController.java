package com.biryanipos.backend.controller;

import com.biryanipos.backend.dto.*;
import com.biryanipos.backend.model.AppUser;
import com.biryanipos.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/login")
  public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
    return ResponseEntity.ok(authService.login(request));
  }

  @PostMapping("/change-password")
  public ResponseEntity<Map<String, String>> changePassword(
      @RequestBody ChangePasswordRequest request,
      Authentication auth) {
    if (auth == null) {
      return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
    }
    authService.changePassword(auth.getName(), request);
    return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
  }

  @PostMapping("/create-user")
  public ResponseEntity<AppUser> createUser(@RequestBody CreateUserRequest request) {
    return ResponseEntity.ok(authService.createUser(request));
  }

  @GetMapping("/users")
  public ResponseEntity<List<AppUser>> getAllUsers() {
    return ResponseEntity.ok(authService.getAllUsers());
  }

  @PutMapping("/reset-password/{userId}")
  public ResponseEntity<Map<String, String>> resetPassword(@PathVariable Long userId) {
    authService.resetPassword(userId);
    return ResponseEntity.ok(Map.of("message", "Password reset to default"));
  }

  @PutMapping("/toggle-active/{userId}")
  public ResponseEntity<AppUser> toggleActive(@PathVariable Long userId) {
    return ResponseEntity.ok(authService.toggleUserActive(userId));
  }

  @GetMapping("/me")
  public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication auth) {
    if (auth == null) {
      return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
    }
    return ResponseEntity.ok(Map.of(
        "username", auth.getName(),
        "role", auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")));
  }
}
