package com.biryanipos.backend.service;

import com.biryanipos.backend.model.RestaurantTable;
import com.biryanipos.backend.model.TableStatus;
import com.biryanipos.backend.repository.TableRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TableService {
  private final TableRepository tableRepository;
  private final SimpMessagingTemplate messagingTemplate;

  public List<RestaurantTable> getAllTables() {
    return tableRepository.findAllByOrderByTableNumberAsc();
  }

  public List<RestaurantTable> getAvailableTables() {
    return tableRepository.findByStatus(TableStatus.AVAILABLE);
  }

  public RestaurantTable getTableByNumber(String tableNumber) {
    return tableRepository.findByTableNumber(tableNumber)
        .orElseThrow(() -> new RuntimeException("Table not found: " + tableNumber));
  }

  public RestaurantTable createTable(RestaurantTable table) {
    return tableRepository.save(table);
  }

  public RestaurantTable updateTable(Long id, RestaurantTable updated) {
    RestaurantTable existing = tableRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Table not found: " + id));
    existing.setTableNumber(updated.getTableNumber());
    existing.setCapacity(updated.getCapacity());
    return tableRepository.save(existing);
  }

  public RestaurantTable updateStatus(Long id, TableStatus status) {
    RestaurantTable table = tableRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Table not found: " + id));
    table.setStatus(status);
    if (status == TableStatus.AVAILABLE) {
      table.setCurrentOrderId(null);
    }
    RestaurantTable saved = tableRepository.save(table);
    messagingTemplate.convertAndSend("/topic/tables", "TABLE_UPDATE");
    return saved;
  }

  public void deleteTable(Long id) {
    tableRepository.deleteById(id);
  }

  @PostConstruct
  public void seedTables() {
    if (tableRepository.count() == 0) {
      for (int i = 1; i <= 10; i++) {
        RestaurantTable table = new RestaurantTable();
        table.setTableNumber("T" + i);
        table.setCapacity(i <= 6 ? 4 : 6); // First 6 tables seat 4, rest seat 6
        table.setStatus(TableStatus.AVAILABLE);
        tableRepository.save(table);
      }
    }
  }
}
