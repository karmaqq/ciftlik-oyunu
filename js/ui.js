// js/ui.js
// DOM render + olay (event) yönetimi. Tüm sistem fonksiyonlarını çağırıp
// state'i değiştirir, ardından render(state) ile ekranı günceller.

import { CROPS } from "./data/crops.js";
import { TREES } from "./data/trees.js";
import { RECIPES } from "./data/recipes.js";
import { BUILDING_TYPES, capacityForLevel, MAX_BUILDING_LEVEL } from "./data/animals.js";
import { itemDisplayName, itemSellPrice, resolveItem } from "./data/items.js";
import { formatTime, currentSeason } from "./systems/time.js";
import { getWeather } from "./systems/weather.js";
import { getInventoryList, FILTERS } from "./systems/inventory.js";
import { plantSeed, harvestSlot } from "./systems/field.js";
import { plantTree, harvestOrchardSlot } from "./systems/orchard.js";
import { buyAnimal, upgradeBuilding, buildingUpgradeCost } from "./systems/buildings.js";
import { buyListingSeed, sellItem } from "./systems/market.js";
import { craftRecipe, canCraft, missingIngredients } from "./systems/crafting.js";
import { claimQuest, registerProgress } from "./systems/quests.js";
import {
  upgradeFieldSlot,
  upgradeFieldSeedSave,
  upgradeOrchardSlot,
  upgradeOrchardSeedSave,
  fieldSlotUnlockCost,
  orchardSlotUnlockCost,
} from "./systems/upgrades.js";
import { FIELD_LEVEL_SPEED_BONUS, SEED_SAVE_CHANCE_PER_LEVEL, MAX_FIELD_LEVEL, MAX_SEED_SAVE_LEVEL } from "./state.js";

let ctx = null; // { state, log(msg) }
let inventoryFilter = "hepsi";
let inventorySort = "isim";

export function initUI(state, log) {
  ctx = { state, log };
  wireStaticEvents();
}

function gold() { return ctx.state.player.gold; }
function deductGold(amount) { ctx.state.player.gold -= amount; }
function addGold(amount) { ctx.state.player.gold += amount; }

// ---------------------------------------------------------------------------
// ANA RENDER
// ---------------------------------------------------------------------------
export function render() {
  renderHeader();
  renderInventory();
  const middleTab = ctx.state.ui.activeMiddleTab;
  document.getElementById("middle-content").innerHTML = middleTab === "field" ? fieldGridHTML() : orchardGridHTML();
  renderBuildingTab();
  const rightTab = ctx.state.ui.activeRightTab;
  const rightEl = document.getElementById("right-content");
  if (rightTab === "market") rightEl.innerHTML = marketHTML();
  else if (rightTab === "crafting") rightEl.innerHTML = craftingHTML();
  else if (rightTab === "quests") rightEl.innerHTML = questsHTML();
  else rightEl.innerHTML = buildingUpgradesHTML();

  syncTabButtons();
}

function syncTabButtons() {
  document.querySelectorAll("#middle-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeMiddleTab));
  document.querySelectorAll("#building-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeBuildingTab));
  document.querySelectorAll("#right-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeRightTab));
  document.querySelectorAll("#inventory-filters button").forEach((b) => b.classList.toggle("active", b.dataset.filter === inventoryFilter));
}

// ---------------------------------------------------------------------------
// HEADER
// ---------------------------------------------------------------------------
function renderHeader() {
  const weather = getWeather(ctx.state.weather);
  document.getElementById("header").innerHTML = `
    <div class="hdr-item">🪙 <b>${gold()}</b></div>
    <div class="hdr-item">🕐 ${formatTime(ctx.state.time)}</div>
    <div class="hdr-item">🌤️ ${weather.name}</div>
  `;
}

// ---------------------------------------------------------------------------
// ENVANTER
// ---------------------------------------------------------------------------
function renderInventory() {
  const filtersEl = document.getElementById("inventory-filters");
  filtersEl.innerHTML = FILTERS.map((f) => `<button data-filter="${f}">${f}</button>`).join("");

  const list = getInventoryList(ctx.state, { filter: inventoryFilter, sortBy: inventorySort });
  const grid = document.getElementById("inventory-grid");
  const cells = [];
  for (let i = 0; i < 49; i++) {
    const entry = list[i];
    if (!entry) { cells.push(`<div class="cell empty"></div>`); continue; }
    const name = itemDisplayName(entry.itemId);
    const price = itemSellPrice(entry.itemId);
    const isSeedLike = entry.category === "tohum" || entry.category === "fidan";
    const tooltip = isSeedLike
      ? `${name}\nSürükle ve ekebilirsin\nFiyat: ${price}💰`
      : `${name}\nSatış: ${price}💰\nMiktar: ${entry.quantity}`;
    cells.push(`
      <div class="cell item ${entry.category}" draggable="true" data-item-id="${entry.itemId}" data-tooltip="${tooltip}">
        <span class="qty">${entry.quantity}</span>
        <span class="label">${abbreviate(name)}</span>
      </div>
    `);
  }
  grid.innerHTML = cells.join("");
}

function abbreviate(name) {
  return name.length > 10 ? name.slice(0, 9) + "…" : name;
}

// ---------------------------------------------------------------------------
// TARLA
// ---------------------------------------------------------------------------
function fieldGridHTML() {
  const slots = ctx.state.field.slots
    .map((slot, i) => slotHTML(slot, i, "field"))
    .join("");
  return `<div class="plot-grid field-grid">${slots}</div>`;
}

function orchardGridHTML() {
  const slots = ctx.state.orchard.slots
    .map((slot, i) => slotHTML(slot, i, "orchard"))
    .join("");
  return `<div class="plot-grid orchard-grid">${slots}</div>`;
}

function slotHTML(slot, index, kind) {
  const dataset = getData(kind);
  if (!slot.unlocked) {
    const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount(kind)) : orchardSlotUnlockCost(unlockedCount(kind));
    return `<div class="slot locked" data-kind="${kind}" data-index="${index}" data-action="unlock" data-tooltip="Kilidi aç: ${cost}💰">
      🔒<br><small>${cost}💰</small>
    </div>`;
  }

  if (!slot.planted) {
    return `<div class="slot empty-plantable" data-kind="${kind}" data-index="${index}" data-tooltip="Tohum/fidan sürükle">
      <div class="slot-inner">＋</div>
      ${upgradeButtonsHTML(slot, index, kind)}
    </div>`;
  }

  const def = dataset.find((d) => d.id === slot.planted.cropId);
  const pct = Math.min(100, Math.round((slot.planted.elapsedSeconds / slot.planted.requiredSeconds) * 100));
  const ready = slot.planted.ready;
  const cropName = def ? def.name : slot.planted.cropId;
  const tooltip = ready
    ? `${cropName} — Hasat hazır!`
    : `${cropName}\nBüyüme: %${pct}\nLv${slot.level} hız bonusu`;

  return `<div class="slot ${ready ? "ready" : "growing"}" data-kind="${kind}" data-index="${index}" data-action="${ready ? "harvest" : ""}" data-tooltip="${tooltip}">
    <div class="slot-inner">${ready ? "🌾" : "🌱"}</div>
    <div class="slot-name">${def ? abbreviate(def.name) : ""}</div>
    ${ready ? "" : `<div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>`}
    ${upgradeButtonsHTML(slot, index, kind)}
  </div>`;
}

function upgradeButtonsHTML(slot, index, kind) {
  const lvlMaxed = slot.level >= MAX_FIELD_LEVEL;
  const seedMaxed = slot.seedSaveLevel >= MAX_SEED_SAVE_LEVEL;
  return `<div class="slot-upgrades">
    <button class="mini-btn" data-kind="${kind}" data-index="${index}" data-action="upgradeLevel" ${lvlMaxed ? "disabled" : ""} title="Hız Lv${slot.level}/10 (+%${Math.round(FIELD_LEVEL_SPEED_BONUS * 100 * slot.level)})">⬆${slot.level}</button>
    <button class="mini-btn" data-kind="${kind}" data-index="${index}" data-action="upgradeSeed" ${seedMaxed ? "disabled" : ""} title="Tohum koruma Lv${slot.seedSaveLevel}/10 (+%${Math.round(SEED_SAVE_CHANCE_PER_LEVEL * 100 * slot.seedSaveLevel)})">🌱${slot.seedSaveLevel}</button>
  </div>`;
}

function getData(kind) { return kind === "field" ? CROPS : TREES; }
function unlockedCount(kind) {
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  return slots.filter((s) => s.unlocked).length;
}

// ---------------------------------------------------------------------------
// BİNALAR (Kovan / Kümes / Ahır)
// ---------------------------------------------------------------------------
function renderBuildingTab() {
  const type = ctx.state.ui.activeBuildingTab;
  const def = BUILDING_TYPES[type];
  const building = ctx.state.buildings[type];
  const capacity = capacityForLevel(type, building.level);
  const upgradeCost = buildingUpgradeCost(building.level);
  const maxed = building.level >= MAX_BUILDING_LEVEL;

  const tooltip = `${def.name} Seviye ${building.level}\n${def.animalName}: ${building.population}/${capacity}\nÜretim: ${itemDisplayName(def.productId)}`;

  document.getElementById("building-content").innerHTML = `
    <div class="building-panel" data-tooltip="${tooltip}">
      <h3>${def.name} — Seviye ${building.level}</h3>
      <p>${def.animalName}: ${building.population} / ${capacity}</p>
      <p>Üretim: ${itemDisplayName(def.productId)}${def.secondaryProductId ? ` (+ nadiren ${itemDisplayName(def.secondaryProductId)})` : ""}</p>
      <div class="building-actions">
        <button data-action="buyAnimal" data-building="${type}" ${building.population >= capacity ? "disabled" : ""}>
          ${def.animalName} Al (${def.animalBuyPrice}💰)
        </button>
        <button data-action="upgradeBuilding" data-building="${type}" ${maxed ? "disabled" : ""}>
          ${maxed ? "Max Seviye" : `Geliştir (${upgradeCost}💰)`}
        </button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// MARKET
// ---------------------------------------------------------------------------
function marketHTML() {
  const secondsLeft = Math.max(0, 120 - Math.round(ctx.state.market.secondsSinceRefresh));
  const rows = ctx.state.market.listings
    .map((listing, i) => {
      const name = itemDisplayName(listing.seedId);
      const total = listing.pricePerUnit * listing.bulkQty;
      const tooltip = `${name}\nBirim: ${listing.pricePerUnit}💰\nToplam: ${total}💰`;
      return `<div class="market-row" data-tooltip="${tooltip}">
        <span class="mr-name">${name} x${listing.bulkQty}</span>
        <span class="mr-price">${total}💰</span>
        <button data-action="buyListing" data-index="${i}" ${gold() < total ? "disabled" : ""}>Satın Al</button>
      </div>`;
    })
    .join("");

  return `
    <div class="panel-header">Market <small>(yenilenme: ${secondsLeft}s)</small></div>
    <div class="market-list">${rows || "<p>Yükleniyor…</p>"}</div>
  `;
}

// ---------------------------------------------------------------------------
// ÜRETİM (CRAFTING)
// ---------------------------------------------------------------------------
function craftingHTML() {
  const cards = RECIPES.map((r) => {
    const learned = ctx.state.recipes[r.id].learned;
    const craftable = canCraft(ctx.state, r.id, 1);
    const missing = missingIngredients(ctx.state, r.id);
    const inputsText = r.inputs.map((inp) => `${inp.qty}x ${itemDisplayName(inp.id)}${missing.includes(inp.id) ? " ❌" : " ✅"}`).join(", ");
    const tooltip = `Malzemeler: ${r.inputs.map((inp) => `${inp.qty}x ${itemDisplayName(inp.id)}`).join(", ")}\nÇıktı: ${r.output.qty}x ${itemDisplayName(r.output.id)}`;
    return `<div class="recipe-card ${craftable ? "" : "faded"}" data-tooltip="${tooltip}">
      <div class="recipe-title">${r.name} ${learned ? "⭐" : ""}</div>
      <div class="recipe-inputs">${inputsText}</div>
      <div class="recipe-actions">
        <button data-action="craft" data-recipe="${r.id}" data-times="1" ${craftable ? "" : "disabled"}>Üret x1</button>
        ${learned ? `<button data-action="craft" data-recipe="${r.id}" data-times="5" ${canCraft(ctx.state, r.id, 5) ? "" : "disabled"}>x5</button>` : ""}
      </div>
    </div>`;
  }).join("");

  return `<div class="panel-header">Üretim</div><div class="recipe-grid">${cards}</div>`;
}

// ---------------------------------------------------------------------------
// GÖREVLER
// ---------------------------------------------------------------------------
function questsHTML() {
  const rows = ctx.state.quests
    .map((q) => {
      const pct = Math.round((q.progress / q.requiredQty) * 100);
      const done = q.progress >= q.requiredQty;
      const verb = q.type === "sell" ? "Sat" : "Üret";
      const tooltip = `${verb}: ${itemDisplayName(q.itemId)}\nİlerleme: ${q.progress}/${q.requiredQty} (%${pct})\nÖdül: ${q.reward.gold}💰`;
      return `<div class="quest-row ${done ? "done" : ""}" data-tooltip="${tooltip}">
        <div>${verb}: ${itemDisplayName(q.itemId)} (${q.progress}/${q.requiredQty})</div>
        <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
        <button data-action="claimQuest" data-quest="${q.questId}" ${done ? "" : "disabled"}>Ödül Al (${q.reward.gold}💰)</button>
      </div>`;
    })
    .join("");
  return `<div class="panel-header">Görevler</div><div class="quest-list">${rows}</div>`;
}

// ---------------------------------------------------------------------------
// BİNA GELİŞTİRME (özet, sağ panel "Geliştirme" sekmesi)
// ---------------------------------------------------------------------------
function buildingUpgradesHTML() {
  const rows = Object.keys(BUILDING_TYPES)
    .map((type) => {
      const def = BUILDING_TYPES[type];
      const b = ctx.state.buildings[type];
      const cost = buildingUpgradeCost(b.level);
      const maxed = b.level >= MAX_BUILDING_LEVEL;
      const capacity = capacityForLevel(type, b.level);
      const tooltip = `${def.name}\nSeviye: ${b.level}/${MAX_BUILDING_LEVEL}\nKapasite: ${b.population}/${capacity}\nHayvan: ${def.animalName}`;
      return `<div class="upgrade-row" data-tooltip="${tooltip}">
        <span>${def.name} — Lv ${b.level}/${MAX_BUILDING_LEVEL}</span>
        <button data-action="upgradeBuilding" data-building="${type}" ${maxed ? "disabled" : ""}>${maxed ? "Max" : `${cost}💰`}</button>
      </div>`;
    })
    .join("");
  return `<div class="panel-header">Bina Geliştirme</div><div class="upgrade-list">${rows}</div>
    <p class="hint">Tarla/Bahçe slot geliştirmeleri (hız & tohum koruma) doğrudan slot üzerindeki ⬆/🌱 butonlarından yapılır.</p>`;
}

// ---------------------------------------------------------------------------
// OLAY YÖNETİMİ
// ---------------------------------------------------------------------------
function wireStaticEvents() {
  document.getElementById("middle-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    ctx.state.ui.activeMiddleTab = btn.dataset.tab;
    render();
  });

  document.getElementById("building-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    ctx.state.ui.activeBuildingTab = btn.dataset.tab;
    render();
  });

  document.getElementById("right-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    ctx.state.ui.activeRightTab = btn.dataset.tab;
    render();
  });

  document.getElementById("inventory-filters").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    inventoryFilter = btn.dataset.filter;
    render();
  });

  document.getElementById("inventory-sort").addEventListener("change", (e) => {
    inventorySort = e.target.value;
    render();
  });

  // Envanter: tıklayınca sat (tohum/fidan hariç), sürükleyince ek
  document.getElementById("inventory-grid").addEventListener("click", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    const itemId = cell.dataset.itemId;
    if (itemId.endsWith("_tohum") || itemId.endsWith("_fidan")) {
      ctx.log("Bunu ekmek için tarlaya/bahçeye sürükle-bırak yapmalısın.");
      return;
    }
    const price = itemSellPrice(itemId);
    const result = sellItem(ctx.state, itemId, 1, price, addGold);
    if (result.success) {
      registerProgress(ctx.state, "sell", itemId, 1);
      ctx.log(`Sattın: ${itemDisplayName(itemId)} → +${result.total}💰`);
    } else {
      ctx.log(`Satış başarısız: ${result.reason}`);
    }
    render();
  });

  document.getElementById("inventory-grid").addEventListener("dragstart", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    e.dataTransfer.setData("text/plain", cell.dataset.itemId);
  });

  // Tarla / Bahçe grid: tıklama (hasat/kilit aç/upgrade) + drop (ekme)
  const middleContent = document.getElementById("middle-content");
  middleContent.addEventListener("click", (e) => handlePlotClick(e));
  middleContent.addEventListener("dragover", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) {
      e.preventDefault();
      slot.classList.add("drag-over");
    }
  });
  middleContent.addEventListener("dragleave", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) slot.classList.remove("drag-over");
  });
  middleContent.addEventListener("drop", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) slot.classList.remove("drag-over");
    handlePlotDrop(e);
  });

  document.getElementById("building-content").addEventListener("click", (e) => handleBuildingAction(e));
  document.getElementById("right-panel").addEventListener("click", (e) => handleRightPanelAction(e));
}

function handlePlotClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const kind = btn.dataset.kind;
  const index = Number(btn.dataset.index);
  const action = btn.dataset.action;

  if (action === "unlock") {
    const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
    const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount(kind)) : orchardSlotUnlockCost(unlockedCount(kind));
    if (gold() < cost) { ctx.log("Yetersiz altın."); return; }
    deductGold(cost);
    slots[index].unlocked = true;
    ctx.log(`${kind === "field" ? "Tarla" : "Bahçe"} slotu açıldı.`);
  } else if (action === "harvest") {
    const result = kind === "field" ? harvestSlot(ctx.state, index) : harvestOrchardSlot(ctx.state, index);
    if (result.success) {
      registerProgress(ctx.state, "produce", result.cropId || result.treeId, result.qty);
      ctx.log(`Hasat: ${itemDisplayName(result.cropId || result.treeId)} ${result.rarity !== "normal" ? `(${result.rarity}!)` : ""}`);
    }
  } else if (action === "upgradeLevel") {
    const result = kind === "field" ? upgradeFieldSlot(ctx.state, index, deductGold, gold()) : upgradeOrchardSlot(ctx.state, index, deductGold, gold());
    ctx.log(result.success ? `Slot hızı geliştirildi (Lv${result.newLevel}).` : `Geliştirme başarısız: ${result.reason}`);
  } else if (action === "upgradeSeed") {
    const result = kind === "field" ? upgradeFieldSeedSave(ctx.state, index, deductGold, gold()) : upgradeOrchardSeedSave(ctx.state, index, deductGold, gold());
    ctx.log(result.success ? `Tohum koruma geliştirildi (Lv${result.newLevel}).` : `Geliştirme başarısız: ${result.reason}`);
  }
  render();
}

function handlePlotDrop(e) {
  const slotEl = e.target.closest(".slot");
  if (!slotEl) return;
  e.preventDefault();
  const itemId = e.dataTransfer.getData("text/plain");
  const kind = slotEl.dataset.kind;
  const index = Number(slotEl.dataset.index);

  if (kind === "field" && itemId.endsWith("_tohum")) {
    const cropId = itemId.replace(/_tohum$/, "");
    const result = plantSeed(ctx.state, index, cropId);
    ctx.log(result.success ? `Ekildi: ${itemDisplayName(cropId)}` : `Ekilemedi: ${result.reason}`);
  } else if (kind === "orchard" && itemId.endsWith("_fidan")) {
    const treeId = itemId.replace(/_fidan$/, "");
    const result = plantTree(ctx.state, index, treeId);
    ctx.log(result.success ? `Dikildi: ${itemDisplayName(treeId)}` : `Dikilemedi: ${result.reason}`);
  } else {
    ctx.log("Bu eşya buraya ekilemez.");
  }
  render();
}

function handleBuildingAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const buildingType = btn.dataset.building;

  if (btn.dataset.action === "buyAnimal") {
    const result = buyAnimal(ctx.state, buildingType, deductGold, gold());
    ctx.log(result.success ? "Hayvan satın alındı." : `Alınamadı: ${result.reason}`);
  } else if (btn.dataset.action === "upgradeBuilding") {
    const result = upgradeBuilding(ctx.state, buildingType, deductGold, gold());
    ctx.log(result.success ? "Bina geliştirildi." : `Geliştirilemedi: ${result.reason}`);
  }
  render();
}

function handleRightPanelAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "buyListing") {
    const index = Number(btn.dataset.index);
    const result = buyListingSeed(ctx.state, index, deductGold, gold());
    ctx.log(result.success ? `Satın alındı (${result.qty} adet, ${result.cost}💰).` : `Alınamadı: ${result.reason}`);
  } else if (action === "craft") {
    const recipeId = btn.dataset.recipe;
    const times = Number(btn.dataset.times);
    const result = craftRecipe(ctx.state, recipeId, times);
    if (result.success) {
      registerProgress(ctx.state, "produce", result.outputId, result.outputQty);
      ctx.log(`Üretildi: ${itemDisplayName(result.outputId)} x${result.outputQty}${result.firstCraft ? " (tarif öğrenildi ⭐)" : ""}`);
    } else {
      ctx.log(`Üretilemedi: ${result.reason}`);
    }
  } else if (action === "claimQuest") {
    const questId = btn.dataset.quest;
    const result = claimQuest(ctx.state, questId, addGold);
    ctx.log(result.success ? `Görev tamamlandı! +${result.reward.gold}💰` : `Alınamadı: ${result.reason}`);
  } else if (action === "upgradeBuilding") {
    const result = upgradeBuilding(ctx.state, btn.dataset.building, deductGold, gold());
    ctx.log(result.success ? "Bina geliştirildi." : `Geliştirilemedi: ${result.reason}`);
  }
  render();
}
