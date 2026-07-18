/* ═══════════════════════════════════════════════════════════════════════════ */
/*                   Bahçe/fidanlık mekaniği                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/systems/orchard.js
import { getTree } from "../data/trees.js";
import { hasItem, removeItem } from "../state.js";
import { daysToSeconds } from "./time.js";
import { tickGrowth, harvest as sharedHarvest, removePlant as sharedRemovePlant, randomHarvests } from "./planting.js";

/* ─────────────────── Ağaç ekilebilir mi ─────────────────── */
export function canPlantTree(state, slot, treeId) {
  if (!slot.unlocked || slot.planted) return false;
  const tree = getTree(treeId);
  if (!tree) return false;
  return hasItem(state, `${treeId}_fidan`, 1);
}

/* ─────────────────── Ağaç ek ─────────────────── */
export function plantTree(state, slotIndex, treeId) {
  const slot = state.orchard.slots[slotIndex];
  const tree = getTree(treeId);
  if (!canPlantTree(state, slot, treeId)) return { success: false, reason: "ekilemez" };

  removeItem(state, `${treeId}_fidan`, 1);
  const harvests = randomHarvests();

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

/* ─────────────────── Bahçe büyümesini güncelle ─────────────────── */
export function tickOrchardGrowth(state, dtSeconds) {
  tickGrowth(state.orchard.slots, state.weather, dtSeconds, getTree);
}

/* ─────────────────── Bahçe slotunu hasat et ─────────────────── */
export function harvestOrchardSlot(state, slotIndex) {
  const slot = state.orchard.slots[slotIndex];
  return sharedHarvest(state, slot, getTree, "treeId");
}

/* ─────────────────── Bitkiyi kaldır ─────────────────── */
export function removePlant(state, slotIndex) {
  const slot = state.orchard.slots[slotIndex];
  return sharedRemovePlant(slot);
}

/* ─────────────────── Bahçe geliştirme temel maliyeti ─────────────────── */
export const ORCHARD_UPGRADE_BASE_COST = 30;
/* ─────────────────── Bahçe geliştirme maliyeti ─────────────────── */
export function orchardUpgradeCost(currentLevel) {
  return Math.round(ORCHARD_UPGRADE_BASE_COST * Math.pow(1.3, currentLevel));
}
