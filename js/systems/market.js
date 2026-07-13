// js/systems/market.js
import { CROPS } from "../data/crops.js";
import { TREES } from "../data/trees.js";
import { addItem, hasItem, removeItem } from "../state.js";
import { getWeather } from "./weather.js";
import { BUILDING_TYPES, capacityForLevel } from "../data/animals.js";

export const MARKET_REFRESH_SECONDS = 120; // 2 dakika
const BULK_DISCOUNT = 0.10; // toplu alımda %10 indirim

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
  const saplingSlots = state.market.saplingSlots;

  const listings = [];

  function rollPriceMultiplier() {
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
    const priceMultiplier = rollPriceMultiplier();
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
    const priceMultiplier = rollPriceMultiplier();
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

  // Hayvanlar: sabit 3 slot, her biri 1 adet, rastgele fiyat
  for (const entry of MARKET_ANIMALS) {
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

export function tickMarket(state, dtSeconds) {
  state.market.secondsSinceRefresh += dtSeconds;
  if (state.market.secondsSinceRefresh >= MARKET_REFRESH_SECONDS || state.market.listings.length === 0) {
    state.market.secondsSinceRefresh = 0;
    state.market.listings = generateMarketCycle(state);
  }
}

/** Tekli satın alma: 1 adet alır, kalan azalır. Hayvan ise binaya ekler. */
export function buyOneSeed(state, listingIndex, deductGold, playerGold) {
  const listing = state.market.listings[listingIndex];
  if (!listing) return { success: false, reason: "gecersiz_liste" };
  if (listing.remaining <= 0) return { success: false, reason: "tukendi" };

  const cost = listing.pricePerUnit;
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };

  if (listing.category === "animal") {
    const building = state.buildings[listing.buildingType];
    const capacity = capacityForLevel(listing.buildingType, building.level);
    if (building.population >= capacity) return { success: false, reason: "kapasite_dolu" };
    deductGold(cost);
    building.population += 1;
  } else {
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
    const building = state.buildings[listing.buildingType];
    const capacity = capacityForLevel(listing.buildingType, building.level);
    if (building.population >= capacity) return { success: false, reason: "kapasite_dolu" };
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
  const total = actualPrice * qty;
  addGold(total);
  return { success: true, total };
}
