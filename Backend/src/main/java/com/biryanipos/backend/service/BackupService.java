package com.biryanipos.backend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;

import lombok.extern.slf4j.Slf4j;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class BackupService {

  private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

  public BackupService(org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  private static final String BACKUP_DIR = "./backups/";
  private static final int MAX_BACKUP_DAYS = 7;

  // Run every day at 2 AM
  @Scheduled(cron = "0 0 2 * * ?")
  public void scheduleBackup() {
    log.info("Starting scheduled database backup...");
    performBackup();
    cleanupOldBackups();
  }

  public String performBackup() {
    try {
      Files.createDirectories(Paths.get(BACKUP_DIR));

      String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
      String backupFileName = "posdb_backup_" + timestamp + ".zip";
      String backupFilePath = new File(BACKUP_DIR + backupFileName).getAbsolutePath();

      // Use H2's native BACKUP TO which handles live files safely
      jdbcTemplate.execute("BACKUP TO '" + backupFilePath + "'");

      log.info("Safe H2 backup created at: {}", backupFilePath);
      return backupFileName;
    } catch (Exception e) {
      log.error("Backup failed", e);
      return "Backup failed: " + e.getMessage();
    }
  }

  private void cleanupOldBackups() {
    try {
      File backupDir = new File(BACKUP_DIR);
      if (!backupDir.exists() || !backupDir.isDirectory()) {
        return;
      }

      File[] files = backupDir.listFiles((dir, name) -> name.endsWith(".zip"));
      if (files == null)
        return;

      long cutoffTime = System.currentTimeMillis() - (MAX_BACKUP_DAYS * 24 * 60 * 60 * 1000L);

      for (File file : files) {
        if (file.lastModified() < cutoffTime) {
          if (file.delete()) {
            log.info("Deleted old backup: {}", file.getName());
          } else {
            log.warn("Failed to delete old backup: {}", file.getName());
          }
        }
      }
    } catch (Exception e) {
      log.error("Error cleaning up old backups", e);
    }
  }

  public java.util.List<String> listBackups() {
    try {
      File backupDir = new File(BACKUP_DIR);
      if (!backupDir.exists() || !backupDir.isDirectory()) {
        return java.util.Collections.emptyList();
      }

      File[] files = backupDir.listFiles((dir, name) -> name.endsWith(".zip"));
      if (files == null)
        return java.util.Collections.emptyList();

      return java.util.Arrays.stream(files)
          .sorted((f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified())) // Newest first
          .map(File::getName)
          .collect(java.util.stream.Collectors.toList());
    } catch (Exception e) {
      log.error("Error listing backups", e);
      return java.util.Collections.emptyList();
    }
  }
}
