/* ═══════════════════════════════════════════════════════════════════════════ */
/*                 Bina paneli render fonksiyonu                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/buildings.js
// Bina paneli render fonksiyonu (Kovan / Kümes / Ahır).

import { BUILDING_TYPES, capacityForLevel } from "../data/animals.js";
import { itemDisplayName, itemEmoji } from "../data/items.js";
import { getContext } from "./shared.js";

let _lastBldVersion = -1;
let _lastBldTab = null;

/* ─────────────────── Tick bazlı bina paneli güncellemesi ─────────────────── */
export function updateBuildingTabTick() {
  const ctx = getContext();
  const state = ctx.state;
  const type = state.ui.activeBuildingTab;
  const ver = state.buildings._version || 0;
  if (ver === _lastBldVersion && type === _lastBldTab) return;
  _lastBldVersion = ver;
  _lastBldTab = type;
  renderBuildingTab();
}

/* ─────────────────── Bina sekmesini oluştur ─────────────────── */
export function renderBuildingTab() {
  const ctx = getContext();
  const type = ctx.state.ui.activeBuildingTab;
  const def = BUILDING_TYPES[type];
  const building = ctx.state.buildings[type];
  const capacity = capacityForLevel(type, building.level);

  const storedProducts = [];
  for (const [productId, qty] of Object.entries(building.stored)) {
    if (qty > 0) {
      const name = itemDisplayName(productId);
      storedProducts.push(
        `<div class="building-product-cell" draggable="true" data-product-id="${productId}" data-source="building" data-tt="product" data-tt-item="${productId}">
          <span class="building-product-emoji">${itemEmoji(productId)}</span>
          <span class="building-product-qty">${qty}</span>
        </div>`
      );
    }
  }

  document.getElementById("building-content").innerHTML = `
    <div class="building-panel">
      <div class="building-panel-info" data-tt="buildingCapacity" data-tt-building="${type}">
        <h3>Seviye ${building.level}</h3>
        <p>${def.animalName}: ${building.population} / ${capacity}</p>
        <p>${building.population > 0 ? `${def.baseProductionDays} günde ${building.population} ${itemDisplayName(def.productId)}` : "Hayvan yok"}</p>
      </div>
      <div class="building-panel-products">
        ${storedProducts.length > 0 ? storedProducts.join("") : '<span class="building-product-empty">Henüz ürün yok</span>'}
      </div>
    </div>
  `;
}
