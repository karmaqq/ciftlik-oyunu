// js/systems/inventory.js
import { CROPS } from "../data/crops.js";
import { TREES } from "../data/trees.js";
import { RECIPES } from "../data/recipes.js";
import { resolveItem } from "../data/items.js";

const CROP_IDS = new Set(CROPS.map((c) => c.id));
const TREE_IDS = new Set(TREES.map((t) => t.id));
const CRAFTED_IDS = new Set(RECIPES.map((r) => r.output.id));

export function categorizeItem(itemId) {
  if (itemId.endsWith("_tohum")) return "tohum";
  if (itemId.endsWith("_fidan")) return "fidan";
  if (CROP_IDS.has(itemId) || TREE_IDS.has(itemId)) return "hasat";
  if (["bal", "yumurta", "sut", "inek_eti", "tavuk_eti"].includes(itemId)) return "hayvan_urunu";
  if (CRAFTED_IDS.has(itemId)) return "uretim";
  return "diger";
}

export const FILTERS = ["tümü", "tohum", "fidan", "üretim"];

export function getInventoryList(state, { filter = "tümü", sortBy = "isim" } = {}) {
  let list = Object.entries(state.inventory.items).map(([itemId, data]) => ({
    itemId,
    quantity: data.quantity,
    meta: data.meta || {},
    category: categorizeItem(itemId),
  }));

  if (filter === "üretim") {
    list = list.filter((i) => i.category === "uretim");
  } else if (filter !== "tümü") {
    list = list.filter((i) => i.category === filter);
  }

  switch (sortBy) {
    case "deger":
      list.sort((a, b) => (resolveItem(b.itemId).sellPrice || 0) - (resolveItem(a.itemId).sellPrice || 0));
      break;
    case "miktar":
      list.sort((a, b) => b.quantity - a.quantity);
      break;
    case "kategori":
      list.sort((a, b) => a.category.localeCompare(b.category));
      break;
    case "isim":
    default:
      list.sort((a, b) => a.itemId.localeCompare(b.itemId));
  }

  return list;
}
