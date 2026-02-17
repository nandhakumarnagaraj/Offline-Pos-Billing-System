package com.biryanipos.backend.config;

import com.biryanipos.backend.dto.ExpenseRequest;
import com.biryanipos.backend.dto.StockTransactionRequest;
import com.biryanipos.backend.model.*;
import com.biryanipos.backend.repository.*;
import com.biryanipos.backend.service.ExpenseService;
import com.biryanipos.backend.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Transactional
public class SampleDataLoader implements CommandLineRunner {

  private final SupplierRepository supplierRepository;
  private final StockItemRepository stockItemRepository;
  private final StockService stockService;
  private final ExpenseService expenseService;
  private final MenuItemRepository menuItemRepository;

  @Override
  public void run(String... args) throws Exception {
    // Add existence check
    if (supplierRepository.count() > 0) {
      return; // Data already seeded
    }

    // 1. Get or Create Suppliers
    Supplier s1 = supplierRepository.findByName("Fresh Farm Poultry").orElseGet(() -> {
      Supplier s = new Supplier();
      s.setName("Fresh Farm Poultry");
      s.setContactPerson("Anil Kumar");
      s.setPhone("9876543210");
      s.setActive(true);
      return supplierRepository.save(s);
    });

    Supplier s2 = supplierRepository.findByName("Royal Spices Co.").orElseGet(() -> {
      Supplier s = new Supplier();
      s.setName("Royal Spices Co.");
      s.setContactPerson("Meera J.");
      s.setPhone("9123456780");
      s.setActive(true);
      return supplierRepository.save(s);
    });

    // 2. Create Stock Items (using helper to avoid dupes)
    StockItem chicken = createStockItem("Chicken (Frozen)", "KG", 50, 10, 220, s1);
    StockItem milk = createStockItem("Full Cream Milk", "LITRE", 20, 5, 60, s1);

    // 3. Record Some Transactions (including expiring ones)
    StockTransactionRequest buyMilk = new StockTransactionRequest();
    buyMilk.setStockItemId(milk.getId());
    buyMilk.setTransactionType(StockTransactionType.PURCHASE);
    buyMilk.setQuantity(10);
    buyMilk.setExpiryDate(LocalDate.now().plusDays(2)); // Expiring soon!
    buyMilk.setReason("Batch #202");
    stockService.recordTransaction(buyMilk);

    // 4. Record a Waste transaction with Category
    StockTransactionRequest wasteChicken = new StockTransactionRequest();
    wasteChicken.setStockItemId(chicken.getId());
    wasteChicken.setTransactionType(StockTransactionType.WASTE);
    wasteChicken.setQuantity(2);
    wasteChicken.setWasteCategory("SPOILAGE");
    wasteChicken.setReason("Left out overnight");
    stockService.recordTransaction(wasteChicken);

    // 5. Create Expenses (including recurring and GST)
    ExpenseRequest rent = new ExpenseRequest();
    rent.setCategory("RENT");
    rent.setDescription("Monthly Shop Rent");
    rent.setAmount(25000);
    rent.setPaymentMethod("BANK_TRANSFER");
    rent.setRecurring(true);
    rent.setRecurringInterval("MONTHLY");
    rent.setExpenseDate(LocalDate.now().withDayOfMonth(1));
    expenseService.createExpense(rent);

    ExpenseRequest gas = new ExpenseRequest();
    gas.setCategory("UTILITY");
    gas.setDescription("LPG Cylinder Refill");
    gas.setAmount(1150);
    gas.setGstAmount(54.76);
    gas.setPaymentMethod("CASH");
    gas.setSupplierId(s2.getId());
    expenseService.createExpense(gas);

    // 6. Create Comprehensive Stock Inventory
    // Proteins
    StockItem mutton = createStockItem("Mutton", "KG", 20, 5, 800, s1);
    StockItem egg = createStockItem("Egg", "PIECE", 500, 100, 6, s1);
    StockItem paneer = createStockItem("Paneer", "KG", 30, 5, 350, s2);
    StockItem kathal = createStockItem("Raw Jackfruit", "KG", 20, 5, 60, s2);
    StockItem mushroom = createStockItem("Mushroom", "KG", 20, 5, 200, s2);

    // Vegetables
    StockItem onion = createStockItem("Onion", "KG", 100, 20, 30, s2);
    // Staples
    StockItem rice = createStockItem("Basmati Rice", "KG", 100, 20, 110, s2);
    StockItem maida = createStockItem("Maida", "KG", 50, 10, 45, s2);

    // Dairy
    StockItem curd = createStockItem("Curd", "LITRE", 30, 5, 70, s1);
    StockItem butter = createStockItem("Butter", "KG", 20, 5, 450, s1);

    // Oils & Spices
    StockItem oil = createStockItem("Cooking Oil", "LITRE", 100, 20, 140, s2);
    StockItem ghee = createStockItem("Ghee", "LITRE", 20, 5, 600, s2);
    StockItem spices = createStockItem("Mughlai Spices", "KG", 10, 2, 800, s2);
    StockItem sugar = createStockItem("Sugar", "KG", 50, 10, 42, s2);
    StockItem mangoPulp = createStockItem("Mango Pulp", "KG", 20, 5, 180, s2);

    // 7. Link Recipes to Menu Items (Matching BiryaniWale Anna names)
    linkRecipe("Anna's Special Murg Biryani", chicken, 0.250, rice, 0.150, curd, 0.050, oil, 0.050, onion, 0.100,
        spices, 0.010);
    linkRecipe("Shahi Ran-E-Murg Biryani", chicken, 0.250, rice, 0.150, curd, 0.050, ghee, 0.030, spices, 0.015);
    linkRecipe("Shahi Dum Mutton Biryani", mutton, 0.250, rice, 0.150, curd, 0.050, ghee, 0.030, spices, 0.015);
    linkRecipe("Dum Murg Tikka Biryani", chicken, 0.200, rice, 0.150, curd, 0.050, oil, 0.050, spices, 0.010);
    linkRecipe("Mughlai Murg Biryani", chicken, 0.200, rice, 0.150, curd, 0.050, oil, 0.050, spices, 0.010);
    linkRecipe("Lazeez Anda Biryani", egg, 2.0, rice, 0.150, oil, 0.050, spices, 0.010);
    linkRecipe("Anna's Royal Handi Murg Biryani", chicken, 0.400, rice, 0.250, curd, 0.100, ghee, 0.050, spices, 0.020);

    linkRecipe("Anna's Special Paneer Biryani", paneer, 0.150, rice, 0.150, curd, 0.050, oil, 0.050, spices, 0.010);
    linkRecipe("Dawat-E-Mushroom Biryani", mushroom, 0.150, rice, 0.150, curd, 0.050, oil, 0.050, spices, 0.010);
    linkRecipe("Dum-Pukht Kathal Biryani", kathal, 0.150, rice, 0.150, curd, 0.050, oil, 0.050, spices, 0.010);
    linkRecipe("Mehfil Meethi Biryani", rice, 0.150, sugar, 0.050, ghee, 0.020, spices, 0.005);

    linkRecipe("Chettinad Chicken 65", chicken, 0.200, maida, 0.050, oil, 0.100, curd, 0.030, spices, 0.010);
    linkRecipe("Mughlai Chicken Tikka", chicken, 0.250, curd, 0.050, spices, 0.015, butter, 0.020);
    linkRecipe("Hara Bhara Paneer Thalicha", paneer, 0.200, curd, 0.050, spices, 0.010, oil, 0.030);

    linkRecipe("Double Ka Meetha", milk, 0.100, sugar, 0.050, ghee, 0.020);
    linkRecipe("Sweet Lassi", curd, 0.250, sugar, 0.050);
    linkRecipe("Mango Lassi", curd, 0.200, mangoPulp, 0.050, sugar, 0.030);
    linkRecipe("Gulab Jamun (2 pcs)", sugar, 0.050, oil, 0.050);
  }

  // Helper Methods
  private StockItem createStockItem(String name, String unit, double qty, double reorder, double cost, Supplier s) {
    // Check if exists
    StockItem item = stockItemRepository.findAll().stream()
        .filter(i -> i.getName().equalsIgnoreCase(name))
        .findFirst()
        .orElse(null);

    if (item == null) {
      item = new StockItem();
      item.setName(name);
      item.setUnit(unit);
      item.setCurrentStock(qty);
      item.setReorderLevel(reorder);
      item.setCostPerUnit(cost);
      item.setSupplierRef(s);
      return stockItemRepository.save(item);
    }
    return item;
  }

  // Link recipe helper (varargs for pairs of StockItem, Quantity)
  private void linkRecipe(String menuItemName, Object... ingredients) {
    if (ingredients.length % 2 != 0)
      return; // Must be pairs

    menuItemRepository.searchByName(menuItemName).stream().findFirst().ifPresent(item -> {
      // Clear existing to avoid dupes in re-runs if any
      if (item.getIngredients() != null)
        item.getIngredients().clear();

      for (int i = 0; i < ingredients.length; i += 2) {
        StockItem stock = (StockItem) ingredients[i];
        double qty = (ingredients[i + 1] instanceof Integer) ? (Integer) ingredients[i + 1]
            : (Double) ingredients[i + 1];

        MenuItemIngredient ing = new MenuItemIngredient();
        ing.setStockItem(stock);
        ing.setQuantity(qty);
        item.addIngredient(ing);
      }
      menuItemRepository.save(item);
    });
  }
}
