// js/data/trees.js
// Bahçe/fidanlık meyve ağaçları — 20 çeşit, 4 kademe. Ağaçlar tarlaya göre daha
// uzun büyür ama çoğu "recurring" olarak tekrar meyve verir (ağacı kesip yeniden
// dikmek gerekmez).

export const TREES = [
  // ---- Tier 1 ----
  { id: "elma", name: "Elma", tier: 1, seasons: ["sonbahar"], growthDays: 8, harvestCycle: "recurring", recurringIntervalDays: 6, buyPrice: 15, sellPrice: 9 },
  { id: "armut", name: "Armut", tier: 1, seasons: ["sonbahar"], growthDays: 8, harvestCycle: "recurring", recurringIntervalDays: 6, buyPrice: 15, sellPrice: 9 },
  { id: "dut", name: "Dut", tier: 1, seasons: ["yaz"], growthDays: 7, harvestCycle: "recurring", recurringIntervalDays: 5, buyPrice: 14, sellPrice: 8 },
  { id: "erik", name: "Erik", tier: 1, seasons: ["yaz"], growthDays: 8, harvestCycle: "recurring", recurringIntervalDays: 6, buyPrice: 15, sellPrice: 9 },
  { id: "muz", name: "Muz", tier: 1, seasons: ["yaz", "sonbahar"], growthDays: 9, harvestCycle: "recurring", recurringIntervalDays: 6, buyPrice: 16, sellPrice: 9 },

  // ---- Tier 2 ----
  { id: "kayisi", name: "Kayısı", tier: 2, seasons: ["ilkbahar"], growthDays: 12, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 24, sellPrice: 14 },
  { id: "seftali", name: "Şeftali", tier: 2, seasons: ["yaz"], growthDays: 12, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 24, sellPrice: 14 },
  { id: "visne", name: "Vişne", tier: 2, seasons: ["yaz"], growthDays: 13, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 25, sellPrice: 14 },
  { id: "kiraz", name: "Kiraz", tier: 2, seasons: ["ilkbahar", "yaz"], growthDays: 13, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 25, sellPrice: 15 },
  { id: "ayva", name: "Ayva", tier: 2, seasons: ["sonbahar"], growthDays: 12, harvestCycle: "recurring", recurringIntervalDays: 8, buyPrice: 24, sellPrice: 14 },

  // ---- Tier 3 ----
  { id: "portakal", name: "Portakal", tier: 3, seasons: ["kış"], growthDays: 16, harvestCycle: "recurring", recurringIntervalDays: 10, buyPrice: 34, sellPrice: 20 },
  { id: "limon", name: "Limon", tier: 3, seasons: ["kış", "ilkbahar"], growthDays: 16, harvestCycle: "recurring", recurringIntervalDays: 10, buyPrice: 34, sellPrice: 20 },
  { id: "mandalina", name: "Mandalina", tier: 3, seasons: ["kış"], growthDays: 16, harvestCycle: "recurring", recurringIntervalDays: 10, buyPrice: 34, sellPrice: 20 },
  { id: "uzum", name: "Üzüm", tier: 3, seasons: ["yaz", "sonbahar"], growthDays: 14, harvestCycle: "recurring", recurringIntervalDays: 9, buyPrice: 32, sellPrice: 19 },
  { id: "zeytin", name: "Zeytin", tier: 3, seasons: ["sonbahar"], growthDays: 18, harvestCycle: "recurring", recurringIntervalDays: 11, buyPrice: 36, sellPrice: 21 },

  // ---- Tier 4 ----
  { id: "kakao", name: "Kakao", tier: 4, seasons: ["yaz"], growthDays: 20, harvestCycle: "recurring", recurringIntervalDays: 12, buyPrice: 46, sellPrice: 27 },
  { id: "findik", name: "Fındık", tier: 4, seasons: ["sonbahar"], growthDays: 20, harvestCycle: "recurring", recurringIntervalDays: 12, buyPrice: 46, sellPrice: 27 },
  { id: "bambu", name: "Bambu", tier: 4, seasons: ["ilkbahar", "yaz"], growthDays: 18, harvestCycle: "recurring", recurringIntervalDays: 10, buyPrice: 40, sellPrice: 24 },
  { id: "incir", name: "İncir", tier: 4, seasons: ["yaz"], growthDays: 22, harvestCycle: "recurring", recurringIntervalDays: 13, buyPrice: 48, sellPrice: 28 },
  { id: "nar", name: "Nar", tier: 4, seasons: ["sonbahar"], growthDays: 22, harvestCycle: "recurring", recurringIntervalDays: 13, buyPrice: 48, sellPrice: 28 },
];

export function getTree(id) {
  return TREES.find((t) => t.id === id);
}
