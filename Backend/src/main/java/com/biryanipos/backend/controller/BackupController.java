package com.biryanipos.backend.controller;

import com.biryanipos.backend.service.BackupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
public class BackupController {

  private final BackupService backupService;

  @PostMapping("/now")
  public ResponseEntity<String> triggerBackup() {
    String file = backupService.performBackup();
    if (file.startsWith("Backup failed") || file.startsWith("Database file not found")) {
      return ResponseEntity.internalServerError().body(file);
    }
    return ResponseEntity.ok("Backup successful. Filename: " + file);
  }

  @GetMapping
  public ResponseEntity<List<String>> listBackups() {
    return ResponseEntity.ok(backupService.listBackups());
  }
}
