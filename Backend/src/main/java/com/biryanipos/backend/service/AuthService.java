package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.*;
import com.biryanipos.backend.model.AppUser;
import com.biryanipos.backend.model.UserRole;
import com.biryanipos.backend.repository.UserRepository;
import com.biryanipos.backend.security.JwtUtil;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtUtil jwtUtil;

  private static final String DEFAULT_PASSWORD = "welcome123";

  /**
   * Login — returns JWT + mustChangePassword flag
   */
  public LoginResponse login(LoginRequest request) {
    AppUser user = userRepository.findByUsername(request.getUsername())
        .orElseThrow(() -> new RuntimeException("Invalid username or password"));

    if (!user.isActive()) {
      throw new RuntimeException("Account is disabled. Contact your manager.");
    }

    if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
      throw new RuntimeException("Invalid username or password");
    }

    // Update last login
    user.setLastLoginAt(LocalDateTime.now());
    userRepository.save(user);

    String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());

    return new LoginResponse(
        token,
        user.getUsername(),
        user.getDisplayName(),
        user.getRole().name(),
        user.isMustChangePassword());
  }

  /**
   * Change password — for both forced reset (first login) and voluntary change.
   * Requires the current password for verification.
   */
  public void changePassword(String username, ChangePasswordRequest request) {
    AppUser user = userRepository.findByUsername(username)
        .orElseThrow(() -> new RuntimeException("User not found"));

    if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
      throw new RuntimeException("Current password is incorrect");
    }

    if (request.getNewPassword() == null || request.getNewPassword().length() < 4) {
      throw new RuntimeException("New password must be at least 4 characters");
    }

    user.setPassword(passwordEncoder.encode(request.getNewPassword()));
    user.setMustChangePassword(false);
    userRepository.save(user);
  }

  /**
   * Manager creates a new user with default password.
   * The user must change it on first login.
   */
  public AppUser createUser(CreateUserRequest request) {
    if (userRepository.existsByUsername(request.getUsername())) {
      throw new RuntimeException("Username already exists: " + request.getUsername());
    }

    AppUser user = new AppUser();
    user.setUsername(request.getUsername());
    user.setDisplayName(request.getDisplayName());
    user.setRole(request.getRole());
    user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
    user.setMustChangePassword(true);
    user.setActive(true);

    return userRepository.save(user);
  }

  /**
   * Manager resets a user's password back to default.
   */
  public void resetPassword(Long userId) {
    AppUser user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));

    user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
    user.setMustChangePassword(true);
    userRepository.save(user);
  }

  /**
   * Toggle user active/disabled
   */
  public AppUser toggleUserActive(Long userId) {
    AppUser user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));
    user.setActive(!user.isActive());
    return userRepository.save(user);
  }

  public List<AppUser> getAllUsers() {
    return userRepository.findAll();
  }

  /**
   * Seed default admin on first boot
   */
  @PostConstruct
  public void seedAdmin() {
    if (userRepository.count() == 0) {
      AppUser admin = new AppUser();
      admin.setUsername("admin");
      admin.setDisplayName("Administrator");
      admin.setRole(UserRole.ADMIN);
      admin.setPassword(passwordEncoder.encode("admin123"));
      admin.setMustChangePassword(false); // Admin default can be used directly
      admin.setActive(true);
      userRepository.save(admin);

      // Also create a demo manager
      AppUser manager = new AppUser();
      manager.setUsername("manager");
      manager.setDisplayName("Manager");
      manager.setRole(UserRole.MANAGER);
      manager.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
      manager.setMustChangePassword(true);
      manager.setActive(true);
      userRepository.save(manager);
    }
  }
}
