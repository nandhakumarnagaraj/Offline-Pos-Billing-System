package com.biryanipos.backend.service;

import com.biryanipos.backend.model.Category;
import com.biryanipos.backend.repository.CategoryRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
  private final CategoryRepository categoryRepository;

  public List<Category> getAllCategories() {
    return categoryRepository.findAllByOrderByDisplayOrderAsc();
  }

  public List<Category> getActiveCategories() {
    return categoryRepository.findByActiveTrueOrderByDisplayOrderAsc();
  }

  public Category createCategory(Category category) {
    // Basic auto-increment for display order if not set
    if (category.getDisplayOrder() == 0) {
      category.setDisplayOrder((int) categoryRepository.count() + 1);
    }
    return categoryRepository.save(category);
  }

  public Category updateCategory(Long id, Category updated) {
    Category existing = categoryRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Category not found: " + id));
    existing.setName(updated.getName());
    existing.setDescription(updated.getDescription());
    existing.setImageUrl(updated.getImageUrl());
    existing.setDisplayOrder(updated.getDisplayOrder());
    existing.setActive(updated.isActive());
    return categoryRepository.save(existing);
  }

  public void deleteCategory(Long id) {
    categoryRepository.deleteById(id);
  }

  @PostConstruct
  public void seedCategories() {
    if (categoryRepository.count() == 0) {
      List<Category> seeds = Arrays.asList(
          new Category(null, "Biryani", "Main course biryanis", null, 1, true),
          new Category(null, "Starters", "Veg & Non-Veg appetizers", null, 2, true),
          new Category(null, "Tandoori", "Kebabs and grills", null, 3, true),
          new Category(null, "Curries", "Veg & Non-Veg gravies", null, 4, true),
          new Category(null, "Breads", "Roti, Naan, Paratha", null, 5, true),
          new Category(null, "Chinese", "Rice, noodles, starters", null, 6, true),
          new Category(null, "Drinks", "Smoothies & beverages", null, 7, true),
          new Category(null, "Desserts", "Sweet endings", null, 8, true));
      categoryRepository.saveAll(seeds);
    }
  }
}
