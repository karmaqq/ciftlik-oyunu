// js/systems/inventory.js
import { CROPS } from "../data/crops.js";
import { TREES } from "../data/trees.js";
import { RECIPES } from "../data/recipes.js";

const CROP_IDS = new Set(CROPS.map((c) => c.id));
const TREE_IDS = new Set(TREES.map((t) => t.id));
const CRAFTED_IDS = new Set(RECIPES.map((r) => r.output.id));

export function categorizeItem(itemId) {
  if (itemId.endsWith("_tohum")) return "tohum";
  if (itemId.endsWith("_fidan")) return "fidan";
  if (itemId.endsWith("_kaliteli")) return "kaliteli";
  if (CROP_IDS.has(itemId) || TREE_IDS.has(itemId)) return "hasat";
  if (["bal", "yumurta", "sut", "inek_eti"].includes(itemId)) return "hayvan_urunu";
  if (CRAFTED_IDS.has(itemId)) return "uretim";
  return "diger";
}

export const FILTERS = ["hepsi", "tohum", "fidan", "hasat", "hayvan_urunu", "uretim", "kaliteli", "diger"];

export function getInventoryList(state, { filter = "hepsi", sortBy = "isim" } = {}) {
  let list = Object.entries(state.inventory.items).map(([itemId, data]) => ({
    itemId,
    quantity: data.quantity,
    meta: data.meta || {},
    category: categorizeItem(itemId),
  }));

  if (filter !== "hepsi") {
    list = list.filter((i) => i.category === filter);
  }

  switch (sortBy) {
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
