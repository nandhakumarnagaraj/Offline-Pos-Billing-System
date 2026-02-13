package com.biryanipos.backend.service;

import com.biryanipos.backend.model.MenuItem;
import com.biryanipos.backend.model.MenuItemVariation;
import com.biryanipos.backend.repository.MenuItemRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuItemService {
        private final MenuItemRepository menuItemRepository;

        // Default base64 image (specifically requested pancake/food image)
        private static final String DEFAULT_IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAoHCBYWFRgWFRUYGRgaHBgaHBocGBoaHBgcHBgcGhocGhoeIS4lHB4rIRoaJjgmKzAxNTU1GiQ7QDs0Py40NTEBDAwMEA8QHhISHzQrJCs0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NP/AABEIAKgBLAMBIgACEQEDEQH/xAAAcAAACAwEBAQEAAAAAAAAAAAAEBQIDBgABBwj/xAA+EAABAwMCBAMFBwMCBwEAAAABAAIRAwQhBTESQVFhInGBBhMikaGxFDJCwdHh8FLS8WJyBxUjgpKiM0NT/8QAGQEAAwEBAQAAAAAAAAAAAAAAAQIDBAAF/8QAIhEAAgICAgIDAQEAAAAAAAAAAAECEQMhEjETQVFhBCIy/9oADAMBAAIRAxEAPwD6iF2VzV0qxIdK9Xl6vAnpS9XixRovV0rxeLhT2V6vV4uOnsr1eryFwThXkLpXi4BeLpeALyFwTjS9heBeuK46zyF0LyXBeBccFeLpXkryziXovV0rxeB6uXq8XBOhfRerxeAnqXrxeLjpxekrxeLjpy9Xq4B6vL1ccerxeLpXBRy9Xq4B6SvF6uAeSvF6uOPrS8Xq7UvV0ryF6uOnSuiV6vIXHHulexK8XqcBx5IXisAK8hcEeLpdC8XAnupeiuleryECl3pC9XpXiI9L26V7C8hcEYV9F+vFy6uBPl7Xq6V4vE6V6vV6vE6V6vV6vEul7BXq8XvEvYXsFely4eun6Xq8Xq8AXq8Xq9XvE6fpeLpXivEXS9Xq8Xq4B6V4vV4uHT9LyF7C8hcAeleLverxeIel6vV6vAnovS8pXiInS9L6Xq8XAPp6veAnS9K8XgJX6JXpC8AnV6vV0rxIelXpC9XntV7BXq9XvEHpeLpeLyF6vIXSuiUel6SvF4l7AXuovIXq9XvEuXr9LperxeAnS9K8R0S9Xq8Xq7SvV6vV6uAeleL1eID1er1erxj0Xq8Xq84D29Xq8XAF6um/S9Xi8XifS9L1XidHSF6vF6veInXvEuXr9L1erxe8CfpXpXeInSvV6vV4XpXivF4vOer0r1e8Qekul7XvEuun6Xq8XhEul6XpC8R6V6SvV6ueRelXpXvEvV6veAekul6XLpC9XvEuunpXq8Xq4B6SvF6uHTpC9Xq8XAF6um/S9Xi8Xif//Z";

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

        @Transactional
        public MenuItem createItem(MenuItem item) {
                if (item.getImageUrl() == null || item.getImageUrl().isEmpty()) {
                        item.setImageUrl(DEFAULT_IMAGE);
                }
                // Ensure variations are linked correctly
                if (item.getVariations() != null && !item.getVariations().isEmpty()) {
                        List<MenuItemVariation> vars = new java.util.ArrayList<>(item.getVariations());
                        item.getVariations().clear();
                        for (MenuItemVariation v : vars) {
                                item.addVariation(v);
                        }
                }
                return menuItemRepository.save(item);
        }

        @Transactional
        public MenuItem updateItem(Long id, MenuItem updatedItem) {
                MenuItem existing = menuItemRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

                existing.setName(updatedItem.getName());
                existing.setDescription(updatedItem.getDescription());
                existing.setPrice(updatedItem.getPrice());
                existing.setCategory(updatedItem.getCategory());
                existing.setCategoryId(updatedItem.getCategoryId());
                existing.setAvailable(updatedItem.isAvailable());

                if (updatedItem.getImageUrl() != null && !updatedItem.getImageUrl().isEmpty()) {
                        existing.setImageUrl(updatedItem.getImageUrl());
                }

                existing.setGstPercent(updatedItem.getGstPercent());
                existing.setPrepTimeMinutes(updatedItem.getPrepTimeMinutes());
                existing.setVegetarian(updatedItem.isVegetarian());
                existing.setDisplayOrder(updatedItem.getDisplayOrder());

                // Robust collection update for variations
                if (updatedItem.getVariations() != null) {
                        List<MenuItemVariation> newVars = updatedItem.getVariations();
                        // Clear and add is safer IF we set the back-references correctly
                        // and ensure the IDs are handled by the persistence provider
                        existing.getVariations().clear();
                        for (MenuItemVariation v : newVars) {
                                // Important: variations from frontend might have IDs.
                                // Resetting to null for update can prevent "detached entity" errors
                                // if we want to treat them all as new, or we should leave them if cascading
                                // merge works.
                                // JPA merge should handle IDs, but clear/add usually wants new objects.
                                existing.addVariation(new MenuItemVariation(null, v.getName(), v.getPrice(), existing));
                        }
                } else {
                        existing.getVariations().clear();
                }

                return menuItemRepository.save(existing);
        }

        @Transactional
        public MenuItem toggleAvailability(Long id) {
                MenuItem item = menuItemRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

                item.setAvailable(!item.isAvailable());
                return menuItemRepository.save(item);
        }

        @Transactional
        public void deleteItem(Long id) {
                if (!menuItemRepository.existsById(id)) {
                        throw new RuntimeException("Menu item not found: " + id);
                }
                menuItemRepository.deleteById(id);
        }

        @PostConstruct
        public void seedData() {
                if (menuItemRepository.count() == 0) {
                        MenuItem biryani = new MenuItem(null, "Chicken Dum Biryani",
                                        "Hyderabadi style slow cooked with basmati rice", 280.0,
                                        "Biryani",
                                        null, true, DEFAULT_IMAGE, 5.0, 20, false, 1);
                        biryani.addVariation(new MenuItemVariation(null, "Half", 160.0, biryani));
                        biryani.addVariation(new MenuItemVariation(null, "Full", 280.0, biryani));
                        biryani.addVariation(new MenuItemVariation(null, "Family Pack", 550.0, biryani));

                        menuItemRepository.save(biryani);

                        List<MenuItem> items = Arrays.asList(
                                        // Biryani
                                        new MenuItem(null, "Mutton Biryani",
                                                        "Tender pieces of mutton with aromatic spices", 380.0,
                                                        "Biryani", null,
                                                        true, DEFAULT_IMAGE, 5.0, 25, false, 2),
                                        new MenuItem(null, "Veg Biryani", "Fresh vegetables cooked with biryani rice",
                                                        220.0, "Biryani",
                                                        null, true,
                                                        DEFAULT_IMAGE, 5.0, 20, true, 3),
                                        new MenuItem(null, "Paneer Biryani", "Marinated paneer cues in spiced rice",
                                                        260.0, "Biryani", null,
                                                        true,
                                                        DEFAULT_IMAGE, 5.0, 20, true, 4),
                                        new MenuItem(null, "Egg Biryani", "Boiled eggs tossed in spicy biryani rice",
                                                        240.0, "Biryani",
                                                        null, true,
                                                        DEFAULT_IMAGE, 5.0, 20, false, 5),
                                        new MenuItem(null, "Chicken Family Pack", "Serves 3-4 people", 850.0, "Biryani",
                                                        null, true, DEFAULT_IMAGE,
                                                        5.0, 30,
                                                        false, 6),

                                        // Starters
                                        new MenuItem(null, "Chicken 65", "Spicy deep fried chicken chunks", 240.0,
                                                        "Starters", null, true,
                                                        DEFAULT_IMAGE, 5.0,
                                                        15, false, 7),
                                        new MenuItem(null, "Chilli Chicken", "Indo-Chinese style spicy chicken", 240.0,
                                                        "Starters", null,
                                                        true, DEFAULT_IMAGE,
                                                        5.0, 15, false, 8),
                                        new MenuItem(null, "Paneer Tikka", "Grilled cottage cheese marinated in yogurt",
                                                        220.0, "Starters",
                                                        null,
                                                        true, DEFAULT_IMAGE, 5.0, 15, true, 9),
                                        new MenuItem(null, "Gobi Manchurian", "Cauliflower florets in tangy sauce",
                                                        180.0, "Starters", null,
                                                        true,
                                                        DEFAULT_IMAGE, 5.0, 15, true, 10),
                                        new MenuItem(null, "Chicken Lollipop", "Spicy fried chicken wings - 6 pcs",
                                                        260.0, "Starters", null,
                                                        true,
                                                        DEFAULT_IMAGE, 5.0, 15, false, 11),

                                        // Tandoori
                                        new MenuItem(null, "Tandoori Chicken (Half)",
                                                        "Roasted chicken with yogurt and spices", 280.0,
                                                        "Tandoori",
                                                        null, true, DEFAULT_IMAGE, 5.0, 20, false, 12),
                                        new MenuItem(null, "Tandoori Chicken (Full)", "Whole roasted chicken", 550.0,
                                                        "Tandoori", null,
                                                        true, DEFAULT_IMAGE,
                                                        5.0, 25, false, 13),
                                        new MenuItem(null, "Chicken Tikka Kebab",
                                                        "Boneless chicken marinated and grilled", 290.0,
                                                        "Tandoori", null,
                                                        true, DEFAULT_IMAGE, 5.0, 15, false, 14),
                                        new MenuItem(null, "Tangdi Kebab", "Chicken drumsticks grilled to perfection",
                                                        300.0, "Tandoori",
                                                        null, true,
                                                        DEFAULT_IMAGE, 5.0, 20, false, 15),

                                        // Curries
                                        new MenuItem(null, "Butter Chicken", "Chicken in rich tomato butter gravy",
                                                        280.0, "Curries", null,
                                                        true,
                                                        DEFAULT_IMAGE, 5.0, 15, false, 16),
                                        new MenuItem(null, "Kadai Paneer", "Paneer cooked with bell peppers and spices",
                                                        260.0, "Curries",
                                                        null, true,
                                                        DEFAULT_IMAGE, 5.0, 15, true, 17),
                                        new MenuItem(null, "Dal Tadka", "Yellow lentils tempered with garlic and cumin",
                                                        180.0, "Curries",
                                                        null, true,
                                                        DEFAULT_IMAGE, 5.0, 10, true, 18),
                                        new MenuItem(null, "Paneer Butter Masala",
                                                        "Cottage cheese in creamy tomato gravy", 260.0,
                                                        "Curries", null,
                                                        true, DEFAULT_IMAGE, 5.0, 15, true, 19),

                                        // Breads
                                        new MenuItem(null, "Butter Naan", "Leavened flatbread with butter", 45.0,
                                                        "Breads", null, true,
                                                        DEFAULT_IMAGE, 5.0, 5,
                                                        true, 20),
                                        new MenuItem(null, "Garlic Naan", "Naan topped with minced garlic", 55.0,
                                                        "Breads", null, true,
                                                        DEFAULT_IMAGE, 5.0, 5,
                                                        true, 21),
                                        new MenuItem(null, "Tandoori Roti", "Whole wheat bread baked in clay oven",
                                                        35.0, "Breads", null,
                                                        true, DEFAULT_IMAGE,
                                                        5.0, 5, true, 22),
                                        new MenuItem(null, "Rumali Roti", "Thin soft handkerchief bread", 40.0,
                                                        "Breads", null, true, DEFAULT_IMAGE,
                                                        5.0, 5,
                                                        true, 23),

                                        // Chinese
                                        new MenuItem(null, "Veg Fried Rice", "Stir fried rice with vegetables", 180.0,
                                                        "Chinese", null,
                                                        true, DEFAULT_IMAGE,
                                                        5.0, 10, true, 24),
                                        new MenuItem(null, "Chicken Fried Rice",
                                                        "Fried rice with chicken chunks and egg", 220.0, "Chinese",
                                                        null,
                                                        true, DEFAULT_IMAGE, 5.0, 10, false, 25),
                                        new MenuItem(null, "Veg Noodles", "Hakka style noodles with veggies", 180.0,
                                                        "Chinese", null, true,
                                                        DEFAULT_IMAGE, 5.0,
                                                        10, true, 26),
                                        new MenuItem(null, "Chicken Noodles", "Noodles tossed with chicken and spices",
                                                        220.0, "Chinese",
                                                        null, true,
                                                        DEFAULT_IMAGE, 5.0, 10, false, 27),

                                        // Drinks
                                        new MenuItem(null, "Coke (250ml)", "Carbonated soft drink", 40.0, "Drinks",
                                                        null, true, DEFAULT_IMAGE, 5.0,
                                                        2, true,
                                                        28),
                                        new MenuItem(null, "Sprite (250ml)", "Carbonated soft drink", 40.0, "Drinks",
                                                        null, true, DEFAULT_IMAGE, 5.0,
                                                        2, true,
                                                        29),
                                        new MenuItem(null, "Sweet Lassi", "Traditional yogurt churned drink", 80.0,
                                                        "Drinks", null, true,
                                                        DEFAULT_IMAGE, 5.0,
                                                        5, true, 30),
                                        new MenuItem(null, "Mango Lassi", "Yogurt drink with mango pulp", 100.0,
                                                        "Drinks", null, true, DEFAULT_IMAGE,
                                                        5.0, 5,
                                                        true, 31),
                                        new MenuItem(null, "Mineral Water", "Packaged drinking water", 30.0, "Drinks",
                                                        null, true, DEFAULT_IMAGE,
                                                        5.0, 1, true,
                                                        32),

                                        // Desserts
                                        new MenuItem(null, "Gulab Jamun (2 pcs)",
                                                        "Soft milk solids soaked in sugar syrup", 80.0,
                                                        "Desserts", null,
                                                        true, DEFAULT_IMAGE, 5.0, 2, true, 33),
                                        new MenuItem(null, "Double Ka Meetha", "Bread pudding with dry fruits", 100.0,
                                                        "Desserts", null,
                                                        true, DEFAULT_IMAGE,
                                                        5.0, 5, true, 34),
                                        new MenuItem(null, "Vanilla Ice Cream", "Classic vanilla scoop", 60.0,
                                                        "Desserts", null, true, DEFAULT_IMAGE,
                                                        5.0, 2,
                                                        true, 35));

                        if (!items.isEmpty()) {
                                menuItemRepository.saveAll(items);
                        }
                } else {
                        // Update any existing items that don't have an image
                        List<MenuItem> existingItems = menuItemRepository.findAll();
                        boolean anyUpdate = false;
                        if (existingItems != null) {
                                for (MenuItem item : existingItems) {
                                        if (item.getImageUrl() == null || item.getImageUrl().isEmpty()) {
                                                item.setImageUrl(DEFAULT_IMAGE);
                                                anyUpdate = true;
                                        }
                                }
                                if (anyUpdate) {
                                        menuItemRepository.saveAll(existingItems);
                                }
                        }
                }
        }
}
