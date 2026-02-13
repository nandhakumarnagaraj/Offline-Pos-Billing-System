package com.biryanipos.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

import lombok.extern.slf4j.Slf4j;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class BackupService {

  @Value("${spring.datasource.url}")
  private String dbUrl;

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
      // Extract file path from JDBC URL (e.g.,
      // jdbc:h2:file:./data/posdb;AUTO_SERVER=TRUE)
      // Remove "jdbc:h2:file:" prefix and any parameters after ";"
      String dbPath = dbUrl.replace("jdbc:h2:file:", "").split(";")[0] + ".mv.db";
      File dbFile = new File(dbPath);

      if (!dbFile.exists()) {
        log.error("Database file not found at: {}", dbPath);
        return "Database file not found at " + dbPath;
      }

      Files.createDirectories(Paths.get(BACKUP_DIR));

      String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
      String backupFileName = "posdb_backup_" + timestamp + ".mv.db";
      Path backupPath = Paths.get(BACKUP_DIR + backupFileName);

      // Perform copy
      Files.copy(dbFile.toPath(), backupPath, StandardCopyOption.REPLACE_EXISTING);
      log.info("Backup created successfully: {}", backupPath);

      return backupFileName;
    } catch (IOException e) {
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

      File[] files = backupDir.listFiles((dir, name) -> name.endsWith(".mv.db"));
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

      File[] files = backupDir.listFiles((dir, name) -> name.endsWith(".mv.db"));
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
