// js/data/recipes.js
// Tarifler malzeme sayısına göre otomatik kademelendirilmiştir:
// 1 malzeme -> tier 1, 2 -> tier 2, 3 -> tier 3, 4+ -> tier 4.
// "learned" ilk üretimden sonra true olur (bkz. systems/crafting.js).

export const RECIPES = [
  // ==================== TIER 1 ====================
  { id: "peynir", name: "Peynir", tier: 1, inputs: [{ id: "sut", qty: 2 }], output: { id: "peynir", qty: 1 } },
  { id: "yogurt", name: "Yoğurt", tier: 1, inputs: [{ id: "sut", qty: 2 }], output: { id: "yogurt", qty: 1 } },
  { id: "maya", name: "Maya", tier: 1, inputs: [{ id: "sut", qty: 1 }], output: { id: "maya", qty: 1 } },
  { id: "limonata", name: "Limonata", tier: 1, inputs: [{ id: "limon", qty: 3 }], output: { id: "limonata", qty: 1 } },
  { id: "cikolata", name: "Çikolata", tier: 1, inputs: [{ id: "kakao", qty: 3 }], output: { id: "cikolata", qty: 1 } },
  { id: "cay", name: "Çay", tier: 1, inputs: [{ id: "cay_yapragi", qty: 2 }], output: { id: "cay", qty: 1 } },
  { id: "cerez_aycicegi", name: "Ay Çiçeği Çerezi", tier: 1, inputs: [{ id: "ay_cicegi", qty: 3 }], output: { id: "cerez_aycicegi", qty: 1 } },
  { id: "cerez_findik", name: "Fındık Çerezi", tier: 1, inputs: [{ id: "findik", qty: 3 }], output: { id: "cerez_findik", qty: 1 } },
  { id: "misir_unu", name: "Mısır Unu", tier: 1, inputs: [{ id: "misir", qty: 3 }], output: { id: "misir_unu", qty: 1 } },
  { id: "havuc_pure", name: "Havuç Püresi", tier: 1, inputs: [{ id: "havuc", qty: 3 }], output: { id: "havuc_pure", qty: 1 } },
  { id: "salca", name: "Salça", tier: 1, inputs: [{ id: "domates", qty: 2 }, { id: "biber", qty: 1 }], output: { id: "salca", qty: 1 } },
  { id: "zeytinyagi", name: "Zeytinyağı", tier: 1, inputs: [{ id: "zeytin", qty: 3 }], output: { id: "zeytinyagi", qty: 1 } },
  { id: "recel", name: "Reçel", tier: 1, inputs: [{ id: "cilek", qty: 2 }, { id: "seker_pancari", qty: 1 }], output: { id: "recel", qty: 1 } },
  { id: "erik_hosaf", name: "Erik Hoşafı", tier: 1, inputs: [{ id: "erik", qty: 3 }], output: { id: "erik_hosaf", qty: 1 } },
  { id: "nar_serbeti", name: "Nar Şerbeti", tier: 1, inputs: [{ id: "nar", qty: 3 }], output: { id: "nar_serbeti", qty: 1 } },
  { id: "findik_ezmesi", name: "Fındık Ezmesi", tier: 1, inputs: [{ id: "findik", qty: 2 }, { id: "bal", qty: 1 }], output: { id: "findik_ezmesi", qty: 1 } },
  { id: "yumurtali_ekmek", name: "Yumurtalı Ekmek", tier: 1, inputs: [{ id: "ekmek", qty: 1 }, { id: "yumurta", qty: 2 }], output: { id: "yumurtali_ekmek", qty: 1 } },
  { id: "muz_smoothie", name: "Muzlu Smoothie", tier: 1, inputs: [{ id: "muz", qty: 2 }, { id: "bal", qty: 1 }], output: { id: "muz_smoothie", qty: 1 } },
  { id: "pirinc_pilavi", name: "Pirinç Pilavı", tier: 1, inputs: [{ id: "pirinc", qty: 2 }, { id: "sogan", qty: 1 }], output: { id: "pirinc_pilavi", qty: 1 } },
  { id: "bal_kabagi_tatlisi", name: "Bal Kabağı Tatlısı", tier: 1, inputs: [{ id: "bal_kabagi", qty: 2 }, { id: "bal", qty: 1 }], output: { id: "bal_kabagi_tatlisi", qty: 1 } },
  { id: "visne_receli", name: "Vişne Reçeli", tier: 1, inputs: [{ id: "visne", qty: 3 }, { id: "seker_kamisi", qty: 1 }], output: { id: "visne_receli", qty: 1 } },
  { id: "fincan_cay", name: "Fincan Çay", tier: 1, inputs: [{ id: "cay", qty: 1 }, { id: "limon", qty: 1 }], output: { id: "fincan_cay", qty: 1 } },

  // ==================== TIER 2 ====================
  { id: "ekmek", name: "Ekmek", tier: 2, inputs: [{ id: "bugday", qty: 3 }, { id: "maya", qty: 1 }], output: { id: "ekmek", qty: 1 } },
  { id: "domates_corbasi", name: "Domates Çorbası", tier: 2, inputs: [{ id: "salca", qty: 1 }, { id: "sogan", qty: 1 }, { id: "maya", qty: 1 }], output: { id: "domates_corbasi", qty: 1 } },
  { id: "sebze_corbasi", name: "Sebze Çorbası", tier: 2, inputs: [{ id: "havuc_pure", qty: 1 }, { id: "patates", qty: 2 }, { id: "sogan", qty: 1 }], output: { id: "sebze_corbasi", qty: 1 } },
  { id: "baklava", name: "Baklava", tier: 2, inputs: [{ id: "misir_unu", qty: 1 }, { id: "bal", qty: 2 }, { id: "findik_ezmesi", qty: 1 }], output: { id: "baklava", qty: 1 } },
  { id: "meyve_salatasi", name: "Meyve Salatası", tier: 2, inputs: [{ id: "elma", qty: 1 }, { id: "armut", qty: 1 }, { id: "cilek", qty: 1 }, { id: "muz", qty: 1 }], output: { id: "meyve_salatasi", qty: 1 } },
  { id: "biberli_guvec", name: "Biberli Güveç", tier: 2, inputs: [{ id: "guvec", qty: 1 }, { id: "salca", qty: 1 }, { id: "sogan", qty: 1 }], output: { id: "biberli_guvec", qty: 1 } },
  { id: "incir_receli", name: "İncir Reçeli", tier: 2, inputs: [{ id: "incir", qty: 3 }, { id: "seker_pancari", qty: 1 }], output: { id: "incir_receli", qty: 1 } },
  { id: "komposto", name: "Kayısı Kompostosu", tier: 2, inputs: [{ id: "kayisi", qty: 3 }, { id: "seker_kamisi", qty: 1 }], output: { id: "komposto", qty: 1 } },
  { id: "soganli_ekmek", name: "Soğanlı Ekmek", tier: 2, inputs: [{ id: "ekmek", qty: 1 }, { id: "sogan", qty: 2 }], output: { id: "soganli_ekmek", qty: 1 } },
  { id: "ayvali_tatli", name: "Ayvalı Tatlı", tier: 2, inputs: [{ id: "ayva", qty: 3 }, { id: "bal", qty: 1 }], output: { id: "ayvali_tatli", qty: 1 } },
  { id: "mandalina_receli", name: "Mandalina Reçeli", tier: 2, inputs: [{ id: "mandalina", qty: 3 }, { id: "seker_pancari", qty: 1 }], output: { id: "mandalina_receli", qty: 1 } },
  { id: "tavuklu_pilav", name: "Tavuklu Pilav", tier: 2, inputs: [{ id: "tavuk_eti", qty: 1 }, { id: "pirinc_pilavi", qty: 1 }], output: { id: "tavuklu_pilav", qty: 1 } },

  // ==================== TIER 3 ====================
  { id: "guvec", name: "Güveç", tier: 3, inputs: [{ id: "patates", qty: 2 }, { id: "kabak", qty: 2 }, { id: "biber", qty: 2 }], output: { id: "guvec", qty: 1 } },
  { id: "zeytinyagli_yemek", name: "Zeytinyağlı Yemek", tier: 3, inputs: [{ id: "zeytinyagi", qty: 1 }, { id: "pirinc", qty: 2 }, { id: "sogan", qty: 1 }], output: { id: "zeytinyagli_yemek", qty: 1 } },
  { id: "findik_cikolatasi", name: "Fındık Çikolatası", tier: 3, inputs: [{ id: "cikolata", qty: 1 }, { id: "findik_ezmesi", qty: 1 }], output: { id: "findik_cikolatasi", qty: 1 } },
  { id: "humus", name: "Hummus", tier: 3, inputs: [{ id: "nohut", qty: 3 }, { id: "zeytinyagi", qty: 1 }, { id: "sarimsak", qty: 1 }], output: { id: "humus", qty: 1 } },
  { id: "manti", name: "Mantı", tier: 3, inputs: [{ id: "misir_unu", qty: 2 }, { id: "havuc_pure", qty: 1 }, { id: "inek_eti", qty: 1 }], output: { id: "manti", qty: 1 } },
  { id: "bonfile", name: "Bonfile", tier: 3, inputs: [{ id: "inek_eti", qty: 2 }, { id: "sarimsak", qty: 1 }, { id: "zeytinyagi", qty: 1 }], output: { id: "bonfile", qty: 1 } },
  { id: "meyve_kompostosu", name: "Meyve Kompostosu", tier: 3, inputs: [{ id: "komposto", qty: 1 }, { id: "nar_serbeti", qty: 1 }, { id: "cilek", qty: 2 }], output: { id: "meyve_kompostosu", qty: 1 } },
  { id: "balkabagi_corbasi", name: "Bal Kabağı Çorbası", tier: 3, inputs: [{ id: "bal_kabagi_tatlisi", qty: 1 }, { id: "sogan", qty: 1 }, { id: "sarimsak", qty: 1 }], output: { id: "balkabagi_corbasi", qty: 1 } },
  { id: "tarhana", name: "Tarhana", tier: 3, inputs: [{ id: "domates_corbasi", qty: 1 }, { id: "seker_pancari", qty: 1 }, { id: "biber", qty: 1 }], output: { id: "tarhana", qty: 1 } },
  { id: "tavuk_sote", name: "Tavuk Sote", tier: 3, inputs: [{ id: "tavuk_eti", qty: 2 }, { id: "biber", qty: 1 }, { id: "sogan", qty: 1 }, { id: "sarimsak", qty: 1 }], output: { id: "tavuk_sote", qty: 1 } },
  { id: "borek", name: "Börek", tier: 3, inputs: [{ id: "misir_unu", qty: 2 }, { id: "yumurta", qty: 2 }, { id: "peynir", qty: 1 }], output: { id: "borek", qty: 1 } },

  // ==================== TIER 4 ====================
  { id: "hamburger", name: "Hamburger", tier: 4, inputs: [{ id: "inek_eti", qty: 1 }, { id: "marul", qty: 1 }, { id: "domates", qty: 1 }, { id: "ekmek", qty: 1 }], output: { id: "hamburger", qty: 1 } },
  {
    id: "meyve_suyu",
    name: "Meyve Suyu",
    tier: 4,
    inputs: [
      { id: "elma", qty: 1 },
      { id: "armut", qty: 1 },
      { id: "uzum", qty: 1 },
      { id: "portakal", qty: 1 },
      { id: "seftali", qty: 1 },
      { id: "kiraz", qty: 1 },
    ],
    output: { id: "meyve_suyu", qty: 1 },
  },
  { id: "ozel_menu", name: "Şef'in Özel Menüsü", tier: 4, inputs: [{ id: "hamburger", qty: 1 }, { id: "bonfile", qty: 1 }, { id: "tarhana", qty: 1 }, { id: "borek", qty: 1 }], output: { id: "ozel_menu", qty: 1 } },
  { id: "tatli_tabaqi", name: "Tatlı Tabağı", tier: 4, inputs: [{ id: "baklava", qty: 1 }, { id: "recel", qty: 1 }, { id: "incir_receli", qty: 1 }, { id: "mandalina_receli", qty: 1 }], output: { id: "tatli_tabaqi", qty: 1 } },
];

export function getRecipe(id) {
  return RECIPES.find((r) => r.id === id);
}
