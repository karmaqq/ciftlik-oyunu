// js/data/crops.js
// Tarla ürünleri — 20 çeşit, 4 kademeye (tier) bölünmüş (kademe başına 5 ürün).
// harvestCycle: "once" (tek hasat, sonra slot boşalır) | "recurring" (belirli aralıkla tekrar hasat verir)

export const CROPS = [
  // ---- Tier 1 (kolay) ----
  { id: "bugday", name: "Buğday", tier: 1, seasons: ["ilkbahar", "yaz"], growthDays: 3, harvestCycle: "once", buyPrice: 4, sellPrice: 2 },
  { id: "misir", name: "Mısır", tier: 1, seasons: ["yaz"], growthDays: 4, harvestCycle: "once", buyPrice: 5, sellPrice: 3 },
  { id: "havuc", name: "Havuç", tier: 1, seasons: ["ilkbahar", "sonbahar"], growthDays: 3, harvestCycle: "once", buyPrice: 4, sellPrice: 2 },
  { id: "patates", name: "Patates", tier: 1, seasons: ["ilkbahar", "yaz"], growthDays: 4, harvestCycle: "once", buyPrice: 5, sellPrice: 3 },
  { id: "marul", name: "Marul", tier: 1, seasons: ["ilkbahar", "sonbahar", "kış"], growthDays: 3, harvestCycle: "once", buyPrice: 4, sellPrice: 2 },

  // ---- Tier 2 (orta) ----
  { id: "domates", name: "Domates", tier: 2, seasons: ["yaz"], growthDays: 5, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 10, sellPrice: 6 },
  { id: "biber", name: "Biber", tier: 2, seasons: ["yaz"], growthDays: 5, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 10, sellPrice: 6 },
  { id: "kabak", name: "Kabak", tier: 2, seasons: ["yaz", "sonbahar"], growthDays: 6, harvestCycle: "recurring", recurringIntervalDays: 6, buyPrice: 11, sellPrice: 6 },
  { id: "fasulye", name: "Fasulye", tier: 2, seasons: ["ilkbahar", "yaz"], growthDays: 5, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 10, sellPrice: 6 },
  { id: "pirinc", name: "Pirinç", tier: 2, seasons: ["yaz"], growthDays: 6, harvestCycle: "once", buyPrice: 12, sellPrice: 7 },

  // ---- Tier 3 (zor) ----
  { id: "cilek", name: "Çilek", tier: 3, seasons: ["ilkbahar"], growthDays: 7, harvestCycle: "recurring", recurringIntervalDays: 6, buyPrice: 18, sellPrice: 11 },
  { id: "ahududu", name: "Ahududu", tier: 3, seasons: ["ilkbahar", "yaz"], growthDays: 7, harvestCycle: "recurring", recurringIntervalDays: 6, buyPrice: 18, sellPrice: 11 },
  { id: "seker_pancari", name: "Şeker Pancarı", tier: 3, seasons: ["sonbahar"], growthDays: 8, harvestCycle: "once", buyPrice: 20, sellPrice: 12 },
  { id: "seker_kamisi", name: "Şeker Kamışı", tier: 3, seasons: ["yaz"], growthDays: 8, harvestCycle: "once", buyPrice: 20, sellPrice: 12 },
  { id: "bal_kabagi", name: "Bal Kabağı", tier: 3, seasons: ["sonbahar"], growthDays: 7, harvestCycle: "once", buyPrice: 19, sellPrice: 11 },

  // ---- Tier 4 (çok zor) ----
  { id: "ay_cicegi", name: "Ay Çiçeği", tier: 4, seasons: ["yaz"], growthDays: 9, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 28, sellPrice: 17 },
  { id: "cay_yapragi", name: "Çay Yaprağı", tier: 4, seasons: ["ilkbahar", "yaz", "sonbahar"], growthDays: 9, harvestCycle: "recurring", recurringIntervalDays: 7, buyPrice: 28, sellPrice: 17 },
  { id: "sogan", name: "Soğan", tier: 4, seasons: ["sonbahar", "kış"], growthDays: 9, harvestCycle: "once", buyPrice: 27, sellPrice: 16 },
  { id: "sarimsak", name: "Sarımsak", tier: 4, seasons: ["sonbahar", "kış"], growthDays: 10, harvestCycle: "once", buyPrice: 30, sellPrice: 18 },
  { id: "nohut", name: "Nohut", tier: 4, seasons: ["ilkbahar"], growthDays: 10, harvestCycle: "once", buyPrice: 30, sellPrice: 18 },
];

export function getCrop(id) {
  return CROPS.find((c) => c.id === id);
}
