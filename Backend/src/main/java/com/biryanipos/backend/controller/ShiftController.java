package com.biryanipos.backend.controller;

import com.biryanipos.backend.model.Shift;
import com.biryanipos.backend.service.ShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
public class ShiftController {
  private final ShiftService shiftService;

  @GetMapping("/active")
  public ResponseEntity<Shift> getActiveShift() {
    return shiftService.getActiveShift()
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.noContent().build());
  }

  @PostMapping("/open")
  public ResponseEntity<Shift> openShift(@RequestParam String user, @RequestParam double openingCash) {
    return ResponseEntity.ok(shiftService.openShift(user, openingCash));
  }

  @GetMapping("/x-report")
  public ResponseEntity<Shift> getXReport() {
    return ResponseEntity.ok(shiftService.generateXReport());
  }

  @PostMapping("/close")
  public ResponseEntity<Shift> closeShift(@RequestParam String user, @RequestParam double actualCash) {
    return ResponseEntity.ok(shiftService.closeShift(user, actualCash));
  }
}
