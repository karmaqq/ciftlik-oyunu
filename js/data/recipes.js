// js/data/recipes.js
// Tarifler malzeme sayısına göre otomatik kademelendirilmiştir:
// 1 malzeme -> tier 1, 2 -> tier 2, 3 -> tier 3, 4+ -> tier 4.
// "learned" ilk üretimden sonra true olur (bkz. systems/crafting.js).

export const RECIPES = [
  { id: "peynir", name: "Peynir", tier: 1, inputs: [{ id: "sut", qty: 2 }], output: { id: "peynir", qty: 1 } },
  { id: "yogurt", name: "Yoğurt", tier: 1, inputs: [{ id: "sut", qty: 2 }], output: { id: "yogurt", qty: 1 } },
  { id: "maya", name: "Maya", tier: 1, inputs: [{ id: "sut", qty: 1 }], output: { id: "maya", qty: 1 } },
  { id: "limonata", name: "Limonata", tier: 1, inputs: [{ id: "limon", qty: 3 }], output: { id: "limonata", qty: 1 } },
  { id: "cikolata", name: "Çikolata", tier: 1, inputs: [{ id: "kakao", qty: 3 }], output: { id: "cikolata", qty: 1 } },
  { id: "cay", name: "Çay", tier: 1, inputs: [{ id: "cay_yapragi", qty: 2 }], output: { id: "cay", qty: 1 } },
  { id: "cerez_aycicegi", name: "Ay Çiçeği Çerezi", tier: 1, inputs: [{ id: "ay_cicegi", qty: 3 }], output: { id: "cerez", qty: 1 } },
  { id: "cerez_findik", name: "Fındık Çerezi", tier: 1, inputs: [{ id: "findik", qty: 3 }], output: { id: "cerez", qty: 1 } },

  { id: "ekmek", name: "Ekmek", tier: 2, inputs: [{ id: "bugday", qty: 3 }, { id: "maya", qty: 1 }], output: { id: "ekmek", qty: 1 } },

  { id: "guvec", name: "Güveç", tier: 3, inputs: [{ id: "patates", qty: 2 }, { id: "kabak", qty: 2 }, { id: "biber", qty: 2 }], output: { id: "guvec", qty: 1 } },

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
];

export function getRecipe(id) {
  return RECIPES.find((r) => r.id === id);
}

export function craftableRecipesFor(itemId) {
  return RECIPES.filter((r) => r.inputs.some((i) => i.id === itemId));
}
