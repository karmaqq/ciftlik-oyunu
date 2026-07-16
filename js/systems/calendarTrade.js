// js/systems/calendarTrade.js
// Takvim Ticaret mekaniği: Mevsim ve hava durumuna göre fiyat çarpanları.
// sadece state.features.calendar true olduğunda aktif.

import { currentSeason, MONTHS } from "./time.js";
import { getWeather } from "./weather.js";

// Mevsimsel fiyat çarpanları (satış fiyatı için)
const SEASON_SELL_MULTIPLIER = {
  ilkbahar: 1.05,   // +%
  yaz: 1.10,        // +%
  sonbahar: 0.90,   // -%
  kış: 0.80,        // -%
};

// Mevsimsel alış fiyat çarpanları (tohum/fidan için)
const SEASON_BUY_MULTIPLIER = {
  ilkbahar: 0.85,   // Tohumlar ucuz (ekim zamanı)
  yaz: 1.05,        // Normal + az zam
  sonbahar: 1.10,   // Hasat zamanı pahalı
  kış: 1.20,        // Kış zamlı
};

// Mevsimsel fidan fiyat çarpanları
const SEASON_SAPLING_MULTIPLIER = {
  ilkbahar: 1.10,   // Fidanlar pahalı (talep yüksek)
  yaz: 0.90,        // Fidanlar ucuz
  sonbahar: 1.05,   // Normal
  kış: 1.15,        // Kış zamlı
};

// Hava durumu ek çarpanları
const WEATHER_BUY_MULTIPLIER = {
  normal: 1.0,
  yagmurlu: 0.95,   // -%5 genel ucuzluk
  kurak: 1.10,      // +%10 genel zam
  firtina: 1.20,    // +%20 genel zam
  gokkusagi: 0.85,  // -%15 genel ucuzluk (özel gün)
};

// Nadir ürünler için ekstra çarpan
const WEATHER_RARITY_BONUS = {
  gokkusagi: 0.80,  // Nadir ürünlerde -%20
};

/**
 * Takvim Ticaret aktifken alış fiyatına uygulanacak çarpanı hesaplar.
 * @param {object} state - Oyun durumu
 * @param {string} category - "seed" | "sapling" | "animal"
 * @returns {number} Fiyat çarpanı (1.0 = normal)
 */
export function getCalendarBuyMultiplier(state, category) {
  if (!state.features || !state.features.calendar) return 1.0;

  const season = currentSeason(state.time);
  const weather = getWeather(state.weather);

  let multiplier = 1.0;

  // Mevsimsel etki
  if (category === "seed") {
    multiplier *= SEASON_BUY_MULTIPLIER[season] || 1.0;
  } else if (category === "sapling") {
    multiplier *= SEASON_SAPLING_MULTIPLIER[season] || 1.0;
  }
  // Hayvanlar mevsimden etkilenmez (sabit fiyat)

  // Hava durumu etkisi
  multiplier *= WEATHER_BUY_MULTIPLIER[weather.id] || 1.0;

  return Math.round(multiplier);
}

/**
 * Takvim Ticaret aktifken satış fiyatına uygulanacak çarpanı hesaplar.
 * @param {object} state - Oyun durumu
 * @param {string} rarity - "normal" | "nadir" | "efsanevi" | "gizemli"
 * @returns {number} Fiyat çarpanı (1.0 = normal)
 */
export function getCalendarSellMultiplier(state, rarity) {
  if (!state.features || !state.features.calendar) return 1.0;

  const season = currentSeason(state.time);
  const weather = getWeather(state.weather);

  let multiplier = 1.0;

  // Mevsimsel satış etkisi
  multiplier *= SEASON_SELL_MULTIPLIER[season] || 1.0;

  // Hava durumu satış etkisi (sadece nadir ürünler)
  if (rarity && rarity !== "normal" && WEATHER_RARITY_BONUS[weather.id]) {
    multiplier *= WEATHER_RARITY_BONUS[weather.id];
  }

  return Math.round(multiplier);
}

/**
 * Takvim Ticaret bilgisini oluşturur.
 * @param {object} state - Oyun durumu
 * @returns {object} { season, seasonEffect, weather, buyMultiplier, sellMultiplier }
 */
export function getCalendarTradeInfo(state) {
  if (!state.features || !state.features.calendar) {
    return { active: false };
  }

  const season = currentSeason(state.time);
  const weather = getWeather(state.weather);

  const seasonNames = { ilkbahar: "İlkbahar", yaz: "Yaz", sonbahar: "Sonbahar", kış: "Kış" };

  const seasonEffects = {
    ilkbahar: "Tohumlar ucuz, fidanlar pahalı",
    yaz: "Meyveler ucuz, genel denge",
    sonbahar: "Hasat ürünleri ucuz, satışlar düşük",
    kış: "Her şey pahalı, narenciye istisnası",
  };

  const weatherEffects = {
    normal: "Normal fiyatlar",
    yagmurlu: "Genel -%5 indirim",
    kurak: "Genel +%10 zam",
    firtina: "Genel +%20 zam, yüksek risk",
    gokkusagi: "Genel -%15 indirim, nadir ürünlerde额外 indirim",
  };

  return {
    active: true,
    season,
    seasonName: seasonNames[season] || season,
    seasonEffect: seasonEffects[season] || "",
    weather: weather.name,
    weatherEffect: weatherEffects[weather.id] || "",
    buyMultiplierSeed: getCalendarBuyMultiplier(state, "seed"),
    buyMultiplierSapling: getCalendarBuyMultiplier(state, "sapling"),
    sellMultiplier: getCalendarSellMultiplier(state, "normal"),
  };
}
