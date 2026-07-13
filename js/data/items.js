// js/data/items.js
// Envanterdeki HERHANGİ bir itemId için görünen isim ve satış fiyatını çözer.
// Tohum/fidan/kaliteli varyantları da otomatik türetir.

import { CROPS, getCrop } from "./crops.js";
import { TREES, getTree } from "./trees.js";
import { RECIPES } from "./recipes.js";

const ANIMAL_PRODUCTS = {
  bal: { name: "Bal", sellPrice: 8 },
  yumurta: { name: "Yumurta", sellPrice: 3 },
  sut: { name: "Süt", sellPrice: 4 },
  inek_eti: { name: "İnek Eti", sellPrice: 15 },
};

const CRAFTED_PRODUCTS = Object.fromEntries(
  RECIPES.map((r) => [
    r.output.id,
    { name: r.name, sellPrice: Math.round((r.tier || 1) * 6 + r.inputs.length * 3) },
  ])
);

export function resolveItem(itemId) {
  if (itemId.endsWith("_tohum")) {
    const baseId = itemId.replace(/_tohum$/, "");
    const crop = getCrop(baseId);
    if (crop) return { name: `${crop.name} Tohumu`, sellPrice: Math.round(crop.buyPrice * 0.4), buyPrice: crop.buyPrice };
  }
  if (itemId.endsWith("_fidan")) {
    const baseId = itemId.replace(/_fidan$/, "");
    const tree = getTree(baseId);
    if (tree) return { name: `${tree.name} Fidanı`, sellPrice: Math.round(tree.buyPrice * 0.4), buyPrice: tree.buyPrice };
  }
  if (itemId.endsWith("_kaliteli")) {
    const baseId = itemId.replace(/_kaliteli$/, "");
    const base = resolveItem(baseId);
    return { name: `Kaliteli ${base.name}`, sellPrice: base.sellPrice ? base.sellPrice * 4 : 20 };
  }

  const crop = getCrop(itemId);
  if (crop) return { name: crop.name, sellPrice: crop.sellPrice, buyPrice: crop.buyPrice };

  const tree = getTree(itemId);
  if (tree) return { name: tree.name, sellPrice: tree.sellPrice, buyPrice: tree.buyPrice };

  if (ANIMAL_PRODUCTS[itemId]) return ANIMAL_PRODUCTS[itemId];
  if (CRAFTED_PRODUCTS[itemId]) return CRAFTED_PRODUCTS[itemId];

  return { name: itemId, sellPrice: 1 };
}

export function itemDisplayName(itemId) {
  return resolveItem(itemId).name;
}

export function itemSellPrice(itemId) {
  return resolveItem(itemId).sellPrice || 1;
}
