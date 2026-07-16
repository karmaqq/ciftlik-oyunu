// js/systems/orchard.js
// Tarla sistemiyle aynı mantık, TREES veri setini kullanır. Mantık tekrarı
// bilinçli tutuldu ki iki sistem ayrı ayrı dengelenebilsin (ör. ağaç upgrade
// maliyetleri tarladan farklı ölçeklenebilir).
import { getTree } from "../data/trees.js";
import { itemDisplayName, itemEmoji } from "../data/items.js";
import { daysToSeconds } from "./time.js";
import { getWeather, rollRarity, RARITY_SELL_MULTIPLIER } from "./weather.js";
import { addItem, hasItem, removeItem, FIELD_LEVEL_SPEED_BONUS } from "../state.js";

const MIN_HARVESTS = 1;
const MAX_HARVESTS = 5;

export function computeOrchardGrowthMultiplier(slot, weatherState) {
  const levelBonus = 1 + FIELD_LEVEL_SPEED_BONUS * slot.level;
  const weatherBonus = getWeather(weatherState).growthSpeedMultiplier;
  return levelBonus * weatherBonus;
}

export function canPlantTree(state, slot, treeId) {
  if (!slot.unlocked || slot.planted) return false;
  const tree = getTree(treeId);
  if (!tree) return false;
  return hasItem(state, `${treeId}_fidan`, 1);
}

export function plantTree(state, slotIndex, treeId) {
  const slot = state.orchard.slots[slotIndex];
  const tree = getTree(treeId);
  if (!canPlantTree(state, slot, treeId)) return { success: false, reason: "ekilemez" };

  removeItem(state, `${treeId}_fidan`, 1);

  const harvests = Math.floor(Math.random() * (MAX_HARVESTS - MIN_HARVESTS + 1)) + MIN_HARVESTS;

  slot.planted = {
    cropId: treeId,
    elapsedSeconds: 0,
    requiredSeconds: daysToSeconds(tree.growthDays),
    ready: false,
    harvestsLeft: harvests,
    maxHarvests: harvests,
  };

  return { success: true };
}

export function tickOrchardGrowth(state, dtSeconds) {
  for (const slot of state.orchard.slots) {
    if (!slot.unlocked || !slot.planted || slot.planted.ready) continue;
    const mult = computeOrchardGrowthMultiplier(slot, state.weather);
    slot.planted.elapsedSeconds += dtSeconds * mult;
    if (slot.planted.elapsedSeconds >= slot.planted.requiredSeconds) {
      slot.planted.ready = true;
      const tree = getTree(slot.planted.cropId);
      if (tree && window._gameLog) {
        window._gameLog(`${itemEmoji(tree.id)} ${itemDisplayName(tree.id)} hasat için hazır`, "info");
      }
    }
  }
}

export function harvestOrchardSlot(state, slotIndex) {
  const slot = state.orchard.slots[slotIndex];
  if (!slot.planted || !slot.planted.ready) return { success: false, reason: "hazir_degil" };

  const tree = getTree(slot.planted.cropId);
  const rarity = rollRarity(state.weather);
  const qty = 1;

  addItem(state, tree.id, qty, {
    rarity,
    sellPriceOverride: rarity === "normal" ? undefined : Math.round(tree.sellPrice * RARITY_SELL_MULTIPLIER[rarity]),
  });

  slot.planted.harvestsLeft--;

  if (slot.planted.harvestsLeft <= 0) {
    slot.planted = null;
    return { success: true, treeId: tree.id, qty, rarity, depleted: true };
  }

  if (tree.harvestCycle === "recurring") {
    slot.planted.elapsedSeconds = 0;
    slot.planted.requiredSeconds = daysToSeconds(tree.recurringIntervalDays);
    slot.planted.ready = false;
  } else {
    slot.planted = null;
  }

  return { success: true, treeId: tree.id, qty, rarity, depleted: false };
}

/** Ekili slotu manuel olarak söker. */
export function removePlant(state, slotIndex) {
  const slot = state.orchard.slots[slotIndex];
  if (!slot.planted) return { success: false, reason: "hazir_degil" };
  slot.planted = null;
  return { success: true };
}

export const ORCHARD_UPGRADE_BASE_COST = 30;
export function orchardUpgradeCost(currentLevel) {
  return Math.round(ORCHARD_UPGRADE_BASE_COST * Math.pow(1.3, currentLevel));
}
