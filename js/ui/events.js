/* ═══════════════════════════════════════════════════════════════════════════ */
/*                      Tüm olay yönetimi                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/events.js
// Tüm olay yönetimi: tıklama, sürükleme-bırakma, hover olayları.

import { itemDisplayName, itemSellPrice, itemEmoji } from "../data/items.js";
import { plantSeed, harvestSlot, unlockSlot, removePlant } from "../systems/field.js";
import { plantTree, harvestOrchardSlot, removePlant as removePlantOrchard } from "../systems/orchard.js";
import { buyOneSeed, buyAllSeeds, sellItem, getBulkDiscountPercent } from "../systems/market.js";
import { craftRecipe } from "../systems/crafting.js";
import {
  upgradeFieldSlot,
  upgradeOrchardSlot,
  fieldSlotUnlockCost,
  orchardSlotUnlockCost,
  upgradeInventorySlots,
  upgradeFieldSlots,
  upgradeOrchardSlots,
  upgradeMarketSlots,
  upgradeBuildingFromPanel,
  buyFeature,
  FEATURE_NAMES,
} from "../systems/upgrades.js";
import { BUILDING_TYPES } from "../data/animals.js";
import {
  removeAnimalProduct, getAnimalProductCount,
} from "../state.js";
import {
  getContext, gold, deductGold, addGold, reasonText,
  scheduleSave, inventoryFilter, inventorySort,
  setInventoryFilter, setInventorySort,
  quickSellMode, saveQuickSellMode,
  setHoveredMarketBtn,
} from "./shared.js";
import { highlightRecipes } from "./inventory.js";

let _dragItemId = null;
let _hoverTimer = null;
let _hoverSlotEl = null;
let _plantedDuringDrag = false;

let _renderFn = null;

/* ─────────────────── Sabit olayları bağla ─────────────────── */
export function wireStaticEvents(renderFn) {
  _renderFn = renderFn;

  document.getElementById("middle-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    getContext().state.ui.activeMiddleTab = btn.dataset.tab;
    renderFn();
  });

  document.getElementById("building-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    getContext().state.ui.activeBuildingTab = btn.dataset.tab;
    renderFn();
  });

  document.getElementById("right-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    getContext().state.ui.activeRightTab = btn.dataset.tab;
    renderFn();
  });

  document.getElementById("inventory-filters").addEventListener("click", (e) => {
    const hamburger = e.target.closest(".hamburger-btn");
    if (hamburger) {
      setInventorySort(inventorySort === "deger" ? "isim" : "deger");
      renderFn();
      return;
    }
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    setInventoryFilter(btn.dataset.filter);
    renderFn();
  });

  document.getElementById("inventory-grid").addEventListener("mouseover", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    const itemId = cell.dataset.itemId;
    if (!itemId) return;
    const baseId = itemId.replace(/_tohum$/, "").replace(/_fidan$/, "");
    highlightRecipes(baseId, true);
  });

  document.getElementById("inventory-grid").addEventListener("mouseout", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    highlightRecipes(null, false);
  });

  document.getElementById("inventory-grid").addEventListener("dragstart", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    _dragItemId = cell.dataset.itemId;
    _plantedDuringDrag = false;
    e.dataTransfer.setData("text/plain", cell.dataset.itemId);
    e.dataTransfer.setData("application/x-source", "inventory");
  });

  document.getElementById("building-content").addEventListener("dragstart", (e) => {
    const cell = e.target.closest(".building-product-cell");
    if (!cell) return;
    _dragItemId = cell.dataset.productId;
    _plantedDuringDrag = false;
    e.dataTransfer.setData("text/plain", cell.dataset.productId);
    e.dataTransfer.setData("application/x-source", "building");
  });

  const middleContent = document.getElementById("middle-content");
  middleContent.addEventListener("click", (e) => handlePlotClick(e));
  middleContent.addEventListener("dragover", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) {
      e.preventDefault();
      slot.classList.add("drag-over");
    }
    if (!_dragItemId) return;
    if (!slot) return;
    const kind = slot.dataset.kind;
    const valid = (kind === "field" && _dragItemId.endsWith("_tohum")) ||
                  (kind === "orchard" && _dragItemId.endsWith("_fidan"));
    if (!valid) return;
    if (slot === _hoverSlotEl && _hoverTimer) return;
    clearTimeout(_hoverTimer);
    _hoverTimer = null;
    _hoverSlotEl = slot;
    _hoverTimer = setTimeout(() => {
      _hoverTimer = null;
      _hoverSlotEl = null;
      if (plantOnSlot(slot, _dragItemId)) {
        _plantedDuringDrag = true;
        scheduleSave();
        renderFn();
      }
    }, 200);
  });
  middleContent.addEventListener("dragleave", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) slot.classList.remove("drag-over");
    if (slot && slot === _hoverSlotEl) {
      clearTimeout(_hoverTimer);
      _hoverTimer = null;
      _hoverSlotEl = null;
    }
  });
  middleContent.addEventListener("drop", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) slot.classList.remove("drag-over");
    handlePlotDrop(e);
  });

  document.addEventListener("dragend", () => {
    _dragItemId = null;
    _plantedDuringDrag = false;
    clearTimeout(_hoverTimer);
    _hoverTimer = null;
    _hoverSlotEl = null;
  });

  document.getElementById("right-panel").addEventListener("click", (e) => handleRightPanelAction(e));

  document.getElementById("right-panel").addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".mr-btn[data-action]");
    if (!btn) return;
    const idx = btn.dataset.index;
    const act = btn.dataset.action;
    setHoveredMarketBtn(`${idx}-${act}`);
  });

  document.getElementById("right-panel").addEventListener("mouseout", (e) => {
    const btn = e.target.closest(".mr-btn[data-action]");
    if (!btn) return;
    const related = e.relatedTarget;
    if (!related || !btn.contains(related)) {
      setHoveredMarketBtn(null);
    }
  });

  document.getElementById("sell-tabs").addEventListener("click", (e) => {
    const modeBtn = e.target.closest("[data-sell-mode]");
    if (modeBtn) {
      saveQuickSellMode(modeBtn.dataset.sellMode);
      renderFn();
    }
  });

  const quickSellZone = document.getElementById("quick-sell-zone");
  if (quickSellZone && getContext().state.features && getContext().state.features.quickSell) {
    quickSellZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      quickSellZone.classList.add("drag-over");
    });
    quickSellZone.addEventListener("dragleave", () => {
      quickSellZone.classList.remove("drag-over");
    });
    quickSellZone.addEventListener("drop", (e) => {
      e.preventDefault();
      quickSellZone.classList.remove("drag-over");
      const itemId = e.dataTransfer.getData("text/plain");
      if (!itemId) return;
      const source = e.dataTransfer.getData("application/x-source") || "inventory";
      const ctx = getContext();

      if (source === "building") {
        const available = getAnimalProductCount(ctx.state, itemId);
        if (available <= 0) return;
        const qty = quickSellMode === "bulk" ? available : 1;
        const price = itemSellPrice(itemId);
        removeAnimalProduct(ctx.state, itemId, qty);
        const total = price * qty;
        addGold(total);
        ctx.log(`${itemEmoji(itemId)} ${qty} adet ${itemDisplayName(itemId)} satıldı, +${total}🪙`, "trade");
      } else {
        const itemEntry = ctx.state.inventory.items[itemId];
        if (!itemEntry) return;
        const itemMeta = itemEntry.meta || {};
        const fullQty = itemEntry.quantity;
        const qty = quickSellMode === "bulk" ? fullQty : 1;
        const price = itemSellPrice(itemId, itemMeta);
        const result = sellItem(ctx.state, itemId, qty, price, addGold, itemMeta);
        if (result.success) {
          ctx.log(`${itemEmoji(itemId)} ${qty} adet ${itemDisplayName(itemId)} satıldı, +${result.total}🪙`, "trade");
        } else {
          ctx.log(`Satış başarısız: ${reasonText(result.reason)}`, "error");
        }
      }
      scheduleSave();
      renderFn();
    });
  }
}

function unlockedCountFn(kind) {
  const ctx = getContext();
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  return slots.filter((s) => s.unlocked).length;
}

function handlePlotClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const kind = btn.dataset.kind;
  const index = Number(btn.dataset.index);
  const action = btn.dataset.action;
  const ctx = getContext();

  if (action === "harvest") {
    const result = kind === "field" ? harvestSlot(ctx.state, index) : harvestOrchardSlot(ctx.state, index);
    if (result.success) {
      const cropId = result.cropId || result.treeId;
      ctx.log(`Hasat: ${itemEmoji(cropId)} ${itemDisplayName(cropId)}${result.rarity !== "normal" ? ` (${result.rarity}!)` : ""}`, "success");
    }
  } else if (action === "unlock") {
    const unlockedCount = unlockedCountFn(kind);
    const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount) : orchardSlotUnlockCost(unlockedCount);
    const result = unlockSlot(ctx.state, index, cost, gold, deductGold);
    ctx.log(result.success ? `Slot kilidi açıldı, ${cost}🪙` : `Kilidi açılamadı: ${reasonText(result.reason)}`, result.success ? "build" : "error");
  } else if (action === "upgradeLevel") {
    const result = kind === "field" ? upgradeFieldSlot(ctx.state, index, deductGold, gold()) : upgradeOrchardSlot(ctx.state, index, deductGold, gold());
    ctx.log(result.success ? `Hız geliştirildi → Lv${result.newLevel}` : `Geliştirme başarısız: ${reasonText(result.reason)}`, result.success ? "build" : "error");
  } else if (action === "removePlant") {
    const result = kind === "field" ? removePlant(ctx.state, index) : removePlantOrchard(ctx.state, index);
    ctx.log(result.success ? "Bitki söküldü" : `Sökülemedi: ${reasonText(result.reason)}`, result.success ? "info" : "error");
  }
  scheduleSave();
  _renderFn();
}

function plantOnSlot(slotEl, itemId) {
  const kind = slotEl.dataset.kind;
  const index = Number(slotEl.dataset.index);
  const ctx = getContext();

  if (kind === "field" && itemId.endsWith("_tohum")) {
    const cropId = itemId.replace(/_tohum$/, "");
    const result = plantSeed(ctx.state, index, cropId);
    const mergeKey = result.success ? `plant-${cropId}` : null;
    ctx.log(result.success ? `Ekildi: ${itemEmoji(cropId)} ${itemDisplayName(cropId)} 1 adet` : `Ekilemedi: ${reasonText(result.reason)}`, result.success ? "success" : "error", mergeKey);
    return result.success;
  } else if (kind === "orchard" && itemId.endsWith("_fidan")) {
    const treeId = itemId.replace(/_fidan$/, "");
    const result = plantTree(ctx.state, index, treeId);
    const mergeKey = result.success ? `plant-${treeId}` : null;
    ctx.log(result.success ? `Dikildi: ${itemEmoji(treeId)} ${itemDisplayName(treeId)} 1 adet` : `Dikilemedi: ${reasonText(result.reason)}`, result.success ? "success" : "error", mergeKey);
    return result.success;
  }
  return false;
}

function handlePlotDrop(e) {
  if (_plantedDuringDrag) return;
  const slotEl = e.target.closest(".slot");
  if (!slotEl) return;
  e.preventDefault();
  const itemId = e.dataTransfer.getData("text/plain");
  plantOnSlot(slotEl, itemId);
  scheduleSave();
  _renderFn();
}

function handleRightPanelAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const ctx = getContext();
  let result;

  if (action === "buyOne") {
    const index = Number(btn.dataset.index);
    const listing = ctx.state.market.listings[index];
    const isAnimal = listing && listing.category === "animal";
    const res = buyOneSeed(ctx.state, index, deductGold, gold());
    if (res.success) {
      const icon = isAnimal ? listing.emoji : itemEmoji(listing.seedId);
      const label = isAnimal ? listing.label : itemDisplayName(listing.seedId);
      ctx.log(`${icon} Satın alındı: ${label} 1 adet, ${res.cost}🪙`, "trade");
    } else {
      ctx.log(`Alınamadı: ${reasonText(res.reason)}`, "error");
    }
  } else if (action === "buyAll") {
    const index = Number(btn.dataset.index);
    const listing = ctx.state.market.listings[index];
    const isAnimal = listing && listing.category === "animal";
    const res = buyAllSeeds(ctx.state, index, deductGold, gold());
    if (res.success) {
      const icon = isAnimal ? listing.emoji : itemEmoji(listing.seedId);
      const label = isAnimal ? listing.label : itemDisplayName(listing.seedId);
      ctx.log(`${icon} Toplu alım: ${label} ${res.qty} adet, ${res.cost}🪙 (-${getBulkDiscountPercent()}%)`, "trade");
    } else {
      ctx.log(`Alınamadı: ${reasonText(res.reason)}`, "error");
    }
  } else if (action === "craft") {
    const recipeId = btn.dataset.recipe;
    const times = Number(btn.dataset.times);
    const res = craftRecipe(ctx.state, recipeId, times);
    if (res.success) {
      ctx.log(`${itemEmoji(res.outputId)} Üretildi: ${itemDisplayName(res.outputId)} ${res.outputQty} adet${res.firstCraft ? " (tarif öğrenildi)" : ""}`, "trade");
      if (res.tierUnlocked) {
        ctx.log(`Tier ${res.unlockedTier} tarifleri açıldı! Yeni tarifler Üretim sekmesinde`, "success");
      }
    } else {
      ctx.log(`Üretilemedi: ${reasonText(res.reason)}`, "error");
    }
  } else {
    handleUpgradeAction(e);
  }
  scheduleSave();
  _renderFn();
}

function handleUpgradeAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const ctx = getContext();
  let result;

  switch (action) {
    case "upgradeInventory":
      result = upgradeInventorySlots(ctx.state, deductGold, gold());
      if (result.success) ctx.log(`Envanter slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeField":
      result = upgradeFieldSlots(ctx.state, deductGold, gold());
      if (result.success) ctx.log(`Tarla slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeOrchard":
      result = upgradeOrchardSlots(ctx.state, deductGold, gold());
      if (result.success) ctx.log(`Bahçe slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketSeed":
      result = upgradeMarketSlots(ctx.state, "seed", deductGold, gold());
      if (result.success) ctx.log(`Tohum slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketSapling":
      result = upgradeMarketSlots(ctx.state, "sapling", deductGold, gold());
      if (result.success) ctx.log(`Fidan slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketAnimal":
      result = upgradeMarketSlots(ctx.state, "animal", deductGold, gold());
      if (result.success) ctx.log(`Hayvan slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeBuildingUpgrade":
      result = upgradeBuildingFromPanel(ctx.state, btn.dataset.building, deductGold, gold());
      if (result.success) {
        const bDef = BUILDING_TYPES[btn.dataset.building];
        ctx.log(`${bDef.name} geliştirildi, Seviye ${result.newLevel}`, "build");
      } else {
        ctx.log(`Geliştirilemedi: ${reasonText(result.reason)}`, "error");
      }
      break;
    case "buyFeature":
      const featureId = btn.dataset.feature;
      const featureResult = buyFeature(ctx.state, featureId, deductGold, gold());
      if (featureResult.success) {
        const fName = FEATURE_NAMES[featureId] || featureId;
        ctx.log(`${fName} satın alındı! ${featureResult.cost}🪙`, "success");
        _renderFn();
        return;
      } else {
        ctx.log(`Satın alınamadı: ${reasonText(featureResult.reason)}`, "error");
      }
      break;
  }
}
