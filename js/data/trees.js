// js/data/trees.js
// Bahçe/fidanlık meyve ağaçları — 20 çeşit, 4 kademe. Ağaçlar tarlaya göre daha
// uzun büyür ama çoğu "recurring" olarak tekrar meyve verir (ağacı kesip yeniden
// dikmek gerekmez).

export const TREES = [
  // ---- Tier 1 — 60-90 saniye (~5-7 gün) ----
  { id: "elma", name: "Elma", tier: 1, seasons: ["sonbahar"], growthDays: 6, harvestCycle: "recurring", recurringIntervalDays: 4, buyPrice: 5, sellPrice: 3 },
  { id: "armut", name: "Armut", tier: 1, seasons: ["sonbahar"], growthDays: 6, harvestCycle: "recurring", recurringIntervalDays: 4, buyPrice: 5, sellPrice: 3 },
  { id: "dut", name: "Dut", tier: 1, seasons: ["yaz"], growthDays: 5, harvestCycle: "recurring", recurringIntervalDays: 3, buyPrice: 4, sellPrice: 2 },
  { id: "erik", name: "Erik", tier: 1, seasons: ["yaz"], growthDays: 6, harvestCycle: "recurring", recurringIntervalDays: 4, buyPrice: 5, sellPrice: 3 },
  { id: "muz", name: "Muz", tier: 1, seasons: ["yaz", "sonbahar"], growthDays: 7, harvestCycle: "recurring", recurringIntervalDays: 4, buyPrice: 6, sellPrice: 3 },

  // ---- Tier 2 — 90-150 saniye (~8-12 gün) ----
  { id: "kayisi", name: "Kayısı", tier: 2, seasons: ["ilkbahar"], growthDays: 8, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 15, sellPrice: 9 },
  { id: "seftali", name: "Şeftali", tier: 2, seasons: ["yaz"], growthDays: 8, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 15, sellPrice: 9 },
  { id: "visne", name: "Vişne", tier: 2, seasons: ["yaz"], growthDays: 9, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 16, sellPrice: 9 },
  { id: "kiraz", name: "Kiraz", tier: 2, seasons: ["ilkbahar", "yaz"], growthDays: 9, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 16, sellPrice: 10 },
  { id: "ayva", name: "Ayva", tier: 2, seasons: ["sonbahar"], growthDays: 8, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 15, sellPrice: 9 },

  // ---- Tier 3 — 150-240 saniye (~12-20 gün) ----
  { id: "portakal", name: "Portakal", tier: 3, seasons: ["kış"], growthDays: 12, harvestCycle: "recurring", recurringIntervalDays: 7, buyPrice: 40, sellPrice: 24 },
  { id: "limon", name: "Limon", tier: 3, seasons: ["kış", "ilkbahar"], growthDays: 12, harvestCycle: "recurring", recurringIntervalDays: 7, buyPrice: 40, sellPrice: 24 },
  { id: "mandalina", name: "Mandalina", tier: 3, seasons: ["kış"], growthDays: 12, harvestCycle: "recurring", recurringIntervalDays: 7, buyPrice: 40, sellPrice: 24 },
  { id: "uzum", name: "Üzüm", tier: 3, seasons: ["yaz", "sonbahar"], growthDays: 14, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 38, sellPrice: 22 },
  { id: "zeytin", name: "Zeytin", tier: 3, seasons: ["sonbahar"], growthDays: 16, harvestCycle: "recurring", recurringIntervalDays: 9, buyPrice: 42, sellPrice: 25 },

  // ---- Tier 4 — 180-300 saniye (~15-25 gün) ----
  { id: "kakao", name: "Kakao", tier: 4, seasons: ["yaz"], growthDays: 18, harvestCycle: "recurring", recurringIntervalDays: 10, buyPrice: 80, sellPrice: 48 },
  { id: "findik", name: "Fındık", tier: 4, seasons: ["sonbahar"], growthDays: 18, harvestCycle: "recurring", recurringIntervalDays: 10, buyPrice: 80, sellPrice: 48 },
  { id: "bambu", name: "Bambu", tier: 4, seasons: ["ilkbahar", "yaz"], growthDays: 15, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 70, sellPrice: 42 },
  { id: "incir", name: "İncir", tier: 4, seasons: ["yaz"], growthDays: 20, harvestCycle: "recurring", recurringIntervalDays: 11, buyPrice: 90, sellPrice: 54 },
  { id: "nar", name: "Nar", tier: 4, seasons: ["sonbahar"], growthDays: 20, harvestCycle: "recurring", recurringIntervalDays: 11, buyPrice: 90, sellPrice: 54 },
];

export function getTree(id) {
  return TREES.find((t) => t.id === id);
}
