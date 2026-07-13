// js/systems/crafting.js
import { getRecipe } from "../data/recipes.js";
import { addItem, hasItem, removeItem } from "../state.js";

export function canCraft(state, recipeId, times = 1) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return false;
  return recipe.inputs.every((input) => hasItem(state, input.id, input.qty * times));
}

/**
 * Bir tarifi üretir. İlk üretim "elle" sayılır; başarılı ilk üretimden sonra
 * recipe.learned = true olur ve UI'da "toplu üretim" listesine eklenebilir.
 */
export function craftRecipe(state, recipeId, times = 1) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return { success: false, reason: "tarif_yok" };
  if (!canCraft(state, recipeId, times)) return { success: false, reason: "eksik_malzeme" };

  for (const input of recipe.inputs) {
    removeItem(state, input.id, input.qty * times);
  }
  addItem(state, recipe.output.id, recipe.output.qty * times);

  const wasLearned = state.recipes[recipeId].learned;
  if (!wasLearned) state.recipes[recipeId].learned = true;

  return { success: true, firstCraft: !wasLearned, outputId: recipe.output.id, outputQty: recipe.output.qty * times };
}

/** UI için: bir tarifin eksik malzemelerini listeler (otomatik doldurma göstergesi). */
export function missingIngredients(state, recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return [];
  return recipe.inputs
    .filter((input) => !hasItem(state, input.id, input.qty))
    .map((input) => input.id);
}
