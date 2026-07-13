// js/systems/upgrades.js
import { MAX_FIELD_LEVEL, MAX_SEED_SAVE_LEVEL } from "../state.js";
import { fieldUpgradeCost } from "./field.js";
import { orchardUpgradeCost } from "./orchard.js";

export const SEED_SAVE_UPGRADE_BASE_COST = 50;
export function seedSaveUpgradeCost(currentLevel) {
  return Math.round(SEED_SAVE_UPGRADE_BASE_COST * Math.pow(1.4, currentLevel));
}

function upgradeSlotLevel(slot, costFn, maxLevel, deductGold, playerGold) {
  if (slot.level >= maxLevel) return { success: false, reason: "max_seviye" };
  const cost = costFn(slot.level);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  slot.level += 1;
  return { success: true, cost, newLevel: slot.level };
}

function upgradeSeedSave(slot, deductGold, playerGold) {
  if (slot.seedSaveLevel >= MAX_SEED_SAVE_LEVEL) return { success: false, reason: "max_seviye" };
  const cost = seedSaveUpgradeCost(slot.seedSaveLevel);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  slot.seedSaveLevel += 1;
  return { success: true, cost, newLevel: slot.seedSaveLevel };
}

export function upgradeFieldSlot(state, slotIndex, deductGold, playerGold) {
  const slot = state.field.slots[slotIndex];
  return upgradeSlotLevel(slot, fieldUpgradeCost, MAX_FIELD_LEVEL, deductGold, playerGold);
}

export function upgradeFieldSeedSave(state, slotIndex, deductGold, playerGold) {
  const slot = state.field.slots[slotIndex];
  return upgradeSeedSave(slot, deductGold, playerGold);
}

export function upgradeOrchardSlot(state, slotIndex, deductGold, playerGold) {
  const slot = state.orchard.slots[slotIndex];
  return upgradeSlotLevel(slot, orchardUpgradeCost, MAX_FIELD_LEVEL, deductGold, playerGold);
}

export function upgradeOrchardSeedSave(state, slotIndex, deductGold, playerGold) {
  const slot = state.orchard.slots[slotIndex];
  return upgradeSeedSave(slot, deductGold, playerGold);
}

export const FIELD_SLOT_UNLOCK_BASE_COST = 80;
export function fieldSlotUnlockCost(unlockedCount) {
  return Math.round(FIELD_SLOT_UNLOCK_BASE_COST * Math.pow(1.25, unlockedCount - 5));
}

export const ORCHARD_SLOT_UNLOCK_BASE_COST = 100;
export function orchardSlotUnlockCost(unlockedCount) {
  return Math.round(ORCHARD_SLOT_UNLOCK_BASE_COST * Math.pow(1.3, unlockedCount - 4));
}
