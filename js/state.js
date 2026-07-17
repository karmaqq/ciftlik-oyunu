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
    player: { gold: 500 },
    time: createInitialTime(),
    weather: createInitialWeather(),

    inventory: {
      items: {
        bugday_tohum: { quantity: 5 },
      },
      maxSlots: 5,
      queue: [],
      _version: 0,
    },

    field: { slots: createFieldSlots() },
    orchard: { slots: createOrchardSlots() },

    buildings: {
      _version: 0,
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

/* ─────────────────── Envanter versiyonunu artır ─────────────────── */
export function bumpInventoryVersion(state) {
  state.inventory._version = (state.inventory._version || 0) + 1;
}

/**
 * Envanter anahtarı hesaplar.
 * rarity normal veya tanımsızsa düz itemId, değilse `itemId__rarity` döner.
 * Tohum/fidan gibi rarity'siz ürünler her zaman düz anahtar kullanır.
 */
function inventoryKey(itemId, rarity) {
  if (rarity && rarity !== "normal") return `${itemId}__${rarity}`;
  return itemId;
}

/**
 * Anahtardan temel ürün ID'sini çıkarır. "kabak__nadir" → "kabak"
 */
export function baseItemIdOf(key) {
  const idx = key.indexOf("__");
  return idx >= 0 ? key.slice(0, idx) : key;
}

/**
 *_envanterdeki tüm entry'leri temel ID'ye göre bulur.
 * Tam eşleşme varsa onu da dahil eder (düz anahtar uyumluluğu için).
 */
function findInventoryEntries(items, baseId) {
  const result = [];
  for (const [key, entry] of Object.entries(items)) {
    if (key === baseId || baseItemIdOf(key) === baseId) {
      result.push({ key, entry });
    }
  }
  return result;
}

/* ─────────────────── Bina versiyonunu artır ─────────────────── */
export function bumpBuildingVersion(state) {
  state.buildings._version = (state.buildings._version || 0) + 1;
}

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
  return findInventoryEntries(state.inventory.items, itemId).length > 0;
}

/**
 * Ürünü envantere ekler. Envanter doluysa kuyruğa alır.
 * @returns {{success:boolean, queued:boolean, reason?:string}}
 */
/* ─────────────────── Öğe ekle ─────────────────── */
export function addItem(state, itemId, qty, meta) {
  if (qty <= 0) return { success: false, queued: false, reason: "eksik_miktar" };

  const items = state.inventory.items;
  const rarity = meta?.rarity;
  const key = inventoryKey(itemId, rarity);

  if (items[key]) {
    items[key].quantity += qty;
    if (meta) items[key].meta = { ...(items[key].meta || {}), ...meta };
    bumpInventoryVersion(state);
    return { success: true, queued: false };
  }

  if (isInventoryFull(state)) {
    state.inventory.queue.push({ itemId, qty, meta, source: meta?.source || "unknown" });
    bumpInventoryVersion(state);
    return { success: false, queued: true };
  }

  items[key] = { quantity: qty, meta: meta || {} };
  bumpInventoryVersion(state);
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

  if (consumed > 0) {
    queue.splice(0, consumed);
    bumpInventoryVersion(state);
  }

  return added;
}

/* ─────────────────── Öğe var mı ─────────────────── */
export function hasItem(state, itemId, qty) {
  const entries = findInventoryEntries(state.inventory.items, itemId);
  if (entries.length === 0) return false;
  const total = entries.reduce((sum, e) => sum + e.entry.quantity, 0);
  return total >= qty;
}

/* ─────────────────── Envanterdeki toplam miktar ─────────────────── */
export function countItemQuantity(state, itemId) {
  const entries = findInventoryEntries(state.inventory.items, itemId);
  return entries.reduce((sum, e) => sum + e.entry.quantity, 0);
}

/* ─────────────────── Öğeyi kaldır ─────────────────── */
export function removeItem(state, itemId, qty) {
  const items = state.inventory.items;

  // Tam eşleşme varsa onu kullan (düz anahtar veya belirli bir nadirlik)
  if (items[itemId] && items[itemId].quantity >= qty) {
    items[itemId].quantity -= qty;
    if (items[itemId].quantity <= 0) delete items[itemId];
    bumpInventoryVersion(state);
    return true;
  }

  // Temel ID ile tüm varyansları bul, önce normal olanları tüket
  const entries = findInventoryEntries(items, itemId);
  if (entries.length === 0) return false;

  entries.sort((a, b) => {
    const ra = (a.entry.meta?.rarity || "normal") === "normal" ? 0 : 1;
    const rb = (b.entry.meta?.rarity || "normal") === "normal" ? 0 : 1;
    return ra - rb;
  });

  let remaining = qty;
  for (const { key, entry } of entries) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, entry.quantity);
    entry.quantity -= take;
    remaining -= take;
    if (entry.quantity <= 0) delete items[key];
  }

  if (remaining < qty) {
    bumpInventoryVersion(state);
    return true;
  }
  return false;
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
  bumpBuildingVersion(state);
  return true;
}
