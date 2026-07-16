/* ═══════════════════════════════════════════════════════════════════════════ */
/*                  Geliştirme paneli — Yetenek Ağacı render                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/upgrades.js
// Yetenek ağacı: kök → 3 ana dal (Özellikler, Kapasite, Binalar)
// Her upgrade, kare seviye kutucukları ile görsel olarak ilerler.

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
import { getContext, gold } from "./shared.js";

/* ---------- Kare seviye kutucuğu üreticisi ---------- */
// Görsel kutucuk sayısı max seviyeyi 12'yi aşarsa sıkıştırır.
function renderBoxes(current, max, isReachable, maxed, isFeature) {
  if (isFeature) return "";
  let boxCount = max;
  let step = 1;
  if (max > 12) {
    step = Math.ceil(max / 12);
    boxCount = Math.ceil(max / step);
  }

  const boxes = [];
  for (let i = 0; i < boxCount; i++) {
    const filledLevel = (i + 1) * step;
    const isCrown = maxed && i === boxCount - 1;
    const isFilled = current >= filledLevel;
    const isNext = isReachable && !maxed && current >= i * step && current < filledLevel;

    let cls = "skill-box";
    if (isCrown) cls += " is-crown";
    else if (isFilled) cls += " is-filled";
    else if (isNext) cls += " is-next";
    boxes.push(`<span class="${cls}"></span>`);
  }
  return `<div class="skill-boxes">${boxes.join("")}</div>`;
}

/* ---------- Tek node render ---------- */
// data: { emoji, title, hint, cost, action, current, max, locked, lockedBy, maxed, isFeature, extraAttr }
function renderNode(data) {
  const {
    emoji, title, hint, action, current = 0, max = 0,
    locked = false, lockedBy = "", maxed = false, isFeature = false, extraAttr = ""
  } = data;

  const cost = data.cost;
  const canAfford = !locked && !maxed && cost !== undefined && gold() >= cost;
  const isReachable = !locked && !maxed;

  let stateClass = "is-available";
  if (locked) stateClass = "is-locked";
  else if (maxed) stateClass = "is-maxed";
  else if (!canAfford) stateClass = "is-poor";

  const featureCls = isFeature ? " is-feature" : "";

  let costHTML = "";
  if (maxed) {
    costHTML = `<span class="skill-node-cost">MAX</span>`;
  } else if (locked) {
    costHTML = `<span class="skill-node-cost">${lockedBy} 🔒</span>`;
  } else {
    costHTML = `<span class="skill-node-cost">${cost}🪙</span>`;
  }

  const lockBadge = locked && lockedBy ? `<span class="skill-lock-badge">${lockedBy}</span>` : "";

  return `
    <div class="skill-node ${stateClass}${featureCls}" data-action="${action}" ${extraAttr}>
      ${lockBadge}
      <div class="skill-node-icon">${emoji}</div>
      <span class="skill-node-title">${title}</span>
      <span class="skill-node-hint">${hint}</span>
      ${costHTML}
      ${renderBoxes(current, max, isReachable, maxed, isFeature)}
    </div>
  `;
}

/* ---------- Dal başlığı ---------- */
function renderBranchHead(icon, title, subtitle) {
  return `
    <div class="skill-branch-head">
      <div class="skill-branch-head-icon">${icon}</div>
      <div class="skill-branch-head-text">
        <span class="skill-branch-title">${title}</span>
        <span class="skill-branch-sub">${subtitle}</span>
      </div>
    </div>
  `;
}

/* ---------- Dal render ---------- */
function renderBranch(icon, title, subtitle, nodesHTML) {
  return `
    <div class="skill-branch">
      ${renderBranchHead(icon, title, subtitle)}
      <div class="skill-nodes">${nodesHTML}</div>
    </div>
  `;
}

/* ---------- Özellik node'u (tek seferlik satın alma) ---------- */
function renderFeatureNode(featureId, isOwned, lockedBy = "") {
  const name = FEATURE_NAMES[featureId] || featureId;
  const emoji = FEATURE_EMOJIS[featureId] || "🔓";
  const desc = FEATURE_DESCRIPTIONS[featureId] || "";
  const cost = FEATURE_COSTS[featureId];
  const canAfford = gold() >= cost;
  const locked = !!lockedBy;

  let stateClass = "is-available";
  if (locked) stateClass = "is-locked";
  else if (isOwned) stateClass = "is-maxed";
  else if (!canAfford) stateClass = "is-poor";

  let costHTML;
  if (isOwned) costHTML = `<span class="skill-node-cost">AÇIK</span>`;
  else if (locked) costHTML = `<span class="skill-node-cost">${lockedBy} 🔒</span>`;
  else costHTML = `<span class="skill-node-cost">${cost}🪙</span>`;

  const lockBadge = locked ? `<span class="skill-lock-badge">${lockedBy}</span>` : "";
  const action = isOwned || locked ? "" : `data-action="buyFeature" data-feature="${featureId}"`;

  return `
    <div class="skill-node ${stateClass} is-feature" ${action}>
      ${lockBadge}
      <div class="skill-node-icon">${emoji}</div>
      <span class="skill-node-title">${name}</span>
      <span class="skill-node-hint">${desc}</span>
      ${costHTML}
    </div>
  `;
}

/* ---------- Yetenek ağacını oluştur ---------- */
export function renderUpgrades() {
  const ctx = getContext();
  const state = ctx.state;
  const features = state.features || {};
  const fieldUnlocked = state.field.slots.filter((s) => s.unlocked).length;
  const orchardUnlocked = state.orchard.slots.filter((s) => s.unlocked).length;

  // ───── DAL 1: ÖZELLİKLER (Takvim, Hızlı Satış, Bahçe) ─────
  const featureIds = ["calendar", "quickSell", "orchard"];
  const featureNodes = featureIds
    .map((id) => renderFeatureNode(id, !!features[id]))
    .join("");

  const branch1 = renderBranch("🔓", "Özellikler", "Kalıcı yetenekler", featureNodes);

  // ───── DAL 2: KAPASİTE (Envanter, Tarla, Bahçe) ─────
  const capacityNodes = [];

  capacityNodes.push(renderNode({
    emoji: "📦", title: "Envanter", hint: "Eşya kapasitesi",
    cost: inventorySlotCost(state.inventory.maxSlots), action: "upgradeInventory",
    current: state.inventory.maxSlots, max: INVENTORY_TOTAL_SLOTS,
    maxed: state.inventory.maxSlots >= INVENTORY_TOTAL_SLOTS,
  }));

  capacityNodes.push(renderNode({
    emoji: "🌾", title: "Tarla", hint: "Ekim alanı",
    cost: fieldSlotUnlockCost(fieldUnlocked), action: "upgradeField",
    current: fieldUnlocked, max: FIELD_TOTAL_SLOTS,
    maxed: fieldUnlocked >= FIELD_TOTAL_SLOTS,
  }));

  if (features.orchard) {
    capacityNodes.push(renderNode({
      emoji: "🌳", title: "Bahçe", hint: "Ağaç alanı",
      cost: orchardSlotUnlockCost(orchardUnlocked), action: "upgradeOrchard",
      current: orchardUnlocked, max: ORCHARD_TOTAL_SLOTS,
      maxed: orchardUnlocked >= ORCHARD_TOTAL_SLOTS,
    }));
  }

  const branch2 = renderBranch("📦", "Kapasite", "Slot & alan açma", capacityNodes.join(""));

  // ───── DAL 3: MARKET YUVASI (Tohum, Fidan, Hayvan) ─────
  const marketNodes = [];

  marketNodes.push(renderNode({
    emoji: "🌱", title: "Tohum", hint: "Tohum listesi",
    cost: marketSlotCost("seed", state.market.seedSlots), action: "upgradeMarketSeed",
    current: state.market.seedSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY,
    maxed: state.market.seedSlots >= MAX_MARKET_SLOTS_PER_CATEGORY,
  }));

  if (features.orchard) {
    marketNodes.push(renderNode({
      emoji: "🌿", title: "Fidan", hint: "Fidan listesi",
      cost: marketSlotCost("sapling", state.market.saplingSlots), action: "upgradeMarketSapling",
      current: state.market.saplingSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY,
      maxed: state.market.saplingSlots >= MAX_MARKET_SLOTS_PER_CATEGORY,
    }));
  }

  marketNodes.push(renderNode({
    emoji: "🐄", title: "Hayvan", hint: "Hayvan listesi",
    cost: marketSlotCost("animal", state.market.animalSlots), action: "upgradeMarketAnimal",
    current: state.market.animalSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY,
    maxed: state.market.animalSlots >= MAX_MARKET_SLOTS_PER_CATEGORY,
  }));

  const branch3 = renderBranch("🏪", "Market Yuvası", "Liste kapasitesi", marketNodes.join(""));

  // ───── DAL 4: BİNALAR (Kovan, Kümes, Ahır — feature + level geliştirme) ─────
  const buildingNodes = [];
  const buildingTypes = ["hive", "coop", "barn"];
  for (const type of buildingTypes) {
    const featureOwned = !!features[type];
    if (!featureOwned) {
      // Henüz satın alınmamış — feature node olarak göster
      buildingNodes.push(renderFeatureNode(type, false));
      continue;
    }
    // Satın alınmış — bina level geliştirme node'u
    const def = BUILDING_TYPES[type];
    const building = state.buildings[type];
    const capacity = capacityForLevel(type, building.level);
    const maxed = building.level >= MAX_BUILDING_LEVEL;
    const upgradeCostVal = buildingUpgradeCost(building.level, type);

    buildingNodes.push(renderNode({
      emoji: FEATURE_EMOJIS[type], title: def.name, hint: `${building.population}/${capacity} ${def.animalName}`,
      cost: upgradeCostVal, action: "upgradeBuildingUpgrade",
      current: building.level, max: MAX_BUILDING_LEVEL,
      maxed: maxed, extraAttr: `data-building="${type}"`,
    }));
  }

  const branch4 = renderBranch("🏗️", "Binalar", "Kovan, Kümes, Ahır", buildingNodes.join(""));

  const branchesHTML = [branch1, branch2, branch3, branch4].join("");

  const rightEl = document.getElementById("right-content");
  rightEl.innerHTML = `
    <div class="skill-tree">
      <div class="skill-root">
        <div class="skill-root-icon">🌾</div>
        <div class="skill-root-label">Çiftlik</div>
      </div>
      <div class="skill-trunk"></div>
      <div class="skill-branches">
        ${branchesHTML}
      </div>
    </div>
  `;
}