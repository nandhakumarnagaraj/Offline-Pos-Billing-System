package com.biryanipos.backend.service;

import com.biryanipos.backend.model.MenuItem;
import com.biryanipos.backend.repository.MenuItemRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuItemService {
  private final MenuItemRepository menuItemRepository;

  public List<MenuItem> getAllItems() {
    return menuItemRepository.findAll();
  }

  public List<MenuItem> getAvailableItems() {
    return menuItemRepository.findByAvailableTrue();
  }

  public List<MenuItem> getItemsByCategory(String category) {
    return menuItemRepository.findByCategory(category);
  }

  public List<MenuItem> searchItems(String query) {
    return menuItemRepository.searchByName(query);
  }

  public MenuItem getItemById(Long id) {
    return menuItemRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));
  }

  public MenuItem createItem(MenuItem item) {
    return menuItemRepository.save(item);
  }

  public MenuItem updateItem(Long id, MenuItem updatedItem) {
    MenuItem existing = menuItemRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

    existing.setName(updatedItem.getName());
    existing.setDescription(updatedItem.getDescription());
    existing.setPrice(updatedItem.getPrice());
    existing.setCategory(updatedItem.getCategory());
    existing.setCategoryId(updatedItem.getCategoryId());
    existing.setAvailable(updatedItem.isAvailable());
    existing.setImageUrl(updatedItem.getImageUrl());
    existing.setGstPercent(updatedItem.getGstPercent());
    existing.setPrepTimeMinutes(updatedItem.getPrepTimeMinutes());
    existing.setVegetarian(updatedItem.isVegetarian());
    existing.setDisplayOrder(updatedItem.getDisplayOrder());

    return menuItemRepository.save(existing);
  }

  public MenuItem toggleAvailability(Long id) {
    MenuItem item = menuItemRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

    item.setAvailable(!item.isAvailable());
    return menuItemRepository.save(item);
  }

  public void deleteItem(Long id) {
    if (!menuItemRepository.existsById(id)) {
      throw new RuntimeException("Menu item not found: " + id);
    }
    menuItemRepository.deleteById(id);
  }

  @PostConstruct
  public void seedData() {
    if (menuItemRepository.count() == 0) {
      List<MenuItem> items = Arrays.asList(
          // Biryani
          new MenuItem(null, "Chicken Dum Biryani", "Hyderabadi style slow cooked with basmati rice", 280.0, "Biryani",
              null, true, null, 5.0, 20, false, 1),
          new MenuItem(null, "Mutton Biryani", "Tender pieces of mutton with aromatic spices", 380.0, "Biryani", null,
              true, null, 5.0, 25, false, 2),
          new MenuItem(null, "Veg Biryani", "Fresh vegetables cooked with biryani rice", 220.0, "Biryani", null, true,
              null, 5.0, 20, true, 3),
          new MenuItem(null, "Paneer Biryani", "Marinated paneer cues in spiced rice", 260.0, "Biryani", null, true,
              null, 5.0, 20, true, 4),
          new MenuItem(null, "Egg Biryani", "Boiled eggs tossed in spicy biryani rice", 240.0, "Biryani", null, true,
              null, 5.0, 20, false, 5),
          new MenuItem(null, "Chicken Family Pack", "Serves 3-4 people", 850.0, "Biryani", null, true, null, 5.0, 30,
              false, 6),

          // Starters
          new MenuItem(null, "Chicken 65", "Spicy deep fried chicken chunks", 240.0, "Starters", null, true, null, 5.0,
              15, false, 7),
          new MenuItem(null, "Chilli Chicken", "Indo-Chinese style spicy chicken", 240.0, "Starters", null, true, null,
              5.0, 15, false, 8),
          new MenuItem(null, "Paneer Tikka", "Grilled cottage cheese marinated in yogurt", 220.0, "Starters", null,
              true, null, 5.0, 15, true, 9),
          new MenuItem(null, "Gobi Manchurian", "Cauliflower florets in tangy sauce", 180.0, "Starters", null, true,
              null, 5.0, 15, true, 10),
          new MenuItem(null, "Chicken Lollipop", "Spicy fried chicken wings - 6 pcs", 260.0, "Starters", null, true,
              null, 5.0, 15, false, 11),

          // Tandoori
          new MenuItem(null, "Tandoori Chicken (Half)", "Roasted chicken with yogurt and spices", 280.0, "Tandoori",
              null, true, null, 5.0, 20, false, 12),
          new MenuItem(null, "Tandoori Chicken (Full)", "Whole roasted chicken", 550.0, "Tandoori", null, true, null,
              5.0, 25, false, 13),
          new MenuItem(null, "Chicken Tikka Kebab", "Boneless chicken marinated and grilled", 290.0, "Tandoori", null,
              true, null, 5.0, 15, false, 14),
          new MenuItem(null, "Tangdi Kebab", "Chicken drumsticks grilled to perfection", 300.0, "Tandoori", null, true,
              null, 5.0, 20, false, 15),

          // Curries
          new MenuItem(null, "Butter Chicken", "Chicken in rich tomato butter gravy", 280.0, "Curries", null, true,
              null, 5.0, 15, false, 16),
          new MenuItem(null, "Kadai Paneer", "Paneer cooked with bell peppers and spices", 260.0, "Curries", null, true,
              null, 5.0, 15, true, 17),
          new MenuItem(null, "Dal Tadka", "Yellow lentils tempered with garlic and cumin", 180.0, "Curries", null, true,
              null, 5.0, 10, true, 18),
          new MenuItem(null, "Paneer Butter Masala", "Cottage cheese in creamy tomato gravy", 260.0, "Curries", null,
              true, null, 5.0, 15, true, 19),

          // Breads
          new MenuItem(null, "Butter Naan", "Leavened flatbread with butter", 45.0, "Breads", null, true, null, 5.0, 5,
              true, 20),
          new MenuItem(null, "Garlic Naan", "Naan topped with minced garlic", 55.0, "Breads", null, true, null, 5.0, 5,
              true, 21),
          new MenuItem(null, "Tandoori Roti", "Whole wheat bread baked in clay oven", 35.0, "Breads", null, true, null,
              5.0, 5, true, 22),
          new MenuItem(null, "Rumali Roti", "Thin soft handkerchief bread", 40.0, "Breads", null, true, null, 5.0, 5,
              true, 23),

          // Chinese
          new MenuItem(null, "Veg Fried Rice", "Stir fried rice with vegetables", 180.0, "Chinese", null, true, null,
              5.0, 10, true, 24),
          new MenuItem(null, "Chicken Fried Rice", "Fried rice with chicken chunks and egg", 220.0, "Chinese", null,
              true, null, 5.0, 10, false, 25),
          new MenuItem(null, "Veg Noodles", "Hakka style noodles with veggies", 180.0, "Chinese", null, true, null, 5.0,
              10, true, 26),
          new MenuItem(null, "Chicken Noodles", "Noodles tossed with chicken and spices", 220.0, "Chinese", null, true,
              null, 5.0, 10, false, 27),

          // Drinks
          new MenuItem(null, "Coke (250ml)", "Carbonated soft drink", 40.0, "Drinks", null, true, null, 5.0, 2, true,
              28),
          new MenuItem(null, "Sprite (250ml)", "Carbonated soft drink", 40.0, "Drinks", null, true, null, 5.0, 2, true,
              29),
          new MenuItem(null, "Sweet Lassi", "Traditional yogurt churned drink", 80.0, "Drinks", null, true, null, 5.0,
              5, true, 30),
          new MenuItem(null, "Mango Lassi", "Yogurt drink with mango pulp", 100.0, "Drinks", null, true, null, 5.0, 5,
              true, 31),
          new MenuItem(null, "Mineral Water", "Packaged drinking water", 30.0, "Drinks", null, true, null, 5.0, 1, true,
              32),

          // Desserts
          new MenuItem(null, "Gulab Jamun (2 pcs)", "Soft milk solids soaked in sugar syrup", 80.0, "Desserts", null,
              true, null, 5.0, 2, true, 33),
          new MenuItem(null, "Double Ka Meetha", "Bread pudding with dry fruits", 100.0, "Desserts", null, true, null,
              5.0, 5, true, 34),
          new MenuItem(null, "Vanilla Ice Cream", "Classic vanilla scoop", 60.0, "Desserts", null, true, null, 5.0, 2,
              true, 35));

      menuItemRepository.saveAll(items);
    }
  }
}
