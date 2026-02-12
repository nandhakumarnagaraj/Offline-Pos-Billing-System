package com.biryanipos.backend.controller;

import com.biryanipos.backend.service.BackupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemController {

  private final BackupService backupService;

  @PostMapping("/backup")
  public ResponseEntity<String> triggerBackup() {
    String result = backupService.performBackup();
    if (result.startsWith("Backup created")) {
      return ResponseEntity.ok(result);
    } else {
      return ResponseEntity.internalServerError().body(result);
    }
  }
}
