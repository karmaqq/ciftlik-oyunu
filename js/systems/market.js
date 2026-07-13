// js/systems/market.js
import { CROPS } from "../data/crops.js";
import { TREES } from "../data/trees.js";
import { addItem, hasItem, removeItem } from "../state.js";
import { getWeather } from "./weather.js";

export const MARKET_REFRESH_SECONDS = 120; // 2 dakika
const LISTING_COUNT = 6;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Yeni market döngüsü üretir: rastgele ürünlerden 1-9 arası toplu satış teklifleri. */
export function generateMarketCycle() {
  const pool = [
    ...CROPS.map((c) => ({ itemId: c.id, seedId: `${c.id}_tohum`, price: c.buyPrice })),
    ...TREES.map((t) => ({ itemId: t.id, seedId: `${t.id}_fidan`, price: t.buyPrice })),
  ];

  const listings = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, LISTING_COUNT);

  for (const entry of shuffled) {
    const priceMultiplier = 0.85 + Math.random() * 0.4; // %85 - %125 arası dalgalanma
    listings.push({
      itemId: entry.itemId,
      seedId: entry.seedId,
      bulkQty: randomInt(1, 9),
      pricePerUnit: Math.max(1, Math.round(entry.price * priceMultiplier)),
    });
  }

  return listings;
}

export function tickMarket(state, dtSeconds) {
  state.market.secondsSinceRefresh += dtSeconds;
  if (state.market.secondsSinceRefresh >= MARKET_REFRESH_SECONDS || state.market.listings.length === 0) {
    state.market.secondsSinceRefresh = 0;
    state.market.listings = generateMarketCycle();
  }
}

/** Market listesindeki tohum/fidanı satın alır (toplu, bulkQty kadar). */
export function buyListingSeed(state, listingIndex, deductGold, playerGold) {
  const listing = state.market.listings[listingIndex];
  if (!listing) return { success: false, reason: "gecersiz_liste" };

  const totalCost = listing.pricePerUnit * listing.bulkQty;
  if (playerGold < totalCost) return { success: false, reason: "yetersiz_altin" };

  deductGold(totalCost);
  addItem(state, listing.seedId, listing.bulkQty);
  return { success: true, cost: totalCost, qty: listing.bulkQty };
}

/** Envanterdeki hasat edilmiş ürünü satar. Kötü hava koşulunda ticaret kaybı riski vardır. */
export function sellItem(state, itemId, qty, sellPrice, addGold) {
  if (!hasItem(state, itemId, qty)) return { success: false, reason: "yetersiz_urun" };

  const tradeLossChance = getWeather(state.weather).tradeLossChance;
  if (Math.random() < tradeLossChance) {
    removeItem(state, itemId, qty); // ürün kaybedilir, altın verilmez
    return { success: false, reason: "hava_kaynakli_ticaret_kaybi" };
  }

  removeItem(state, itemId, qty);
  const total = sellPrice * qty;
  addGold(total);
  return { success: true, total };
}

// Not: Hayvan satın alma systems/buildings.js -> buyAnimal() üzerinden yapılır
// (kapasite kontrolü de orada olduğu için tek yerde tutuldu).
