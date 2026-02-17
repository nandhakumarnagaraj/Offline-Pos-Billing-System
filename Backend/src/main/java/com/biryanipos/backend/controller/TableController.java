package com.biryanipos.backend.controller;

import com.biryanipos.backend.model.RestaurantTable;
import com.biryanipos.backend.model.TableStatus;
import com.biryanipos.backend.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class TableController {

  private final TableService tableService;

  @GetMapping
  public ResponseEntity<List<RestaurantTable>> getAllTables() {
    return ResponseEntity.ok(tableService.getAllTables());
  }

  @GetMapping("/available")
  public ResponseEntity<List<RestaurantTable>> getAvailableTables() {
    return ResponseEntity.ok(tableService.getAvailableTables());
  }

  @GetMapping("/number/{tableNumber}")
  public ResponseEntity<RestaurantTable> getTableByNumber(@PathVariable String tableNumber) {
    return ResponseEntity.ok(tableService.getTableByNumber(tableNumber));
  }

  @PostMapping
  public ResponseEntity<RestaurantTable> createTable(@RequestBody RestaurantTable table) {
    return ResponseEntity.ok(tableService.createTable(table));
  }

  @PutMapping("/{id}")
  public ResponseEntity<RestaurantTable> updateTable(@PathVariable Long id, @RequestBody RestaurantTable table) {
    return ResponseEntity.ok(tableService.updateTable(id, table));
  }

  @PutMapping("/{id}/status")
  public ResponseEntity<RestaurantTable> updateStatus(@PathVariable Long id, @RequestParam TableStatus status) {
    return ResponseEntity.ok(tableService.updateStatus(id, status));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
    tableService.deleteTable(id);
    return ResponseEntity.ok().build();
  }
}
