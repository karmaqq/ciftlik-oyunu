// js/systems/upgrades.js
import {
  MAX_FIELD_LEVEL, MAX_SEED_SAVE_LEVEL,
  FIELD_TOTAL_SLOTS, ORCHARD_TOTAL_SLOTS, INVENTORY_TOTAL_SLOTS,
  ORCHARD_START_UNLOCKED, FIELD_START_UNLOCKED,
  MAX_MARKET_SLOTS_PER_CATEGORY,
} from "../state.js";
import { fieldUpgradeCost } from "./field.js";
import { orchardUpgradeCost } from "./orchard.js";
import { buildingUpgradeCost } from "./buildings.js";

// ---- Mevcut fonksiyonlar ----

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
  return Math.round(FIELD_SLOT_UNLOCK_BASE_COST * Math.pow(1.25, unlockedCount - FIELD_START_UNLOCKED));
}

export const ORCHARD_SLOT_UNLOCK_BASE_COST = 100;
export function orchardSlotUnlockCost(unlockedCount) {
  return Math.round(ORCHARD_SLOT_UNLOCK_BASE_COST * Math.pow(1.3, unlockedCount - ORCHARD_START_UNLOCKED));
}

// ---- Yeni Geliştirme Fonksiyonları ----

export const INVENTORY_SLOT_BASE_COST = 80;
export function inventorySlotCost(currentCount) {
  return Math.round(INVENTORY_SLOT_BASE_COST * Math.pow(1.3, currentCount - 5));
}

export const MARKET_SLOT_BASE_COST = 500;
export function marketSlotCost(category, currentLevel) {
  return Math.round(MARKET_SLOT_BASE_COST * Math.pow(2.5, currentLevel));
}

export function upgradeInventorySlots(state, deductGold, playerGold) {
  if (state.inventory.maxSlots >= INVENTORY_TOTAL_SLOTS) return { success: false, reason: "max_seviye" };
  const cost = inventorySlotCost(state.inventory.maxSlots);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  state.inventory.maxSlots += 1;
  return { success: true, cost, newMax: state.inventory.maxSlots };
}

export function upgradeFieldSlots(state, deductGold, playerGold) {
  const unlocked = state.field.slots.filter((s) => s.unlocked).length;
  if (unlocked >= FIELD_TOTAL_SLOTS) return { success: false, reason: "max_seviye" };
  const cost = fieldSlotUnlockCost(unlocked);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  const nextLocked = state.field.slots.find((s) => !s.unlocked);
  if (nextLocked) nextLocked.unlocked = true;
  return { success: true, cost, newMax: unlocked + 1 };
}

export function upgradeOrchardSlots(state, deductGold, playerGold) {
  const unlocked = state.orchard.slots.filter((s) => s.unlocked).length;
  if (unlocked >= ORCHARD_TOTAL_SLOTS) return { success: false, reason: "max_seviye" };
  const cost = orchardSlotUnlockCost(unlocked);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  const nextLocked = state.orchard.slots.find((s) => !s.unlocked);
  if (nextLocked) nextLocked.unlocked = true;
  return { success: true, cost, newMax: unlocked + 1 };
}

export function upgradeMarketSlots(state, category, deductGold, playerGold) {
  const key = `${category}Slots`;
  if (state.market[key] >= MAX_MARKET_SLOTS_PER_CATEGORY) return { success: false, reason: "max_seviye" };
  const cost = marketSlotCost(category, state.market[key]);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  state.market[key] += 1;
  return { success: true, cost, newMax: state.market[key] };
}

export function upgradeBuildingFromPanel(state, buildingType, deductGold, playerGold) {
  return upgradeBuilding(state, buildingType, deductGold, playerGold);
}
