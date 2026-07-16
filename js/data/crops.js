/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Tarla ürünleri verileri                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/data/crops.js
// Tarla ürünleri — 20 çeşit, 4 kademeye (tier) bölünmüş (kademe başına 5 ürün).
// harvestCycle: "once" (tek hasat, sonra slot boşalır) | "recurring" (belirli aralıkla tekrar hasat verir)

/* ─────────────────── Ürün verileri ─────────────────── */
export const CROPS = [
  // ---- Tier 1 (kolay) — 15-30 saniye (~1-2.5 gün) ----
  { id: "bugday", name: "Buğday", tier: 1, seasons: ["ilkbahar", "yaz"], growthDays: 2, harvestCycle: "once", buyPrice: 2, sellPrice: 1 },
  { id: "misir", name: "Mısır", tier: 1, seasons: ["yaz"], growthDays: 2, harvestCycle: "once", buyPrice: 3, sellPrice: 2 },
  { id: "havuc", name: "Havuç", tier: 1, seasons: ["ilkbahar", "sonbahar"], growthDays: 2, harvestCycle: "once", buyPrice: 2, sellPrice: 1 },
  { id: "patates", name: "Patates", tier: 1, seasons: ["ilkbahar", "yaz"], growthDays: 2, harvestCycle: "once", buyPrice: 3, sellPrice: 2 },
  { id: "marul", name: "Marul", tier: 1, seasons: ["ilkbahar", "sonbahar", "kış"], growthDays: 1, harvestCycle: "once", buyPrice: 2, sellPrice: 1 },

  // ---- Tier 2 (orta) — 45-75 saniye (~4-6 gün) ----
  { id: "domates", name: "Domates", tier: 2, seasons: ["yaz"], growthDays: 4, harvestCycle: "recurring", recurringIntervalDays: 3, buyPrice: 8, sellPrice: 5 },
  { id: "biber", name: "Biber", tier: 2, seasons: ["yaz"], growthDays: 4, harvestCycle: "recurring", recurringIntervalDays: 3, buyPrice: 8, sellPrice: 5 },
  { id: "kabak", name: "Kabak", tier: 2, seasons: ["yaz", "sonbahar"], growthDays: 5, harvestCycle: "recurring", recurringIntervalDays: 4, buyPrice: 9, sellPrice: 5 },
  { id: "fasulye", name: "Fasulye", tier: 2, seasons: ["ilkbahar", "yaz"], growthDays: 4, harvestCycle: "recurring", recurringIntervalDays: 3, buyPrice: 8, sellPrice: 5 },
  { id: "pirinc", name: "Pirinç", tier: 2, seasons: ["yaz"], growthDays: 5, harvestCycle: "once", buyPrice: 10, sellPrice: 6 },

  // ---- Tier 3 (zor) — 90-150 saniye (~8-12 gün) ----
  { id: "cilek", name: "Çilek", tier: 3, seasons: ["ilkbahar"], growthDays: 8, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 22, sellPrice: 13 },
  { id: "ahududu", name: "Ahududu", tier: 3, seasons: ["ilkbahar", "yaz"], growthDays: 8, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 22, sellPrice: 13 },
  { id: "seker_pancari", name: "Şeker Pancarı", tier: 3, seasons: ["sonbahar"], growthDays: 10, harvestCycle: "once", buyPrice: 25, sellPrice: 15 },
  { id: "seker_kamisi", name: "Şeker Kamışı", tier: 3, seasons: ["yaz"], growthDays: 10, harvestCycle: "once", buyPrice: 25, sellPrice: 15 },
  { id: "bal_kabagi", name: "Bal Kabağı", tier: 3, seasons: ["sonbahar"], growthDays: 9, harvestCycle: "once", buyPrice: 23, sellPrice: 14 },

  // ---- Tier 4 (çok zor) — 180-300 saniye (~15-25 gün) ----
  { id: "ay_cicegi", name: "Ay Çiçeği", tier: 4, seasons: ["yaz"], growthDays: 15, harvestCycle: "recurring", recurringIntervalDays: 7, buyPrice: 50, sellPrice: 28 },
  { id: "cay_yapragi", name: "Çay Yaprağı", tier: 4, seasons: ["ilkbahar", "yaz", "sonbahar"], growthDays: 16, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 50, sellPrice: 28 },
  { id: "sogan", name: "Soğan", tier: 4, seasons: ["sonbahar", "kış"], growthDays: 18, harvestCycle: "once", buyPrice: 45, sellPrice: 25 },
  { id: "sarimsak", name: "Sarımsak", tier: 4, seasons: ["sonbahar", "kış"], growthDays: 20, harvestCycle: "once", buyPrice: 55, sellPrice: 30 },
  { id: "nohut", name: "Nohut", tier: 4, seasons: ["ilkbahar"], growthDays: 20, harvestCycle: "once", buyPrice: 55, sellPrice: 30 },
];

/* ─────────────────── Ürün bilgisini al ─────────────────── */
export function getCrop(id) {
  return CROPS.find((c) => c.id === id);
}
