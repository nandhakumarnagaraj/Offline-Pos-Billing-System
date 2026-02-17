package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.UserRole;
import lombok.Data;

@Data
public class CreateUserRequest {
  private String username;
  private String displayName;
  private UserRole role;
}
