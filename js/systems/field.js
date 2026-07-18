/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Tarla ekimi ve büyüme                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/systems/field.js
import { getCrop } from "../data/crops.js";
import { hasItem, removeItem } from "../state.js";
import { daysToSeconds } from "./time.js";
import { computeGrowthMultiplier, tickGrowth, harvest as sharedHarvest, removePlant as sharedRemovePlant, randomHarvests } from "./planting.js";

/* ─────────────────── Ekilebilir mi ─────────────────── */
export function canPlant(state, slot, cropId) {
  if (!slot.unlocked || slot.planted) return false;
  const crop = getCrop(cropId);
  if (!crop) return false;
  return hasItem(state, `${cropId}_tohum`, 1);
}

/* ─────────────────── Tohum ek ─────────────────── */
export function plantSeed(state, slotIndex, cropId) {
  const slot = state.field.slots[slotIndex];
  const crop = getCrop(cropId);
  if (!canPlant(state, slot, cropId)) return { success: false, reason: "ekilemez" };

  removeItem(state, `${cropId}_tohum`, 1);
  const harvests = randomHarvests();

  slot.planted = {
    cropId,
    elapsedSeconds: 0,
    requiredSeconds: daysToSeconds(crop.growthDays),
    ready: false,
    harvestsLeft: harvests,
    maxHarvests: harvests,
  };

  return { success: true };
}

/* ─────────────────── Tarla büyümesini güncelle ─────────────────── */
export function tickFieldGrowth(state, dtSeconds) {
  tickGrowth(state.field.slots, state.weather, dtSeconds, getCrop);
}

/* ─────────────────── Slotu hasat et ─────────────────── */
export function harvestSlot(state, slotIndex) {
  const slot = state.field.slots[slotIndex];
  return sharedHarvest(state, slot, getCrop, "cropId");
}

/* ─────────────────── Bitkiyi kaldır ─────────────────── */
export function removePlant(state, slotIndex) {
  const slot = state.field.slots[slotIndex];
  return sharedRemovePlant(slot);
}

/* ─────────────────── Slot kilidini aç ─────────────────── */
export function unlockSlot(state, slotIndex, cost, playerCanAfford, deductGold) {
  const slot = state.field.slots[slotIndex];
  if (slot.unlocked) return { success: false, reason: "zaten_acik" };
  if (!playerCanAfford(cost)) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  slot.unlocked = true;
  return { success: true };
}

/* ─────────────────── Tarla geliştirme temel maliyeti ─────────────────── */
export const FIELD_UPGRADE_BASE_COST = 20;
/* ─────────────────── Tarla geliştirme maliyeti ─────────────────── */
export function fieldUpgradeCost(currentLevel) {
  return Math.round(FIELD_UPGRADE_BASE_COST * Math.pow(1.3, currentLevel));
}

// computeGrowthMultiplier'ı dışa aktar (diğer dosyalar kullanabilir)
export { computeGrowthMultiplier };
