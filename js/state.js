// js/state.js
// Merkezi oyun durumu. Tüm sistemler bu state objesini okuyup mutasyona uğratır.

import { createInitialTime } from "./systems/time.js";
import { createInitialWeather } from "./systems/weather.js";
import { RECIPES } from "./data/recipes.js";

export const FIELD_TOTAL_SLOTS = 25; // 5x5
export const FIELD_START_UNLOCKED = 5;
export const ORCHARD_TOTAL_SLOTS = 9; // 3x3
export const ORCHARD_START_UNLOCKED = 3;
export const INVENTORY_TOTAL_SLOTS = 25; // 5x5
export const MAX_FIELD_LEVEL = 10;
export const MAX_SEED_SAVE_LEVEL = 10;
export const FIELD_LEVEL_SPEED_BONUS = 0.05; // %5 / seviye, max %50
export const SEED_SAVE_CHANCE_PER_LEVEL = 0.02; // %2 / seviye, max %20
export const MAX_MARKET_SLOTS_PER_CATEGORY = 3;
const MARKET_START_SLOTS = 1;

function createFieldSlots() {
  const slots = [];
  for (let i = 0; i < FIELD_TOTAL_SLOTS; i++) {
    slots.push({
      slotId: `field_${i}`,
      unlocked: i < FIELD_START_UNLOCKED,
      level: 0,
      seedSaveLevel: 0,
      planted: null,
    });
  }
  return slots;
}

function createOrchardSlots() {
  const slots = [];
  for (let i = 0; i < ORCHARD_TOTAL_SLOTS; i++) {
    slots.push({
      slotId: `orchard_${i}`,
      unlocked: i < ORCHARD_START_UNLOCKED,
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
      items: {
        bugday_tohum: { quantity: 5 },
      },
      maxSlots: 5,
      queue: [],
    },

    field: { slots: createFieldSlots() },
    orchard: { slots: createOrchardSlots() },

    buildings: {
      hive: { level: 0, population: 0, sinceLastProduction: 0 },
      coop: { level: 0, population: 0, sinceLastProduction: 0 },
      barn: { level: 0, population: 0, sinceLastProduction: 0 },
    },

    market: { secondsSinceRefresh: 0, listings: [], seedSlots: MARKET_START_SLOTS, saplingSlots: MARKET_START_SLOTS, animalSlots: MARKET_START_SLOTS, lastRefreshTimestamp: Date.now() },

    recipes: Object.fromEntries(RECIPES.map((r) => [r.id, { learned: false }])),
    unlockedTiers: [1],
    hintsShown: {},

    quests: [],

    ui: { activeMiddleTab: "field", activeBuildingTab: "hive", activeRightTab: "market" },
  };
}

// ---- Envanter yardımcıları ----

function countInventorySlots(state) {
  return Object.keys(state.inventory.items).length;
}

function isInventoryFull(state) {
  return countInventorySlots(state) >= state.inventory.maxSlots;
}

function hasItemInInventory(state, itemId) {
  return !!state.inventory.items[itemId];
}

/**
 * Ürünü envantere ekler. Envanter doluysa kuyruğa alır.
 * @returns {{success:boolean, queued:boolean, reason?:string}}
 */
export function addItem(state, itemId, qty, meta) {
  if (qty <= 0) return { success: false, queued: false, reason: "eksik_miktar" };

  const items = state.inventory.items;

  if (items[itemId]) {
    items[itemId].quantity += qty;
    if (meta) items[itemId].meta = { ...(items[itemId].meta || {}), ...meta };
    return { success: true, queued: false };
  }

  if (isInventoryFull(state)) {
    state.inventory.queue.push({ itemId, qty, meta, source: meta?.source || "unknown" });
    return { success: false, queued: true };
  }

  items[itemId] = { quantity: qty, meta: meta || {} };
  return { success: true, queued: false };
}

/**
 * Kuyruktaki ürünleri envantere eklemeyi dener.
 * @returns {Array<{itemId:string, qty:number}>} Eklenen ürünler
 */
export function processQueue(state) {
  const added = [];
  const queue = state.inventory.queue;

  while (queue.length > 0) {
    const next = queue[0];
    if (hasItemInInventory(state, next.itemId) || countInventorySlots(state) < state.inventory.maxSlots) {
      queue.shift();
      addItem(state, next.itemId, next.qty, next.meta);
      added.push({ itemId: next.itemId, qty: next.qty });
    } else {
      break;
    }
  }

  return added;
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
