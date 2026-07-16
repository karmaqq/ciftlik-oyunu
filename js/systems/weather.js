/* ═══════════════════════════════════════════════════════════════════════════ */
/*                         Hava durumu sistemi                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/systems/weather.js
// Her in-game gün başında (day değiştiğinde) hava koşulu yeniden belirlenir.

/* ─────────────────── Hava durumu türleri ─────────────────── */
export const WEATHER_TYPES = {
  normal: { id: "normal", name: "Normal", growthSpeedMultiplier: 1, tradeLossChance: 0, rarityChance: {} },
  yagmurlu: { id: "yagmurlu", name: "Yağmurlu", growthSpeedMultiplier: 1.15, tradeLossChance: 0, rarityChance: { nadir: 0.05 } },
  kurak: { id: "kurak", name: "Kurak", growthSpeedMultiplier: 0.7, tradeLossChance: 0.05, rarityChance: {} },
  firtina: { id: "firtina", name: "Fırtına", growthSpeedMultiplier: 0.6, tradeLossChance: 0.1, rarityChance: {} },
  gokkusagi: { id: "gokkusagi", name: "Gökkuşağı (Özel)", growthSpeedMultiplier: 1.1, tradeLossChance: 0, rarityChance: { nadir: 0.2, legendary: 0.05, gizemli: 0.01 } },
};

// Ağırlıklı rastgele seçim: normal koşullar daha sık, özel/kötü koşullar seyrek.
const WEATHER_WEIGHTS = [
  ["normal", 55],
  ["yagmurlu", 20],
  ["kurak", 12],
  ["firtina", 8],
  ["gokkusagi", 5],
];

/* ─────────────────── İlk hava durumunu oluştur ─────────────────── */
export function createInitialWeather() {
  return { current: "normal" };
}

/* ─────────────────── Yeni hava durumu belirle ─────────────────── */
export function rollNewWeather() {
  const total = WEATHER_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of WEATHER_WEIGHTS) {
    if (roll < weight) return id;
    roll -= weight;
  }
  return "normal";
}

/* ─────────────────── Mevcut hava durumunu al ─────────────────── */
export function getWeather(weatherState) {
  return WEATHER_TYPES[weatherState.current];
}

/**
 * Hasat sırasında nadirlik (rarity) belirler.
 * @returns {"normal"|"nadir"|"legendary"|"gizemli"}
 */
/* ─────────────────── Nadirlik şansı hesapla ─────────────────── */
export function rollRarity(weatherState) {
  const w = getWeather(weatherState);
  const roll = Math.random();
  let cumulative = 0;
  // en nadirden en yaygına doğru kontrol et
  for (const tier of ["gizemli", "legendary", "nadir"]) {
    const chance = w.rarityChance[tier] || 0;
    cumulative += chance;
    if (roll < cumulative) return tier;
  }
  return "normal";
}

/* ─────────────────── Nadirlik satış çarpanı ─────────────────── */
export const RARITY_SELL_MULTIPLIER = {
  normal: 1,
  nadir: 1.5,
  legendary: 3,
  gizemli: 6,
};
