package com.biryanipos.backend.controller;

import com.biryanipos.backend.dto.DashboardData;
import com.biryanipos.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

  private final ReportService reportService;

  @GetMapping("/dashboard")
  public ResponseEntity<DashboardData> getDashboard() {
    return ResponseEntity.ok(reportService.getDashboardData());
  }

  @GetMapping("/sales")
  public ResponseEntity<Map<String, Object>> getSalesReport(
      @RequestParam String start,
      @RequestParam String end) {
    return ResponseEntity.ok(reportService.getSalesReport(
        LocalDate.parse(start), LocalDate.parse(end)));
  }

  @GetMapping("/daily")
  public ResponseEntity<Map<String, Object>> getDailyReport() {
    LocalDate today = LocalDate.now();
    return ResponseEntity.ok(reportService.getSalesReport(today, today));
  }

  @GetMapping("/gst-export")
  public ResponseEntity<String> getGstReport(@RequestParam String start, @RequestParam String end) {
    String csv = reportService.generateGstReportCsv(LocalDate.parse(start), LocalDate.parse(end));
    return ResponseEntity.ok()
        .header("Content-Disposition", "attachment; filename=gst_report.csv")
        .body(csv);
  }
}
