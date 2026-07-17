/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Üretim (crafting) mantığı                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/systems/crafting.js
import { getRecipe } from "../data/recipes.js";
import { addItem, removeItem, hasAnimalProduct, removeAnimalProduct, getAnimalProductCount, countItemQuantity } from "../state.js";

function consumeForCraft(state, itemId, qty) {
  let remaining = qty;
  if (hasAnimalProduct(state, itemId, remaining)) {
    const take = Math.min(remaining, getAnimalProductCount(state, itemId));
    removeAnimalProduct(state, itemId, take);
    remaining -= take;
  }
  if (remaining > 0) {
    removeItem(state, itemId, remaining);
  }
}

/* ─────────────────── Üretilebilir mi ─────────────────── */
export function canCraft(state, recipeId, times = 1) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return false;
  if (!state.unlockedTiers.includes(recipe.tier)) return false;
  return recipe.inputs.every((input) => {
    const needed = input.qty * times;
    const invQty = countItemQuantity(state, input.id);
    const animalQty = getAnimalProductCount(state, input.id);
    return (invQty + animalQty) >= needed;
  });
}

/**
 * Bir tarifi üretir. İlk üretim "elle" sayılır; başarılı ilk üretimden sonra
 * recipe.learned = true olur ve UI'da "toplu üretim" listesine eklenebilir.
 * Yeni bir tier tamamen açılıyorsa logged edilir.
 */
/* ─────────────────── Tarifi üret ─────────────────── */
export function craftRecipe(state, recipeId, times = 1) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return { success: false, reason: "tarif_yok" };
  if (!state.unlockedTiers.includes(recipe.tier)) return { success: false, reason: "kilitli" };
  if (!canCraft(state, recipeId, times)) return { success: false, reason: "eksik_malzeme" };

  for (const input of recipe.inputs) {
    consumeForCraft(state, input.id, input.qty * times);
  }
  addItem(state, recipe.output.id, recipe.output.qty * times);

  const wasLearned = state.recipes[recipeId].learned;
  if (!wasLearned) state.recipes[recipeId].learned = true;

  // Yeni tier kilidi açma: bir sonraki tier henüz açılmamışsa aç
  let tierUnlocked = false;
  const nextTier = recipe.tier + 1;
  if (nextTier <= 4 && !state.unlockedTiers.includes(nextTier)) {
    state.unlockedTiers.push(nextTier);
    tierUnlocked = true;
  }

  return {
    success: true,
    firstCraft: !wasLearned,
    tierUnlocked,
    unlockedTier: tierUnlocked ? nextTier : null,
    outputId: recipe.output.id,
    outputQty: recipe.output.qty * times,
  };
}
