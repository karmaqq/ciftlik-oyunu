// js/state.js
// Merkezi oyun durumu. Tüm sistemler bu state objesini okuyup mutasyona uğratır.

import { createInitialTime } from "./systems/time.js";
import { createInitialWeather } from "./systems/weather.js";
import { RECIPES } from "./data/recipes.js";

export const FIELD_TOTAL_SLOTS = 25; // 5x5
export const FIELD_START_UNLOCKED = 5;
export const ORCHARD_TOTAL_SLOTS = 9; // 3x3
export const INVENTORY_TOTAL_SLOTS = 49; // 7x7
export const MAX_FIELD_LEVEL = 10;
export const MAX_SEED_SAVE_LEVEL = 10;
export const FIELD_LEVEL_SPEED_BONUS = 0.05; // %5 / seviye, max %50
export const SEED_SAVE_CHANCE_PER_LEVEL = 0.02; // %2 / seviye, max %20

function createFieldSlots() {
  const slots = [];
  for (let i = 0; i < FIELD_TOTAL_SLOTS; i++) {
    slots.push({
      slotId: `field_${i}`,
      unlocked: i < FIELD_START_UNLOCKED,
      level: 0,
      seedSaveLevel: 0,
      planted: null, // { cropId, elapsedSeconds, requiredSeconds, ready }
    });
  }
  return slots;
}

function createOrchardSlots() {
  const slots = [];
  for (let i = 0; i < ORCHARD_TOTAL_SLOTS; i++) {
    slots.push({
      slotId: `orchard_${i}`,
      unlocked: i < 4, // bahçe de kademeli açılsın diye başlangıçta 4 slot
      level: 0,
      seedSaveLevel: 0,
      planted: null,
    });
  }
  return slots;
}

export function createInitialState() {
  return {
    player: { gold: 250, level: 1, xp: 0 },
    time: createInitialTime(),
    weather: createInitialWeather(),

    inventory: {
      // itemId -> { quantity, meta }
      items: {
        bugday_tohum: { quantity: 5 },
      },
    },

    field: { slots: createFieldSlots() },
    orchard: { slots: createOrchardSlots() },

    buildings: {
      hive: { level: 0, population: 4, sinceLastProduction: 0 },
      coop: { level: 0, population: 2, sinceLastProduction: 0 },
      barn: { level: 0, population: 1, sinceLastProduction: 0 },
    },

    market: { secondsSinceRefresh: 0, listings: [] },

    recipes: Object.fromEntries(RECIPES.map((r) => [r.id, { learned: false }])),

    quests: [],
    orders: [],

    ui: { activeMiddleTab: "field", activeBuildingTab: "hive", activeRightTab: "market" },
  };
}

// ---- Envanter yardımcıları ----

export function addItem(state, itemId, qty, meta) {
  if (qty <= 0) return;
  const items = state.inventory.items;
  if (!items[itemId]) items[itemId] = { quantity: 0, meta: meta || {} };
  items[itemId].quantity += qty;
  if (meta) items[itemId].meta = { ...(items[itemId].meta || {}), ...meta };
}

export function hasItem(state, itemId, qty) {
  const entry = state.inventory.items[itemId];
  return !!entry && entry.quantity >= qty;
}

export function removeItem(state, itemId, qty) {
  const entry = state.inventory.items[itemId];
  if (!entry || entry.quantity < qty) return false;
  entry.quantity -= qty;
  if (entry.quantity <= 0) delete state.inventory.items[itemId];
  return true;
}

export function inventoryUsedSlots(state) {
  return Object.keys(state.inventory.items).length;
}

export function inventoryHasSpace(state) {
  return inventoryUsedSlots(state) < INVENTORY_TOTAL_SLOTS;
}
