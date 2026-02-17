package com.biryanipos.backend.service;

import com.biryanipos.backend.dto.RecipeCostingDto;
import com.biryanipos.backend.dto.RecipeIngredientRequest;
import com.biryanipos.backend.model.MenuItem;
import com.biryanipos.backend.model.MenuItemIngredient;
import com.biryanipos.backend.model.MenuItemVariation;
import com.biryanipos.backend.model.StockItem;
import com.biryanipos.backend.repository.MenuItemRepository;
import com.biryanipos.backend.repository.StockItemRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuItemService {
        private final MenuItemRepository menuItemRepository;
        private final StockItemRepository stockItemRepository;

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
                if (item == null) {
                        throw new RuntimeException("Menu item data is required");
                }
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
                if (id == null) {
                        throw new RuntimeException("Menu item ID is required");
                }
                if (updatedItem == null) {
                        throw new RuntimeException("Updated menu item data is required");
                }
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
                existing.setTrackStock(updatedItem.isTrackStock());
                existing.setStockLevel(updatedItem.getStockLevel());

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
                if (id == null) {
                        throw new RuntimeException("Menu item ID is required");
                }
                MenuItem item = menuItemRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

                item.setAvailable(!item.isAvailable());
                return menuItemRepository.save(item);
        }

        @Transactional
        public void deactivateItem(Long id) {
                if (id == null) {
                        throw new RuntimeException("Menu item ID is required");
                }
                MenuItem item = menuItemRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Menu item not found: " + id));

                item.setAvailable(false);
                menuItemRepository.save(item);
        }

        @Transactional
        public MenuItem updateRecipe(Long menuItemId, List<RecipeIngredientRequest> ingredients) {
                MenuItem item = menuItemRepository.findById(menuItemId)
                                .orElseThrow(() -> new RuntimeException("Menu item not found: " + menuItemId));
                item.getIngredients().clear();
                if (ingredients != null) {
                        for (RecipeIngredientRequest req : ingredients) {
                                StockItem stock = stockItemRepository.findById(req.getStockItemId())
                                                .orElseThrow(() -> new RuntimeException(
                                                                "Stock item not found: " + req.getStockItemId()));
                                MenuItemIngredient ing = new MenuItemIngredient();
                                ing.setStockItem(stock);
                                ing.setQuantity(req.getQuantity());
                                item.addIngredient(ing);
                        }
                }
                return menuItemRepository.save(item);
        }

        @Transactional
        public MenuItem addIngredientToRecipe(Long menuItemId, RecipeIngredientRequest request) {
                MenuItem item = menuItemRepository.findById(menuItemId)
                                .orElseThrow(() -> new RuntimeException("Menu item not found: " + menuItemId));
                StockItem stock = stockItemRepository.findById(request.getStockItemId())
                                .orElseThrow(() -> new RuntimeException(
                                                "Stock item not found: " + request.getStockItemId()));
                MenuItemIngredient ing = new MenuItemIngredient();
                ing.setStockItem(stock);
                ing.setQuantity(request.getQuantity());
                item.addIngredient(ing);
                return menuItemRepository.save(item);
        }

        @Transactional
        public MenuItem removeIngredientFromRecipe(Long menuItemId, Long ingredientId) {
                MenuItem item = menuItemRepository.findById(menuItemId)
                                .orElseThrow(() -> new RuntimeException("Menu item not found: " + menuItemId));
                item.getIngredients().removeIf(ing -> ing.getId().equals(ingredientId));
                return menuItemRepository.save(item);
        }

        @Transactional
        public MenuItem clearRecipe(Long menuItemId) {
                MenuItem item = menuItemRepository.findById(menuItemId)
                                .orElseThrow(() -> new RuntimeException("Menu item not found: " + menuItemId));
                item.getIngredients().clear();
                return menuItemRepository.save(item);
        }

        public RecipeCostingDto getRecipeCosting(Long itemId) {
                MenuItem item = menuItemRepository.findById(itemId)
                                .orElseThrow(() -> new RuntimeException("Item not found"));
                return calculateRecipeCost(item);
        }

        public List<RecipeCostingDto> getAllRecipeCosting() {
                return menuItemRepository.findAll().stream()
                                .map(this::calculateRecipeCost)
                                .collect(Collectors.toList());
        }

        private RecipeCostingDto calculateRecipeCost(MenuItem item) {
                double totalCost = 0;
                List<RecipeCostingDto.IngredientCost> ingredientCosts = new ArrayList<>();

                if (item.getIngredients() != null) {
                        for (MenuItemIngredient ing : item.getIngredients()) {
                                double lineCost = ing.getQuantity() * ing.getStockItem().getCostPerUnit();
                                totalCost += lineCost;
                                ingredientCosts.add(new RecipeCostingDto.IngredientCost(
                                                ing.getId(),
                                                ing.getStockItem().getId(),
                                                ing.getStockItem().getName(),
                                                ing.getQuantity(),
                                                ing.getStockItem().getUnit(),
                                                ing.getStockItem().getCostPerUnit(),
                                                lineCost));
                        }
                }

                double price = item.getDisplayPrice();
                double profit = price - totalCost;
                double margin = price > 0 ? (profit / price) * 100 : 0;

                return new RecipeCostingDto(
                                item.getId(),
                                item.getName(),
                                price,
                                totalCost,
                                profit,
                                margin,
                                ingredientCosts);
        }

        @PostConstruct
        public void seedData() {
                if (menuItemRepository.count() == 0) {
                        List<MenuItem> items = new ArrayList<>();

                        // --- Royal Biryani Selection ---
                        String biryaniImg = "https://assets.zyrosite.com/mk3qvv9bXVtzKL5v/biryanianna-YanqlgwK9qF43K15.jpg";

                        // 1. Anna's Special Murg Biryani
                        MenuItem specialMurg = new MenuItem(null, "Anna's Special Murg Biryani",
                                        "Fusion of Chicken 65 with dum-cooked biryani", 299.0,
                                        "Royal Biryani Selection", null, true, biryaniImg, 5.0, 20, false, 1, false,
                                        0.0);
                        specialMurg.addVariation(new MenuItemVariation(null, "M - 750 gms", 299.0, specialMurg));
                        specialMurg.addVariation(new MenuItemVariation(null, "L - 1 Kg", 399.0, specialMurg));
                        items.add(specialMurg);

                        // 2. Shahi Ran-E-Murg Biryani
                        MenuItem ranEMurg = new MenuItem(null, "Shahi Ran-E-Murg Biryani",
                                        "Whole cut chicken thigh marinated with aromatic spices", 374.0,
                                        "Royal Biryani Selection", null, true, biryaniImg, 5.0, 25, false, 2, false,
                                        0.0);
                        ranEMurg.addVariation(new MenuItemVariation(null, "M - 750 gms", 374.0, ranEMurg));
                        ranEMurg.addVariation(new MenuItemVariation(null, "L - 1 Kg", 498.0, ranEMurg));
                        items.add(ranEMurg);

                        // 3. Shahi Dum Mutton Biryani
                        MenuItem muttonBiryani = new MenuItem(null, "Shahi Dum Mutton Biryani",
                                        "Boneless mutton pieces marinated and dum-cooked over charcoal", 374.0,
                                        "Royal Biryani Selection", null, true, biryaniImg, 5.0, 30, false, 3, false,
                                        0.0);
                        muttonBiryani.addVariation(new MenuItemVariation(null, "M - 750 gms", 374.0, muttonBiryani));
                        muttonBiryani.addVariation(new MenuItemVariation(null, "L - 1 Kg", 498.0, muttonBiryani));
                        items.add(muttonBiryani);

                        // 4. Dum Murg Tikka Biryani
                        MenuItem tikkaBiryani = new MenuItem(null, "Dum Murg Tikka Biryani",
                                        "Succulent chicken tikka pieces in aromatic biryani rice", 299.0,
                                        "Royal Biryani Selection", null, true, biryaniImg, 5.0, 20, false, 4, false,
                                        0.0);
                        tikkaBiryani.addVariation(new MenuItemVariation(null, "M - 750 gms", 299.0, tikkaBiryani));
                        tikkaBiryani.addVariation(new MenuItemVariation(null, "L - 1 Kg", 399.0, tikkaBiryani));
                        items.add(tikkaBiryani);

                        // 5. Mughlai Murg Biryani
                        MenuItem mughlaiMurg = new MenuItem(null, "Mughlai Murg Biryani",
                                        "Boneless chicken marinated in bhuna spices and dum-cooked", 194.0,
                                        "Royal Biryani Selection", null, true, biryaniImg, 5.0, 20, false, 5, false,
                                        0.0);
                        mughlaiMurg.addVariation(new MenuItemVariation(null, "M - 750 gms", 194.0, mughlaiMurg));
                        mughlaiMurg.addVariation(new MenuItemVariation(null, "L - 1 Kg", 298.0, mughlaiMurg));
                        items.add(mughlaiMurg);

                        // 6. Lazeez Anda Biryani
                        MenuItem andaBiryani = new MenuItem(null, "Lazeez Anda Biryani",
                                        "Double egg biryani with aromatic spices", 149.0, "Royal Biryani Selection",
                                        null, true, biryaniImg, 5.0, 15, false, 6, false, 0.0);
                        andaBiryani.addVariation(new MenuItemVariation(null, "M - 750 gms", 149.0, andaBiryani));
                        andaBiryani.addVariation(new MenuItemVariation(null, "L - 1 Kg", 198.0, andaBiryani));
                        items.add(andaBiryani);

                        // 7. Anna's Royal Handi Murg Biryani
                        MenuItem handiBiryani = new MenuItem(null, "Anna's Royal Handi Murg Biryani",
                                        "Serves 2 | Loaded with 50% more boneless chicken", 499.0,
                                        "Royal Biryani Selection", null, true, biryaniImg, 5.0, 30, false, 7, false,
                                        0.0);
                        items.add(handiBiryani);

                        // --- Vegetarian Biryani Delights ---
                        String vegBiryaniImg = "https://assets.zyrosite.com/mk3qvv9bXVtzKL5v/biryanianna-YanqlgwK9qF43K15.jpg";

                        // 8. Anna's Special Paneer Biryani
                        MenuItem specialPaneer = new MenuItem(null, "Anna's Special Paneer Biryani",
                                        "Soft fresh paneer marinated with royal spices", 224.0,
                                        "Vegetarian Biryani Delights", null, true, vegBiryaniImg, 5.0, 20, true, 8,
                                        false, 0.0);
                        specialPaneer.addVariation(new MenuItemVariation(null, "M - 750 gms", 224.0, specialPaneer));
                        specialPaneer.addVariation(new MenuItemVariation(null, "L - 1 Kg", 324.0, specialPaneer));
                        items.add(specialPaneer);

                        // 9. Dawat-E-Mushroom Biryani
                        MenuItem mushroomBiryani = new MenuItem(null, "Dawat-E-Mushroom Biryani",
                                        "Chunks of marinated mushrooms cooked with shahi masalas", 194.0,
                                        "Vegetarian Biryani Delights", null, true, vegBiryaniImg, 5.0, 20, true, 9,
                                        false, 0.0);
                        mushroomBiryani.addVariation(
                                        new MenuItemVariation(null, "M - 750 gms", 194.0, mushroomBiryani));
                        mushroomBiryani.addVariation(new MenuItemVariation(null, "L - 1 Kg", 298.0, mushroomBiryani));
                        items.add(mushroomBiryani);

                        // 10. Dum-Pukht Kathal Biryani
                        MenuItem kathalBiryani = new MenuItem(null, "Dum-Pukht Kathal Biryani",
                                        "Raw jackfruit biryani, a vegetarian classic", 149.0,
                                        "Vegetarian Biryani Delights", null, true, vegBiryaniImg, 5.0, 20, true, 10,
                                        false, 0.0);
                        kathalBiryani.addVariation(new MenuItemVariation(null, "M - 750 gms", 149.0, kathalBiryani));
                        kathalBiryani.addVariation(new MenuItemVariation(null, "L - 1 Kg", 198.0, kathalBiryani));
                        items.add(kathalBiryani);

                        // 11. Mehfil Meethi Biryani
                        MenuItem meethiBiryani = new MenuItem(null, "Mehfil Meethi Biryani",
                                        "Sweet biryani for a royal experience", 149.0, "Vegetarian Biryani Delights",
                                        null, true, vegBiryaniImg, 5.0, 15, true, 11, false, 0.0);
                        meethiBiryani.addVariation(new MenuItemVariation(null, "M - 750 gms", 149.0, meethiBiryani));
                        meethiBiryani.addVariation(new MenuItemVariation(null, "L - 1 Kg", 198.0, meethiBiryani));
                        items.add(meethiBiryani);

                        // --- Signature Starters and Sides ---
                        items.add(new MenuItem(null, "Chettinad Chicken 65", "Fiery and flavorful South Indian delight",
                                        129.0, "Signature Starters and Sides", null, true, biryaniImg, 5.0, 15, false,
                                        12, false, 0.0));
                        items.add(new MenuItem(null, "Mughlai Chicken Tikka",
                                        "Grilled to perfection with yogurt and herbs", 159.0,
                                        "Signature Starters and Sides", null, true, biryaniImg, 5.0, 15, false, 13,
                                        false, 0.0));
                        items.add(new MenuItem(null, "Hara Bhara Paneer Thalicha",
                                        "Soft paneer tossed in tangy green thalicha", 119.0,
                                        "Signature Starters and Sides", null, true, biryaniImg, 5.0, 15, true, 14,
                                        false, 0.0));
                        items.add(new MenuItem(null, "Chicken 65", "Spicy deep fried chicken chunks", 240.0,
                                        "Signature Starters and Sides", null, true, biryaniImg, 5.0, 15, false, 15,
                                        false, 0.0));
                        items.add(new MenuItem(null, "Chilli Chicken", "Indo-Chinese style spicy chicken", 240.0,
                                        "Signature Starters and Sides", null, true, biryaniImg, 5.0, 15, false, 16,
                                        false, 0.0));
                        items.add(new MenuItem(null, "Paneer Tikka", "Grilled cottage cheese marinated in yogurt",
                                        220.0, "Signature Starters and Sides", null, true, biryaniImg, 5.0, 15, true,
                                        17, false, 0.0));
                        items.add(new MenuItem(null, "Gobi Manchurian", "Cauliflower florets in tangy sauce", 180.0,
                                        "Signature Starters and Sides", null, true, biryaniImg, 5.0, 15, true, 18,
                                        false, 0.0));
                        items.add(new MenuItem(null, "King Fish Fry", "Tawa fried marinated fish", 299.0,
                                        "Signature Starters and Sides", null, true, biryaniImg, 5.0, 20, false, 19,
                                        false, 0.0));

                        // --- Drinks and Refreshments ---
                        items.add(new MenuItem(null, "Coke (250ml)", "Carbonated soft drink", 40.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 1, true, 20, true,
                                        50.0));
                        items.add(new MenuItem(null, "Sprite (250ml)", "Carbonated soft drink", 40.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 1, true, 21, true,
                                        50.0));
                        items.add(new MenuItem(null, "Thums Up (250ml)", "Carbonated soft drink", 40.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 1, true, 22, true,
                                        50.0));
                        items.add(new MenuItem(null, "Coke (600ml)", "Carbonated soft drink", 70.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 1, true, 23, true,
                                        10.0));
                        items.add(new MenuItem(null, "Sprite (600ml)", "Carbonated soft drink", 70.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 1, true, 24, true,
                                        10.0));
                        items.add(new MenuItem(null, "Water Bottle (1L)", "Packaged drinking water", 20.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 1, true, 25, true,
                                        100.0));
                        items.add(new MenuItem(null, "Sweet Lassi", "Traditional yogurt churned drink", 80.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 5, true, 26, false,
                                        0.0));
                        items.add(new MenuItem(null, "Mango Lassi", "Yogurt drink with mango pulp", 100.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 5, true, 27, false,
                                        0.0));

                        // --- Desserts ---
                        items.add(new MenuItem(null, "Gulab Jamun (2 pcs)", "Soft milk solids in sugar syrup", 80.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 2, true, 28, false,
                                        0.0));
                        items.add(new MenuItem(null, "Double Ka Meetha", "Bread pudding with dry fruits", 100.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 5, true, 29, false,
                                        0.0));
                        items.add(new MenuItem(null, "Vanilla Ice Cream", "Classic vanilla cold dessert", 60.0,
                                        "Drinks and Refreshments", null, true, biryaniImg, 5.0, 2, true, 30, false,
                                        0.0));

                        if (!items.isEmpty()) {
                                menuItemRepository.saveAll(items);
                        }
                }
        }
}
