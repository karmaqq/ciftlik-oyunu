// js/data/items.js
// Envanterdeki HERHANGİ bir itemId için görünen isim ve satış fiyatını çözer.
// Tohum/fidan/kaliteli varyantları da otomatik türetir.

import { getCrop } from "./crops.js";
import { getTree } from "./trees.js";
import { RECIPES } from "./recipes.js";

const CROP_EMOJI = {
  bugday: "🌾", misir: "🌽", havuc: "🥕", patates: "🥔", marul: "🥬",
  domates: "🍅", biber: "🌶️", kabak: "🟡", fasulye: "🫘", pirinc: "🍚",
  cilek: "🍓", ahududu: "🫐", seker_pancari: "🍬", seker_kamisi: "🎋",
  bal_kabagi: "🎃", ay_cicegi: "🌻", cay_yapragi: "🍵", sogan: "🧅",
  sarimsak: "🧄", nohut: "🫛",
};

const TREE_EMOJI = {
  elma: "🍎", armut: "🍐", dut: "💜", erik: "🟣", muz: "🍌",
  kayisi: "🟠", seftali: "🍑", visne: "🍒", kiraz: "🔴", ayva: "💛",
  portakal: "🍊", limon: "🍋", mandalina: "🧡", uzum: "🍇", zeytin: "🫒",
  kakao: "🍫", findik: "🌰", bambu: "🪴", incir: "💚", nar: "❤️",
};

const ANIMAL_EMOJI = {
  bal: "🍯", yumurta: "🥚", sut: "🥛", inek_eti: "🥩", tavuk_eti: "🍗",
};

const RECIPE_EMOJI = {
  peynir: "🧀", yogurt: "🥄", maya: "🫧", limonata: "🧃",
  cikolata: "🍩", cay: "☕", cerez_aycicegi: "🥜", cerez_findik: "🌰", ekmek: "🍞",
  guvec: "🍲", hamburger: "🍔", meyve_suyu: "🧉",
  misir_unu: "🌾", havuc_pure: "🥣", salca: "🍅", zeytinyagi: "🫒",
  recel: "🍓", erik_hosaf: "🟣", nar_serbeti: "🍹", findik_ezmesi: "🌰",
  yumurtali_ekmek: "🍳", muz_smoothie: "🥤", pirinc_pilavi: "🍚",
  bal_kabagi_tatlisi: "🎃", visne_receli: "🍒", fincan_cay: "🫖",
  domates_corbasi: "🍲", sebze_corbasi: "🥣", baklava: "🍯",
  meyve_salatasi: "🥗", biberli_guvec: "🫕", incir_receli: "🟤",
  komposto: "🍑", soganli_ekmek: "🫓", ayvali_tatli: "🍰",
  mandalina_receli: "🍊", tavuklu_pilav: "🍛",
  zeytinyagli_yemek: "🥘", findik_cikolatasi: "🍫", humus: "🫘",
  manti: "🥟", bonfile: "🥩", meyve_kompostosu: "🫙",
  balkabagi_corbasi: "🥣", tarhana: "🫙", tavuk_sote: "🍱",
  borek: "🥧", ozel_menu: "👨‍🍳", tatli_tabaqi: "🍰",
};

const ANIMAL_PRODUCTS = {
  bal: { name: "Bal", sellPrice: 8 },
  yumurta: { name: "Yumurta", sellPrice: 3 },
  sut: { name: "Süt", sellPrice: 4 },
  inek_eti: { name: "İnek Eti", sellPrice: 15 },
  tavuk_eti: { name: "Tavuk Eti", sellPrice: 8 },
};

const TIER_MULTIPLIER = { 1: 1.2, 2: 1.25, 3: 1.35, 4: 1.5 };

function craftedSellPrice(recipeId, costs, seen) {
  if (costs[recipeId] !== undefined) return costs[recipeId];
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return 0;
  seen = new Set(seen || []);
  if (seen.has(recipeId)) return 0;
  seen.add(recipeId);
  const mult = TIER_MULTIPLIER[recipe.tier || 1];
  costs[recipeId] = 0;
  let raw = 0;
  for (const inp of recipe.inputs) {
    const r2 = RECIPES.find((x) => x.output.id === inp.id);
    if (r2) {
      raw += craftedSellPrice(r2.id, costs, seen) * inp.qty;
    } else {
      raw += (resolveItem(inp.id).sellPrice || 1) * inp.qty;
    }
  }
  costs[recipeId] = Math.max(1, Math.round(raw * mult));
  return costs[recipeId];
}

const _craftedPrices = {};
RECIPES.forEach((r) => craftedSellPrice(r.id, _craftedPrices));

const CRAFTED_PRODUCTS = Object.fromEntries(
  RECIPES.map((r) => [
    r.output.id,
    { name: r.name, sellPrice: _craftedPrices[r.id] || 1 },
  ])
);

export function itemEmoji(itemId) {
  if (itemId.endsWith("_tohum")) {
    const baseId = itemId.replace(/_tohum$/, "");
    return CROP_EMOJI[baseId] || "📦";
  }
  if (itemId.endsWith("_fidan")) {
    const baseId = itemId.replace(/_fidan$/, "");
    return TREE_EMOJI[baseId] || "📦";
  }
  if (itemId.endsWith("_kaliteli")) {
    const baseId = itemId.replace(/_kaliteli$/, "");
    return "✨" + (CROP_EMOJI[baseId] || TREE_EMOJI[baseId] || "⭐");
  }
  if (CROP_EMOJI[itemId]) return CROP_EMOJI[itemId];
  if (TREE_EMOJI[itemId]) return TREE_EMOJI[itemId];
  if (ANIMAL_EMOJI[itemId]) return ANIMAL_EMOJI[itemId];
  if (RECIPE_EMOJI[itemId]) return RECIPE_EMOJI[itemId];
  return "📦";
}

export function resolveItem(itemId) {
  if (itemId.endsWith("_tohum")) {
    const baseId = itemId.replace(/_tohum$/, "");
    const crop = getCrop(baseId);
    if (crop) return { name: `${crop.name} Tohumu`, sellPrice: Math.round(crop.buyPrice * 0.4), buyPrice: crop.buyPrice, emoji: CROP_EMOJI[baseId] || "📦" };
  }
  if (itemId.endsWith("_fidan")) {
    const baseId = itemId.replace(/_fidan$/, "");
    const tree = getTree(baseId);
    if (tree) return { name: `${tree.name} Fidanı`, sellPrice: Math.round(tree.buyPrice * 0.4), buyPrice: tree.buyPrice, emoji: TREE_EMOJI[baseId] || "📦" };
  }
  if (itemId.endsWith("_kaliteli")) {
    const baseId = itemId.replace(/_kaliteli$/, "");
    const base = resolveItem(baseId);
    return { name: `Kaliteli ${base.name}`, sellPrice: base.sellPrice ? base.sellPrice * 4 : 20, emoji: "✨" + (base.emoji || "⭐") };
  }

  const crop = getCrop(itemId);
  if (crop) return { name: crop.name, sellPrice: crop.sellPrice, buyPrice: crop.buyPrice, emoji: CROP_EMOJI[itemId] || "📦" };

  const tree = getTree(itemId);
  if (tree) return { name: tree.name, sellPrice: tree.sellPrice, buyPrice: tree.buyPrice, emoji: TREE_EMOJI[itemId] || "📦" };

  if (ANIMAL_PRODUCTS[itemId]) return { ...ANIMAL_PRODUCTS[itemId], emoji: ANIMAL_EMOJI[itemId] || "🐾" };
  if (CRAFTED_PRODUCTS[itemId]) return { ...CRAFTED_PRODUCTS[itemId], emoji: RECIPE_EMOJI[itemId] || "📦" };

  return { name: itemId, sellPrice: 1, emoji: "📦" };
}

export function itemDisplayName(itemId) {
  return resolveItem(itemId).name;
}

export function itemSellPrice(itemId, itemMeta) {
  if (itemMeta && itemMeta.sellPriceOverride) return itemMeta.sellPriceOverride;
  return resolveItem(itemId).sellPrice || 1;
}
