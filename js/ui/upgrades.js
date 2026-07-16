/* ═══════════════════════════════════════════════════════════════════════════ */
/*                  Geliştirme paneli render fonksiyonları                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/upgrades.js
// Geliştirme paneli render fonksiyonları.

import { BUILDING_TYPES, capacityForLevel, MAX_BUILDING_LEVEL } from "../data/animals.js";
import { buildingUpgradeCost } from "../systems/buildings.js";
import {
  fieldSlotUnlockCost,
  orchardSlotUnlockCost,
  inventorySlotCost,
  marketSlotCost,
  FEATURE_COSTS,
  FEATURE_NAMES,
  FEATURE_EMOJIS,
  FEATURE_DESCRIPTIONS,
} from "../systems/upgrades.js";
import {
  INVENTORY_TOTAL_SLOTS, FIELD_TOTAL_SLOTS, ORCHARD_TOTAL_SLOTS,
  MAX_MARKET_SLOTS_PER_CATEGORY,
} from "../state.js";
import { getContext, gold, affordClass } from "./shared.js";

function renderUpgradeRow({ emoji, label, current, max, cost, maxed, action }) {
  return `
    <div class="upgrade-row">
      <div class="upgrade-info">
        <span class="upgrade-label">${emoji} ${label}</span>
        <span class="upgrade-status">${current}/${max}</span>
      </div>
      <button class="upgrade-btn${affordClass(cost, maxed)}" data-action="${action}" ${maxed ? "disabled" : ""}>
        ${maxed ? "Max" : `${cost}🪙`}
      </button>
    </div>
  `;
}

function renderFeatureRow(featureId, cost) {
  const name = FEATURE_NAMES[featureId] || featureId;
  const emoji = FEATURE_EMOJIS[featureId] || "🔓";
  const desc = FEATURE_DESCRIPTIONS[featureId] || "";

  return `
    <div class="upgrade-row feature-row">
      <div class="upgrade-info">
        <span class="upgrade-label">${emoji} ${name}</span>
        <span class="upgrade-status">${desc}</span>
      </div>
      <button class="upgrade-btn${affordClass(cost, false)}" data-action="buyFeature" data-feature="${featureId}">
        ${cost}🪙
      </button>
    </div>
  `;
}

function renderBuildingUpgradeRow(type) {
  const ctx = getContext();
  const def = BUILDING_TYPES[type];
  const building = ctx.state.buildings[type];
  const capacity = capacityForLevel(type, building.level);
  const maxed = building.level >= MAX_BUILDING_LEVEL;
  const upgradeCostVal = buildingUpgradeCost(building.level, type);

  return `
    <div class="building-upgrade-row">
      <div class="upgrade-info">
        <span class="upgrade-label">${def.name}</span>
        <span class="upgrade-status">${def.animalName}: ${building.population}/${capacity}</span>
      </div>
      <div class="building-upgrade-actions">
        <button class="upgrade-btn${gold() < upgradeCostVal && !maxed ? " insufficient-gold" : ""}" data-action="upgradeBuildingUpgrade" data-building="${type}" ${maxed ? "disabled" : ""}>
          ${maxed ? "Max" : `${upgradeCostVal}🪙 Geliştir`}
        </button>
      </div>
    </div>
  `;
}

/* ─────────────────── Geliştirme panelini oluştur ─────────────────── */
export function renderUpgrades() {
  const ctx = getContext();
  const state = ctx.state;
  const fieldUnlocked = state.field.slots.filter((s) => s.unlocked).length;
  const orchardUnlocked = state.orchard.slots.filter((s) => s.unlocked).length;
  const features = state.features || {};

  const sections = [];

  // Özellikler (Satın Alınmamışlar)
  const featureRows = [];
  for (const [featureId, cost] of Object.entries(FEATURE_COSTS)) {
    if (!features[featureId]) {
      featureRows.push(renderFeatureRow(featureId, cost));
    }
  }
  if (featureRows.length > 0) {
    sections.push(`
      <div class="upgrade-section">
        <h4>🔓 Özellikler</h4>
        ${featureRows.join("")}
      </div>
    `);
  }

  // Slot Geliştirmeleri
  sections.push(`
    <div class="upgrade-section">
      <h4>📦 Slot Geliştirmeleri</h4>
      ${renderUpgradeRow({ emoji: "📦", label: "Envanter Slotu", current: state.inventory.maxSlots, max: INVENTORY_TOTAL_SLOTS, cost: inventorySlotCost(state.inventory.maxSlots), maxed: state.inventory.maxSlots >= INVENTORY_TOTAL_SLOTS, action: "upgradeInventory" })}
      ${renderUpgradeRow({ emoji: "🌾", label: "Tarla Slotu", current: fieldUnlocked, max: FIELD_TOTAL_SLOTS, cost: fieldSlotUnlockCost(fieldUnlocked), maxed: fieldUnlocked >= FIELD_TOTAL_SLOTS, action: "upgradeField" })}
      ${features.orchard ? renderUpgradeRow({ emoji: "🌳", label: "Bahçe Slotu", current: orchardUnlocked, max: ORCHARD_TOTAL_SLOTS, cost: orchardSlotUnlockCost(orchardUnlocked), maxed: orchardUnlocked >= ORCHARD_TOTAL_SLOTS, action: "upgradeOrchard" }) : ""}
    </div>
  `);

  // Market Slotları
  const seedMaxed = state.market.seedSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;
  const saplingMaxed = state.market.saplingSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;
  const animalMaxed = state.market.animalSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;

  sections.push(`
    <div class="upgrade-section">
      <h4>🏪 Market Slotları</h4>
      ${renderUpgradeRow({ emoji: "🌱", label: "Tohum Slotları", current: state.market.seedSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY, cost: marketSlotCost("seed", state.market.seedSlots), maxed: seedMaxed, action: "upgradeMarketSeed" })}
      ${features.orchard ? renderUpgradeRow({ emoji: "🌿", label: "Fidan Slotları", current: state.market.saplingSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY, cost: marketSlotCost("sapling", state.market.saplingSlots), maxed: saplingMaxed, action: "upgradeMarketSapling" }) : ""}
      ${renderUpgradeRow({ emoji: "🐄", label: "Hayvan Slotları", current: state.market.animalSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY, cost: marketSlotCost("animal", state.market.animalSlots), maxed: animalMaxed, action: "upgradeMarketAnimal" })}
    </div>
  `);

  // Binalar (sadece satın alınmış olanlar)
  const buildingRows = [];
  if (features.hive) buildingRows.push(renderBuildingUpgradeRow("hive"));
  if (features.coop) buildingRows.push(renderBuildingUpgradeRow("coop"));
  if (features.barn) buildingRows.push(renderBuildingUpgradeRow("barn"));
  if (buildingRows.length > 0) {
    sections.push(`
      <div class="upgrade-section">
        <h4>🏗️ Binalar</h4>
        ${buildingRows.join("")}
      </div>
    `);
  }

  const rightEl = document.getElementById("right-content");
  rightEl.innerHTML = `<div class="upgrades-grid">${sections.join("")}</div>`;
}
