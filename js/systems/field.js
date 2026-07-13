// js/systems/field.js
import { getCrop } from "../data/crops.js";
import { daysToSeconds } from "./time.js";
import { getWeather, rollRarity, RARITY_SELL_MULTIPLIER } from "./weather.js";
import { addItem, hasItem, removeItem, FIELD_LEVEL_SPEED_BONUS, SEED_SAVE_CHANCE_PER_LEVEL } from "../state.js";

/** Slotun toplam büyüme hızı çarpanını hesaplar (tarla seviyesi + hava). */
export function computeGrowthMultiplier(slot, weatherState) {
  const levelBonus = 1 + FIELD_LEVEL_SPEED_BONUS * slot.level;
  const weatherBonus = getWeather(weatherState).growthSpeedMultiplier;
  return levelBonus * weatherBonus;
}

export function canPlant(state, slot, cropId) {
  if (!slot.unlocked || slot.planted) return false;
  const crop = getCrop(cropId);
  if (!crop) return false;
  return hasItem(state, `${cropId}_tohum`, 1);
}

export function plantSeed(state, slotIndex, cropId) {
  const slot = state.field.slots[slotIndex];
  const crop = getCrop(cropId);
  if (!canPlant(state, slot, cropId)) return { success: false, reason: "ekilemez" };

  const seedSaveChance = SEED_SAVE_CHANCE_PER_LEVEL * slot.seedSaveLevel;
  const seedConsumed = Math.random() >= seedSaveChance;
  if (seedConsumed) {
    removeItem(state, `${cropId}_tohum`, 1);
  }

  slot.planted = {
    cropId,
    elapsedSeconds: 0,
    requiredSeconds: daysToSeconds(crop.growthDays),
    ready: false,
  };

  return { success: true, seedConsumed };
}

/** Her tick'te (main loop) çağrılır: tüm açık/ekili slotların büyümesini ilerletir. */
export function tickFieldGrowth(state, dtSeconds) {
  for (const slot of state.field.slots) {
    if (!slot.unlocked || !slot.planted || slot.planted.ready) continue;
    const mult = computeGrowthMultiplier(slot, state.weather);
    slot.planted.elapsedSeconds += dtSeconds * mult;
    if (slot.planted.elapsedSeconds >= slot.planted.requiredSeconds) {
      slot.planted.ready = true;
    }
  }
}

/** Hazır bir slotu hasat eder. Recurring ürünlerde slot ekili kalır, once ürünlerde boşalır. */
export function harvestSlot(state, slotIndex) {
  const slot = state.field.slots[slotIndex];
  if (!slot.planted || !slot.planted.ready) return { success: false, reason: "hazir_degil" };

  const crop = getCrop(slot.planted.cropId);
  const rarity = rollRarity(state.weather);
  const qty = 1; // temel hasat miktarı (ileride tarla seviyesine göre arttırılabilir)

  addItem(state, crop.id, qty, {
    rarity,
    sellPriceOverride: rarity === "normal" ? undefined : Math.round(crop.sellPrice * RARITY_SELL_MULTIPLIER[rarity]),
  });

  if (crop.harvestCycle === "recurring") {
    slot.planted.elapsedSeconds = 0;
    slot.planted.requiredSeconds = daysToSeconds(crop.recurringIntervalDays);
    slot.planted.ready = false;
  } else {
    slot.planted = null;
  }

  return { success: true, cropId: crop.id, qty, rarity };
}

export function unlockSlot(state, slotIndex, cost, playerCanAfford, deductGold) {
  const slot = state.field.slots[slotIndex];
  if (slot.unlocked) return { success: false, reason: "zaten_acik" };
  if (!playerCanAfford(cost)) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  slot.unlocked = true;
  return { success: true };
}

export const FIELD_UPGRADE_BASE_COST = 40;
export function fieldUpgradeCost(currentLevel) {
  return Math.round(FIELD_UPGRADE_BASE_COST * Math.pow(1.35, currentLevel));
}
