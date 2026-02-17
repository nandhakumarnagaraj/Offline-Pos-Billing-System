package com.biryanipos.backend.dto;

import com.biryanipos.backend.model.AppUser;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserActionResponse {
  private AppUser user;
  private String generatedPassword;
  private String message;
}
