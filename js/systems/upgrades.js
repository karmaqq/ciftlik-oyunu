/* ═══════════════════════════════════════════════════════════════════════════ */
/*                  Geliştirme (upgrade) mantığı                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/systems/upgrades.js
import {
  MAX_FIELD_LEVEL,
  FIELD_TOTAL_SLOTS, ORCHARD_TOTAL_SLOTS, INVENTORY_TOTAL_SLOTS,
  ORCHARD_START_UNLOCKED, FIELD_START_UNLOCKED,
  MAX_MARKET_SLOTS_PER_CATEGORY,
} from "../state.js";
import { fieldUpgradeCost } from "./field.js";
import { orchardUpgradeCost } from "./orchard.js";
import { buildingUpgradeCost, upgradeBuilding } from "./buildings.js";

// ---- Mevcut fonksiyonlar ----

function upgradeSlotLevel(slot, costFn, maxLevel, deductGold, playerGold) {
  if (slot.level >= maxLevel) return { success: false, reason: "max_seviye" };
  const cost = costFn(slot.level);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  slot.level += 1;
  return { success: true, cost, newLevel: slot.level };
}

/* ─────────────────── Tarla slotu geliştir ─────────────────── */
export function upgradeFieldSlot(state, slotIndex, deductGold, playerGold) {
  const slot = state.field.slots[slotIndex];
  return upgradeSlotLevel(slot, fieldUpgradeCost, MAX_FIELD_LEVEL, deductGold, playerGold);
}

/* ─────────────────── Bahçe slotu geliştir ─────────────────── */
export function upgradeOrchardSlot(state, slotIndex, deductGold, playerGold) {
  const slot = state.orchard.slots[slotIndex];
  return upgradeSlotLevel(slot, orchardUpgradeCost, MAX_FIELD_LEVEL, deductGold, playerGold);
}

/* ─────────────────── Tarla slot açma temel maliyeti ─────────────────── */
export const FIELD_SLOT_UNLOCK_BASE_COST = 15;
/* ─────────────────── Tarla slot açma maliyeti ─────────────────── */
export function fieldSlotUnlockCost(unlockedCount) {
  return Math.round(FIELD_SLOT_UNLOCK_BASE_COST * Math.pow(1.2, unlockedCount - FIELD_START_UNLOCKED));
}

/* ─────────────────── Bahçe slot açma temel maliyeti ─────────────────── */
export const ORCHARD_SLOT_UNLOCK_BASE_COST = 20;
/* ─────────────────── Bahçe slot açma maliyeti ─────────────────── */
export function orchardSlotUnlockCost(unlockedCount) {
  return Math.round(ORCHARD_SLOT_UNLOCK_BASE_COST * Math.pow(1.25, unlockedCount - ORCHARD_START_UNLOCKED));
}

// ---- Yeni Geliştirme Fonksiyonları ----

/* ─────────────────── Envanter slot temel maliyeti ─────────────────── */
export const INVENTORY_SLOT_BASE_COST = 15;
/* ─────────────────── Envanter slot maliyeti ─────────────────── */
export function inventorySlotCost(currentCount) {
  return Math.round(INVENTORY_SLOT_BASE_COST * Math.pow(1.2, currentCount - 5));
}

/* ─────────────────── Market slot temel maliyeti ─────────────────── */
export const MARKET_SLOT_BASE_COST = 80;
/* ─────────────────── Market slot maliyeti ─────────────────── */
export function marketSlotCost(category, currentLevel) {
  return Math.round(MARKET_SLOT_BASE_COST * Math.pow(2.0, currentLevel));
}

/* ─────────────────── Envanter slotlarını geliştir ─────────────────── */
export function upgradeInventorySlots(state, deductGold, playerGold) {
  if (state.inventory.maxSlots >= INVENTORY_TOTAL_SLOTS) return { success: false, reason: "max_seviye" };
  const cost = inventorySlotCost(state.inventory.maxSlots);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  state.inventory.maxSlots += 1;
  return { success: true, cost, newMax: state.inventory.maxSlots };
}

/* ─────────────────── Tarla slotlarını geliştir ─────────────────── */
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

/* ─────────────────── Bahçe slotlarını geliştir ─────────────────── */
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

/* ─────────────────── Market slotlarını geliştir ─────────────────── */
export function upgradeMarketSlots(state, category, deductGold, playerGold) {
  const key = `${category}Slots`;
  if (state.market[key] >= MAX_MARKET_SLOTS_PER_CATEGORY) return { success: false, reason: "max_seviye" };
  const cost = marketSlotCost(category, state.market[key]);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  state.market[key] += 1;
  return { success: true, cost, newMax: state.market[key] };
}

/* ─────────────────── Panelden bina geliştir ─────────────────── */
export function upgradeBuildingFromPanel(state, buildingType, deductGold, playerGold) {
  return upgradeBuilding(state, buildingType, deductGold, playerGold);
}

// ---- Özellik (Feature) Satın Alma ----

/* ─────────────────── Özellik maliyetleri ─────────────────── */
export const FEATURE_COSTS = {
  calendar: 50,
  quickSell: 25,
  orchard: 100,
  hive: 150,
  coop: 200,
  barn: 350,
};

/* ─────────────────── Özellik isimleri ─────────────────── */
export const FEATURE_NAMES = {
  calendar: "Takvim Ticaret",
  quickSell: "Hızlı Satış",
  orchard: "Bahçe",
  hive: "Kovan",
  coop: "Kümes",
  barn: "Ahır",
};

/* ─────────────────── Özellik emojileri ─────────────────── */
export const FEATURE_EMOJIS = {
  calendar: "📅",
  quickSell: "💸",
  orchard: "🌳",
  hive: "🐝",
  coop: "🐔",
  barn: "🐄",
};

/* ─────────────────── Özellik açıklamaları ─────────────────── */
export const FEATURE_DESCRIPTIONS = {
  calendar: "Mevsimlere göre fiyat dalgalanmaları ve ticaret bonusları",
  quickSell: "Envanterden sürükle-bırak ile hızlı satış",
  orchard: "Meyve ağaçları dik ve hasat et",
  hive: "Arı yetiştir, bal üret",
  coop: "Tavuk yetiştir, yumurta üret",
  barn: "İnek yetiştir, süt üret",
};

/* ─────────────────── Özellik satın al ─────────────────── */
export function buyFeature(state, featureId, deductGold, playerGold) {
  if (!state.features) return { success: false, reason: "gecersiz_ozellik" };
  if (state.features[featureId]) return { success: false, reason: "zaten_acik" };
  const cost = FEATURE_COSTS[featureId];
  if (cost === undefined) return { success: false, reason: "gecersiz_ozellik" };
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };
  deductGold(cost);
  state.features[featureId] = true;
  return { success: true, cost };
}
