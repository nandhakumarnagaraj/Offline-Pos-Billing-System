package com.biryanipos.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
  private String token;
  private String username;
  private String displayName;
  private String role;
  private boolean mustChangePassword;
}
