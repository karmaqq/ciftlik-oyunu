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
} from "../systems/upgrades.js";
import {
  INVENTORY_TOTAL_SLOTS, FIELD_TOTAL_SLOTS, ORCHARD_TOTAL_SLOTS,
  FIELD_START_UNLOCKED, ORCHARD_START_UNLOCKED,
  MAX_MARKET_SLOTS_PER_CATEGORY,
} from "../state.js";
import { getContext, gold } from "./shared.js";

/* ---------- Kare seviye kutucuğu üreticisi ---------- */
// gridCols: sütun sayısı (5 = 2 sıra×5, 6 = 1 sıra×6). Yoksa esnek flex.
// Faz-1 (1-10): boş kutu siyah, öneri mavi parlar, satın alınan mavi olur.
// Faz-2 (11-20):1. kutudan itibaren mavi kutular mora döner, öneri mor parlar.
function renderBoxes(current, max, isReachable, maxed, isFeature, gridCols) {
  if (isFeature) return "";

  const hasPhases = gridCols > 0 && max > gridCols;
  const boxCount = hasPhases ? gridCols * 2 : (gridCols || max);

  let phase = 1;
  let filledCount = current;
  if (hasPhases) {
    if (current === 0 || current < boxCount) {
      phase = 1;
      filledCount = current;
    } else {
      phase = 2;
      filledCount = current - boxCount;
    }
  }

  const boxes = [];
  for (let i = 0; i < boxCount; i++) {
    const isCrown = maxed && i === boxCount - 1;
    const isNext = isReachable && !maxed && i === filledCount;

    // Faz-2'de: dolu olanlar mor, öneri mor parlar, diğer mavi (1. fazdan)
    let cls = "skill-box";
    if (isCrown) {
      cls += " is-crown";
    } else if (hasPhases && phase === 2) {
      if (i < filledCount) cls += " is-filled phase-2";
      else if (isNext) cls += " is-next phase-2-next";
      else cls += " is-filled";
    } else {
      if (i < filledCount) cls += " is-filled";
      else if (isNext) cls += " is-next";
    }
    boxes.push(`<span class="${cls}"></span>`);
  }

  const containerCls = gridCols ? `skill-boxes skill-boxes--${gridCols}` : "skill-boxes";
  return `<div class="${containerCls}">${boxes.join("")}</div>`;
}

/* ---------- Tek node render ---------- */
// data: { emoji, title, hint, cost, action, current, max, locked, lockedBy, maxed, isFeature, extraAttr, gridCols }
function renderNode(data) {
  const {
    emoji, title, hint, action, current = 0, max = 0,
    locked = false, lockedBy = "", maxed = false, isFeature = false, extraAttr = "", gridCols = 0
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

  const ttAttrs = `data-tt="upgradeNode" data-tt-title="${title}" data-tt-hint="${hint}" data-tt-icon="${emoji}" data-tt-cost="${cost !== undefined ? cost : ""}" data-tt-current="${current}" data-tt-max="${max}" data-tt-maxed="${maxed}" data-tt-locked="${locked}" data-tt-locked-by="${lockedBy}" ${data.buildingType ? `data-building="${data.buildingType}"` : ""}`;

  return `
    <div class="skill-node ${stateClass}${featureCls}" data-action="${action}" ${extraAttr} ${ttAttrs} tabindex="0" role="button" aria-label="${title}">
      ${lockBadge}
      <div class="skill-node-icon">${emoji}</div>
      <span class="skill-node-title">${title}</span>
      ${renderBoxes(current, max, isReachable, maxed, isFeature, gridCols || 0)}
      ${costHTML}
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

  const ttAttrs = `data-tt="featureNode" data-tt-feature="${featureId}" data-tt-icon="${emoji}"`;

  return `
    <div class="skill-node ${stateClass} is-feature" ${action} ${ttAttrs} tabindex="0" role="button" aria-label="${name}">
      ${lockBadge}
      <div class="skill-node-icon">${emoji}</div>
      <span class="skill-node-title">${name}</span>
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
    current: state.inventory.maxSlots - 5, max: INVENTORY_TOTAL_SLOTS - 5,
    maxed: state.inventory.maxSlots >= INVENTORY_TOTAL_SLOTS,
    gridCols: 5,
  }));

  capacityNodes.push(renderNode({
    emoji: "🌾", title: "Tarla", hint: "Ekim alanı",
    cost: fieldSlotUnlockCost(fieldUnlocked), action: "upgradeField",
    current: fieldUnlocked - FIELD_START_UNLOCKED, max: FIELD_TOTAL_SLOTS - FIELD_START_UNLOCKED,
    maxed: fieldUnlocked >= FIELD_TOTAL_SLOTS,
    gridCols: 5,
  }));

  if (features.orchard) {
    capacityNodes.push(renderNode({
      emoji: "🌳", title: "Bahçe", hint: "Ağaç alanı",
      cost: orchardSlotUnlockCost(orchardUnlocked), action: "upgradeOrchard",
      current: orchardUnlocked - ORCHARD_START_UNLOCKED, max: ORCHARD_TOTAL_SLOTS - ORCHARD_START_UNLOCKED,
      maxed: orchardUnlocked >= ORCHARD_TOTAL_SLOTS,
      gridCols: 6,
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