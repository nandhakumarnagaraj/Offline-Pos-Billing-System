package com.biryanipos.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecipeCostingDto {
  private Long menuItemId;
  private String menuItemName;
  private double sellingPrice;
  private double estimatedCost;
  private double profitAmount;
  private double marginPercentage;
  private List<IngredientCost> ingredients;

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class IngredientCost {
    private Long id;
    private Long stockItemId;
    private String name;
    private double quantity;
    private String unit;
    private double costPerUnit;
    private double lineCost;
  }
}
