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
    menuItemService.deactivateItem(id);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/costing")
  public ResponseEntity<List<com.biryanipos.backend.dto.RecipeCostingDto>> getAllCosting() {
    return ResponseEntity.ok(menuItemService.getAllRecipeCosting());
  }

  @GetMapping("/{id}/costing")
  public ResponseEntity<com.biryanipos.backend.dto.RecipeCostingDto> getItemCosting(@PathVariable Long id) {
    return ResponseEntity.ok(menuItemService.getRecipeCosting(id));
  }

  @PutMapping("/{id}/recipe")
  public ResponseEntity<com.biryanipos.backend.dto.RecipeCostingDto> updateRecipe(
      @PathVariable Long id,
      @RequestBody java.util.List<com.biryanipos.backend.dto.RecipeIngredientRequest> ingredients) {
    menuItemService.updateRecipe(id, ingredients);
    return ResponseEntity.ok(menuItemService.getRecipeCosting(id));
  }

  @PostMapping("/{id}/recipe/ingredient")
  public ResponseEntity<com.biryanipos.backend.dto.RecipeCostingDto> addIngredient(
      @PathVariable Long id,
      @RequestBody com.biryanipos.backend.dto.RecipeIngredientRequest request) {
    menuItemService.addIngredientToRecipe(id, request);
    return ResponseEntity.ok(menuItemService.getRecipeCosting(id));
  }

  @DeleteMapping("/{menuItemId}/recipe/ingredient/{ingredientId}")
  public ResponseEntity<com.biryanipos.backend.dto.RecipeCostingDto> removeIngredient(
      @PathVariable Long menuItemId,
      @PathVariable Long ingredientId) {
    menuItemService.removeIngredientFromRecipe(menuItemId, ingredientId);
    return ResponseEntity.ok(menuItemService.getRecipeCosting(menuItemId));
  }

  @DeleteMapping("/{id}/recipe")
  public ResponseEntity<Void> clearRecipe(@PathVariable Long id) {
    menuItemService.clearRecipe(id);
    return ResponseEntity.ok().build();
  }
}
