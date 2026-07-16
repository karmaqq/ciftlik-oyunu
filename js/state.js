/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Merkezi oyun durumu                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/state.js
// Merkezi oyun durumu. Tüm sistemler bu state objesini okuyup mutasyona uğratır.

import { createInitialTime } from "./systems/time.js";
import { createInitialWeather } from "./systems/weather.js";
import { RECIPES } from "./data/recipes.js";
import { BUILDING_TYPES } from "./data/animals.js";

/* ─────────────────── Toplam tarla slotu ─────────────────── */
export const FIELD_TOTAL_SLOTS = 25; // 5x5
/* ─────────────────── Başlangıçta açık tarla slotu ─────────────────── */
export const FIELD_START_UNLOCKED = 5;
/* ─────────────────── Toplam bahçe slotu ─────────────────── */
export const ORCHARD_TOTAL_SLOTS = 9; // 3x3
/* ─────────────────── Başlangıçta açık bahçe slotu ─────────────────── */
export const ORCHARD_START_UNLOCKED = 3;
/* ─────────────────── Toplam envanter slotu ─────────────────── */
export const INVENTORY_TOTAL_SLOTS = 25; // 5x5
/* ─────────────────── Maksimum tarla seviyesi ─────────────────── */
export const MAX_FIELD_LEVEL = 25;
/* ─────────────────── Tarla seviye hız bonusu ─────────────────── */
export const FIELD_LEVEL_SPEED_BONUS = 0.02; // %2 / seviye, max %50
/* ─────────────────── Kategori başına maksimum market slotu ─────────────────── */
export const MAX_MARKET_SLOTS_PER_CATEGORY = 3;
const MARKET_START_SLOTS = 1;

function createFieldSlots() {
  const slots = [];
  for (let i = 0; i < FIELD_TOTAL_SLOTS; i++) {
    slots.push({
      slotId: `field_${i}`,
      unlocked: i < FIELD_START_UNLOCKED,
      level: 0,
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
      planted: null,
    });
  }
  return slots;
}

/* ─────────────────── İlk oyun durumunu oluştur ─────────────────── */
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
      hive: { level: 0, population: 0, sinceLastProduction: 0, stored: { bal: 0 } },
      coop: { level: 0, population: 0, sinceLastProduction: 0, stored: { yumurta: 0, tavuk_eti: 0 } },
      barn: { level: 0, population: 0, sinceLastProduction: 0, stored: { sut: 0, inek_eti: 0 } },
    },

    market: { secondsSinceRefresh: 0, listings: [], seedSlots: MARKET_START_SLOTS, saplingSlots: MARKET_START_SLOTS, animalSlots: MARKET_START_SLOTS, lastRefreshTimestamp: Date.now() },

    recipes: Object.fromEntries(RECIPES.map((r) => [r.id, { learned: false }])),
    unlockedTiers: [1],
    hintsShown: {},

    features: {
      calendar: false,
      quickSell: false,
      orchard: false,
      hive: false,
      coop: false,
      barn: false,
    },

    ui: { activeMiddleTab: "field", activeBuildingTab: "hive", activeRightTab: "market" },
  };
}

// ---- Envanter yardımcıları ----

/* ─────────────────── Envanter slotlarını say ─────────────────── */
export function countInventorySlots(state) {
  return Object.keys(state.inventory.items).length;
}

/* ─────────────────── Envanter dolu mu ─────────────────── */
export function isInventoryFull(state) {
  return countInventorySlots(state) >= state.inventory.maxSlots;
}

/* ─────────────────── Envanterde öğe var mı ─────────────────── */
export function hasItemInInventory(state, itemId) {
  return !!state.inventory.items[itemId];
}

/**
 * Ürünü envantere ekler. Envanter doluysa kuyruğa alır.
 * @returns {{success:boolean, queued:boolean, reason?:string}}
 */
/* ─────────────────── Öğe ekle ─────────────────── */
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
/* ─────────────────── Kuyruğu işle ─────────────────── */
export function processQueue(state) {
  const added = [];
  const queue = state.inventory.queue;
  let consumed = 0;

  while (consumed < queue.length) {
    const next = queue[consumed];
    if (hasItemInInventory(state, next.itemId) || countInventorySlots(state) < state.inventory.maxSlots) {
      consumed++;
      addItem(state, next.itemId, next.qty, next.meta);
      added.push({ itemId: next.itemId, qty: next.qty });
    } else {
      break;
    }
  }

  if (consumed > 0) queue.splice(0, consumed);

  return added;
}

/* ─────────────────── Öğe var mı ─────────────────── */
export function hasItem(state, itemId, qty) {
  const entry = state.inventory.items[itemId];
  return !!entry && entry.quantity >= qty;
}

/* ─────────────────── Öğeyi kaldır ─────────────────── */
export function removeItem(state, itemId, qty) {
  const entry = state.inventory.items[itemId];
  if (!entry || entry.quantity < qty) return false;
  entry.quantity -= qty;
  if (entry.quantity <= 0) delete state.inventory.items[itemId];
  return true;
}

// ---- Hayvan ürünü (building storage) yardımcıları ----

const BUILDING_BY_PRODUCT = {};
for (const [type, def] of Object.entries(BUILDING_TYPES)) {
  if (def.productId) BUILDING_BY_PRODUCT[def.productId] = type;
  if (def.secondaryProductId) BUILDING_BY_PRODUCT[def.secondaryProductId] = type;
}

function findBuildingForProduct(state, productId) {
  const type = BUILDING_BY_PRODUCT[productId];
  return type ? { type, building: state.buildings[type] } : null;
}

/* ─────────────────── Hayvan ürün sayısını al ─────────────────── */
export function getAnimalProductCount(state, productId) {
  const found = findBuildingForProduct(state, productId);
  if (!found) return 0;
  return found.building.stored[productId] || 0;
}

/* ─────────────────── Hayvan ürünü var mı ─────────────────── */
export function hasAnimalProduct(state, productId, qty) {
  return getAnimalProductCount(state, productId) >= qty;
}

/* ─────────────────── Hayvan ürününü kaldır ─────────────────── */
export function removeAnimalProduct(state, productId, qty) {
  const found = findBuildingForProduct(state, productId);
  if (!found) return false;
  const current = found.building.stored[productId] || 0;
  if (current < qty) return false;
  found.building.stored[productId] = current - qty;
  return true;
}
