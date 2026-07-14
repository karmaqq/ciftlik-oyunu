// js/systems/market.js
import { CROPS } from "../data/crops.js";
import { TREES } from "../data/trees.js";
import { addItem, hasItem, removeItem } from "../state.js";
import { getWeather } from "./weather.js";
import { BUILDING_TYPES, capacityForLevel } from "../data/animals.js";
import { getCalendarBuyMultiplier, getCalendarSellMultiplier } from "./calendarTrade.js";

export const MARKET_REFRESH_SECONDS = 120;
const BULK_DISCOUNT = 0.10;

let lastRefreshTimestamp = Date.now();

function countInventorySlots(state) {
  return Object.keys(state.inventory.items).length;
}

function isInventoryFull(state) {
  return countInventorySlots(state) >= state.inventory.maxSlots;
}

function hasItemInInventory(state, itemId) {
  return !!state.inventory.items[itemId];
}

const MARKET_ANIMALS = [
  { buildingType: "hive", label: "Arı", emoji: "🐝", basePrice: 6 },
  { buildingType: "coop", label: "Tavuk", emoji: "🐔", basePrice: 10 },
  { buildingType: "barn", label: "İnek", emoji: "🐄", basePrice: 40 },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Yeni market döngüsü: kategori bazlı slot sistemi. */
export function generateMarketCycle(state) {
  const seedSlots = state.market.seedSlots;
  const saplingSlots = state.features && state.features.orchard ? state.market.saplingSlots : 0;

  const listings = [];

  const calendarActive = state.features && state.features.calendar;

  function rollPriceMultiplier() {
    if (!calendarActive) return 1;
    const roll = Math.random();
    if (roll < 0.05) return 0;         // %5 bedava
    if (roll < 0.40) return 0.01 + Math.random() * 0.98; // %35 indirim (0.01–0.99)
    if (roll < 0.50) return 1;         // %10 normal fiyat
    if (roll < 0.95) return 1.01 + Math.random() * 0.98; // %45 pahalı (1.01–1.99)
    return 2;                           // %5 tam pahalı
  }

  const seedPool = CROPS.map((c) => ({ itemId: c.id, seedId: `${c.id}_tohum`, basePrice: c.buyPrice }));
  const shuffledSeeds = [...seedPool].sort(() => Math.random() - 0.5).slice(0, seedSlots);
  for (const entry of shuffledSeeds) {
    let priceMultiplier = rollPriceMultiplier();
    if (calendarActive) {
      priceMultiplier *= getCalendarBuyMultiplier(state, "seed");
    }
    const remaining = randomInt(1, 12);
    listings.push({
      itemId: entry.itemId,
      seedId: entry.seedId,
      basePrice: entry.basePrice,
      pricePerUnit: Math.max(0, Math.round(entry.basePrice * priceMultiplier)),
      priceMultiplier,
      remaining,
      category: "seed",
    });
  }

  const saplingPool = TREES.map((t) => ({ itemId: t.id, seedId: `${t.id}_fidan`, basePrice: t.buyPrice }));
  const shuffledSaplings = [...saplingPool].sort(() => Math.random() - 0.5).slice(0, saplingSlots);
  for (const entry of shuffledSaplings) {
    let priceMultiplier = rollPriceMultiplier();
    if (calendarActive) {
      priceMultiplier *= getCalendarBuyMultiplier(state, "sapling");
    }
    const remaining = randomInt(1, 12);
    listings.push({
      itemId: entry.itemId,
      seedId: entry.seedId,
      basePrice: entry.basePrice,
      pricePerUnit: Math.max(0, Math.round(entry.basePrice * priceMultiplier)),
      priceMultiplier,
      remaining,
      category: "sapling",
    });
  }

  // Hayvanlar: sadece satın alınmış binalar için
  const activeAnimals = MARKET_ANIMALS.filter((a) => {
    if (a.buildingType === "hive") return state.features && state.features.hive;
    if (a.buildingType === "coop") return state.features && state.features.coop;
    if (a.buildingType === "barn") return state.features && state.features.barn;
    return false;
  });

  for (const entry of activeAnimals) {
    const priceMultiplier = rollPriceMultiplier();
    const finalPrice = Math.max(0, Math.round(entry.basePrice * priceMultiplier));
    listings.push({
      buildingType: entry.buildingType,
      label: entry.label,
      emoji: entry.emoji,
      basePrice: entry.basePrice,
      pricePerUnit: finalPrice,
      priceMultiplier,
      remaining: 1,
      category: "animal",
    });
  }

  return listings;
}

export function tickMarket(state) {
  const now = Date.now();
  const elapsed = Math.floor((now - lastRefreshTimestamp) / 1000);

  if (state.market.listings.length === 0) {
    lastRefreshTimestamp = now;
    state.market.lastRefreshTimestamp = now;
    state.market.listings = generateMarketCycle(state);
    state.market.secondsSinceRefresh = 0;
    return;
  }

  if (elapsed >= MARKET_REFRESH_SECONDS) {
    lastRefreshTimestamp = now;
    state.market.lastRefreshTimestamp = now;
    state.market.listings = generateMarketCycle(state);
    state.market.secondsSinceRefresh = 0;
    if (window._gameLog) {
      window._gameLog("Pazar yenilendi! Yeni ürünler mevcut.", "trade");
    }
  } else {
    state.market.secondsSinceRefresh = elapsed;
  }
}

export function initMarketTimestamp(savedTimestamp, state) {
  if (savedTimestamp && typeof savedTimestamp === "number") {
    lastRefreshTimestamp = savedTimestamp;
  } else {
    lastRefreshTimestamp = Date.now();
  }

  const now = Date.now();
  const elapsed = Math.floor((now - lastRefreshTimestamp) / 1000);

  if (elapsed >= MARKET_REFRESH_SECONDS || state.market.listings.length === 0) {
    lastRefreshTimestamp = now;
    state.market.lastRefreshTimestamp = now;
    state.market.listings = generateMarketCycle(state);
    state.market.secondsSinceRefresh = 0;
  } else {
    state.market.secondsSinceRefresh = elapsed;
  }
}

export function getMarketTimestamp() {
  return lastRefreshTimestamp;
}

/** Tekli satın alma: 1 adet alır, kalan azalır. Hayvan ise binaya ekler. */
export function buyOneSeed(state, listingIndex, deductGold, playerGold) {
  const listing = state.market.listings[listingIndex];
  if (!listing) return { success: false, reason: "gecersiz_liste" };
  if (listing.remaining <= 0) return { success: false, reason: "tukendi" };

  if (listing.category === "animal") {
    if (!state.features || !state.features[listing.buildingType]) return { success: false, reason: "bina_kilitli" };
    const building = state.buildings[listing.buildingType];
    const capacity = capacityForLevel(listing.buildingType, building.level);
    if (building.population >= capacity) return { success: false, reason: "kapasite_dolu" };
  }

  const cost = listing.pricePerUnit;
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };

  if (listing.category === "animal") {
    const building = state.buildings[listing.buildingType];
    deductGold(cost);
    building.population += 1;
  } else {
    if (!hasItemInInventory(state, listing.seedId) && isInventoryFull(state)) {
      return { success: false, reason: "envanter_dolu" };
    }
    deductGold(cost);
    addItem(state, listing.seedId, 1);
  }
  listing.remaining -= 1;
  return { success: true, cost, qty: 1 };
}

/** Toplu satın alma: kalanın tamamını %10 indirimli alır. */
export function buyAllSeeds(state, listingIndex, deductGold, playerGold) {
  const listing = state.market.listings[listingIndex];
  if (!listing) return { success: false, reason: "gecersiz_liste" };
  if (listing.remaining <= 0) return { success: false, reason: "tukendi" };

  if (listing.category === "animal") {
    if (!state.features || !state.features[listing.buildingType]) return { success: false, reason: "bina_kilitli" };
    const building = state.buildings[listing.buildingType];
    const capacity = capacityForLevel(listing.buildingType, building.level);
    if (building.population >= capacity) return { success: false, reason: "kapasite_dolu" };
  } else {
    if (!hasItemInInventory(state, listing.seedId) && isInventoryFull(state)) {
      return { success: false, reason: "envanter_dolu" };
    }
  }

  const qty = listing.remaining;
  const totalCost = Math.round(listing.pricePerUnit * qty * (1 - BULK_DISCOUNT));
  if (playerGold < totalCost) return { success: false, reason: "yetersiz_altin" };

  if (listing.category === "animal") {
    const building = state.buildings[listing.buildingType];
    deductGold(totalCost);
    building.population += 1;
    listing.remaining = 0;
    return { success: true, cost: totalCost, qty: 1 };
  }

  deductGold(totalCost);
  addItem(state, listing.seedId, qty);
  listing.remaining = 0;
  return { success: true, cost: totalCost, qty };
}

/** Toplu alım indirim oranını dışarıya aç (info gösterimi için). */
export function getBulkDiscountPercent() {
  return Math.round(BULK_DISCOUNT * 100);
}

/** Envanterdeki hasat edilmiş ürünü satar. */
export function sellItem(state, itemId, qty, sellPrice, addGold, itemMeta) {
  if (!hasItem(state, itemId, qty)) return { success: false, reason: "yetersiz_urun" };

  const tradeLossChance = getWeather(state.weather).tradeLossChance;
  if (Math.random() < tradeLossChance) {
    removeItem(state, itemId, qty);
    return { success: false, reason: "hava_kaynakli_ticaret_kaybi" };
  }

  const actualPrice = (itemMeta && itemMeta.sellPriceOverride) || sellPrice;
  removeItem(state, itemId, qty);

  // Takvim ticaret satış çarpanı uygula
  const rarity = (itemMeta && itemMeta.rarity) || "normal";
  const calendarSellMult = getCalendarSellMultiplier(state, rarity);

  const total = Math.round(actualPrice * qty * calendarSellMult);
  addGold(total);
  return { success: true, total };
}
