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
          new Category(null, "Royal Biryani Selection", "Premium Hyderabadi biryanis", null, 1, true),
          new Category(null, "Vegetarian Biryani Delights", "Authentic veg biryani varieties", null, 2, true),
          new Category(null, "Signature Starters and Sides", "Traditional appetizers and accompaniments", null, 3,
              true),
          new Category(null, "Drinks and Refreshments", "Beverages and cool drinks", null, 4, true));
      categoryRepository.saveAll(seeds);
    }
  }
}
