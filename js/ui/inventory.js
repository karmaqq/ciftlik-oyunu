/* ═══════════════════════════════════════════════════════════════════════════ */
/*               Envanter paneli render fonksiyonu                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/inventory.js
// Envanter paneli render fonksiyonu ve tarif vurgulama.

import { RECIPES } from "../data/recipes.js";
import { itemDisplayName, itemEmoji } from "../data/items.js";
import { getInventoryList, FILTERS } from "../systems/inventory.js";
import { getContext, inventoryFilter, inventorySort, quickSellMode } from "./shared.js";

const highlightedRecipes = new Set();

/* ─────────────────── Envanter tariflerini vurgula ─────────────────── */
export function highlightRecipes(itemId, highlight) {
  highlightedRecipes.clear();
  if (highlight && itemId) {
    RECIPES.forEach((r) => {
      if (r.inputs.some((inp) => inp.id === itemId)) {
        highlightedRecipes.add(r.id);
      }
    });
  }
  document.querySelectorAll(".recipe-card").forEach((card) => {
    const recipeId = card.dataset.recipeId;
    if (highlightedRecipes.has(recipeId)) {
      card.classList.add("highlight");
    } else {
      card.classList.remove("highlight");
    }
  });
}

/* ─────────────────── Envanter panelini oluştur ─────────────────── */
export function renderInventory() {
  const ctx = getContext();
  const filtersEl = document.getElementById("inventory-filters");
  const isActive = inventorySort === "deger";
  filtersEl.innerHTML =
    `<button class="hamburger-btn${isActive ? " active" : ""}" data-action="sortByValue"><span></span><span></span><span></span></button>` +
    FILTERS.map((f) => `<button data-filter="${f}">${f.charAt(0).toUpperCase() + f.slice(1)}</button>`).join("");

  const list = getInventoryList(ctx.state, { filter: inventoryFilter, sortBy: inventorySort });
  const grid = document.getElementById("inventory-grid");
  const cells = [];
  const maxSlots = ctx.state.inventory.maxSlots;
  for (let i = 0; i < maxSlots; i++) {
    const entry = list[i];
    if (!entry) { cells.push(`<div class="cell empty"></div>`); continue; }
    const name = itemDisplayName(entry.itemId);

    cells.push(`
      <div class="cell item ${entry.category}" draggable="true" data-item-id="${entry.itemId}">
        <span class="cell-emoji">${itemEmoji(entry.itemId)}</span>
        <span class="qty">${entry.quantity}</span>
        <span class="label"><span class="label-text">${name}</span></span>
      </div>
    `);
  }
  grid.innerHTML = cells.join("");

  const quickSellZone = document.getElementById("quick-sell-zone");
  if (quickSellZone && ctx.state.features && ctx.state.features.quickSell) {
    quickSellZone.innerHTML = `<div class="quick-sell-content"><small>Sürükle, bırak ve sat</small></div>`;
  }

  document.querySelectorAll("#sell-tabs button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sellMode === quickSellMode);
  });
}
