package com.biryanipos.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class BackupService {

  @Value("${spring.datasource.url}")
  private String dbUrl;

  // Run every day at 11 PM
  @Scheduled(cron = "0 0 23 * * ?")
  public void scheduleBackup() {
    performBackup();
  }

  public String performBackup() {
    try {
      // Extract file path from JDBC URL (jdbc:h2:file:./data/posdb)
      String dbPath = "./data/posdb.mv.db";
      File dbFile = new File(dbPath);

      if (!dbFile.exists()) {
        return "Database file not found at " + dbPath;
      }

      String backupDir = "./backups/";
      Files.createDirectories(Paths.get(backupDir));

      String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
      String backupPath = backupDir + "posdb_backup_" + timestamp + ".mv.db";

      Files.copy(dbFile.toPath(), Paths.get(backupPath), StandardCopyOption.REPLACE_EXISTING);

      return "Backup created successfully at " + backupPath;
    } catch (IOException e) {
      e.printStackTrace();
      return "Backup failed: " + e.getMessage();
    }
  }
}
