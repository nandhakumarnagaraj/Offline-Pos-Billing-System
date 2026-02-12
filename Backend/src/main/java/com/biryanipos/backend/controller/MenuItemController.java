package com.biryanipos.backend.controller;

import com.biryanipos.backend.model.MenuItem;
import com.biryanipos.backend.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/menu-items")
@RequiredArgsConstructor
public class MenuItemController {

  private final MenuItemService menuItemService;

  @PostMapping("/seed")
  public ResponseEntity<String> seedData() {
    menuItemService.seedData();
    return ResponseEntity.ok("Menu items seeded (if table was empty)");
  }

  @GetMapping
  public ResponseEntity<List<MenuItem>> getAllItems() {
    return ResponseEntity.ok(menuItemService.getAllItems());
  }

  @GetMapping("/available")
  public ResponseEntity<List<MenuItem>> getAvailableItems() {
    return ResponseEntity.ok(menuItemService.getAvailableItems());
  }

  @GetMapping("/category/{category}")
  public ResponseEntity<List<MenuItem>> getByCategory(@PathVariable String category) {
    return ResponseEntity.ok(menuItemService.getItemsByCategory(category));
  }

  @GetMapping("/search")
  public ResponseEntity<List<MenuItem>> searchItems(@RequestParam String q) {
    return ResponseEntity.ok(menuItemService.searchItems(q));
  }

  @GetMapping("/{id}")
  public ResponseEntity<MenuItem> getItem(@PathVariable Long id) {
    return ResponseEntity.ok(menuItemService.getItemById(id));
  }

  @PostMapping
  public ResponseEntity<MenuItem> createItem(@RequestBody MenuItem item) {
    return ResponseEntity.ok(menuItemService.createItem(item));
  }

  @PutMapping("/{id}")
  public ResponseEntity<MenuItem> updateItem(@PathVariable Long id, @RequestBody MenuItem item) {
    return ResponseEntity.ok(menuItemService.updateItem(id, item));
  }

  @PutMapping("/{id}/toggle-availability")
  public ResponseEntity<MenuItem> toggleAvailability(@PathVariable Long id) {
    return ResponseEntity.ok(menuItemService.toggleAvailability(id));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
    menuItemService.deleteItem(id);
    return ResponseEntity.ok().build();
  }
}
