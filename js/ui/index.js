/* ═══════════════════════════════════════════════════════════════════════════ */
/*                UI koordinatörü: init, render, tick                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/index.js
// Koordinatör: initUI, render, tickUpdate ve yardımcı senkronizasyon fonksiyonları.

import { setContext, getContext, flushSave, inventoryFilter } from "./shared.js";
import { renderHeader, updateHeaderTick } from "./header.js";
import { renderInventory, updateInventoryTick } from "./inventory.js";
import { fieldGridHTML, orchardGridHTML, updateSlotsTick } from "./field.js";
import { renderBuildingTab, updateBuildingTabTick } from "./buildings.js";
import { marketHTML } from "./market.js";
import { craftingHTML } from "./crafting.js";
import { renderUpgrades } from "./upgrades.js";
import { wireStaticEvents } from "./events.js";
import { checkHints } from "./hints.js";
import { initTooltip, refreshOpenTooltip } from "./tooltip.js";
import { initSettings, setNewGameCallback as setSettingsNewGameCallback } from "./settings.js";
/* ─────────────────── İpuçlarını kontrol et ─────────────────── */
export { checkHints };

let _lastRenderedMiddleTab = "";
let _lastRenderedRightTab = "";
let _prevMarketSeconds = -1;
let _overflowRafId = 0;
let _tickCounter = 0;

/* ─────────────────── Arayüzü başlat ─────────────────── */
export function initUI(state, log, newGameCallback) {
  setContext(state, log);
  setSettingsNewGameCallback(newGameCallback || null);
  wireStaticEvents(render);
  initTooltip();
  initSettings();

  window.addEventListener("beforeunload", () => flushSave());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });
}

/* ─────────────────── Tüm panelleri yeniden oluştur ─────────────────── */
export function render() {
  renderHeader();
  renderInventory();
  syncFeatureTabs();
  const ctx = getContext();
  const middleTab = ctx.state.ui.activeMiddleTab;
  document.getElementById("middle-content").innerHTML = middleTab === "field" ? fieldGridHTML() : orchardGridHTML();
  renderBuildingTab();
  const rightTab = ctx.state.ui.activeRightTab;
  const rightEl = document.getElementById("right-content");
  if (rightTab === "market") rightEl.innerHTML = marketHTML();
  else if (rightTab === "crafting") rightEl.innerHTML = craftingHTML();
  else if (rightTab === "upgrades") renderUpgrades();

  syncTabButtons();
  checkLabelOverflow();
  _lastRenderedMiddleTab = middleTab;
  _lastRenderedRightTab = rightTab;
}

/* ─────────────────── Zamanlı güncelleme ─────────────────── */
export function tickUpdate() {
  const ctx = getContext();
  const s = ctx.state;

  _tickCounter++;

  updateHeaderTick();
  updateInventoryTick();

  const middleTab = s.ui.activeMiddleTab;
  if (middleTab === "field" || middleTab === "orchard") {
    updateSlotsTick(middleTab);
  }

  const anyBuilding = s.features.hive || s.features.coop || s.features.barn;
  if (anyBuilding) {
    updateBuildingTabTick();
  }

  const rightTab = s.ui.activeRightTab;
  if (rightTab === "market") {
    const cur = s.market.secondsSinceRefresh;
    if (_prevMarketSeconds > cur) {
      document.getElementById("right-content").innerHTML = marketHTML();
      checkLabelOverflow();
    }
    _prevMarketSeconds = cur;
  }

  if (_tickCounter % 3 === 0) {
    checkLabelOverflow();
  }
  refreshOpenTooltip();
}

function syncFeatureTabs() {
  const ctx = getContext();
  const features = ctx.state.features || {};

  const orchardBtn = document.querySelector('#middle-tabs button[data-tab="orchard"]');
  if (orchardBtn) {
    orchardBtn.style.display = features.orchard ? "" : "none";
    if (!features.orchard && ctx.state.ui.activeMiddleTab === "orchard") {
      ctx.state.ui.activeMiddleTab = "field";
    }
  }

  const hiveBtn = document.querySelector('#building-tabs button[data-tab="hive"]');
  const coopBtn = document.querySelector('#building-tabs button[data-tab="coop"]');
  const barnBtn = document.querySelector('#building-tabs button[data-tab="barn"]');
  if (hiveBtn) hiveBtn.style.display = features.hive ? "" : "none";
  if (coopBtn) coopBtn.style.display = features.coop ? "" : "none";
  if (barnBtn) barnBtn.style.display = features.barn ? "" : "none";

  if (!features[ctx.state.ui.activeBuildingTab]) {
    if (features.hive) ctx.state.ui.activeBuildingTab = "hive";
    else if (features.coop) ctx.state.ui.activeBuildingTab = "coop";
    else if (features.barn) ctx.state.ui.activeBuildingTab = "barn";
  }

  const buildingSection = document.querySelector("#middle-panel .panel-bottom");
  const anyBuilding = features.hive || features.coop || features.barn;
  if (buildingSection) {
    buildingSection.style.display = anyBuilding ? "" : "none";
  }

  const quickSellZone = document.getElementById("quick-sell-zone");
  const sellTabs = document.getElementById("sell-tabs");
  if (quickSellZone) quickSellZone.style.display = features.quickSell ? "" : "none";
  if (sellTabs) sellTabs.style.display = features.quickSell ? "" : "none";

  const inventoryPanel = document.getElementById("inventory-panel");
  if (inventoryPanel) {
    inventoryPanel.classList.toggle("no-quick-sell", !features.quickSell);
  }

  const middlePanel = document.getElementById("middle-panel");
  if (middlePanel) {
    middlePanel.classList.toggle("no-buildings", !anyBuilding);
  }
}

function syncTabButtons() {
  const ctx = getContext();
  document.querySelectorAll("#middle-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeMiddleTab));
  document.querySelectorAll("#building-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeBuildingTab));
  document.querySelectorAll("#right-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeRightTab));
  document.querySelectorAll("#inventory-filters button").forEach((b) => b.classList.toggle("active", b.dataset.filter === inventoryFilter));
}

function checkLabelOverflow() {
  if (_overflowRafId) cancelAnimationFrame(_overflowRafId);
  _overflowRafId = requestAnimationFrame(() => {
    _overflowRafId = 0;
    const els = document.querySelectorAll(".label, .slot-name");
    const measurements = [];
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const text = el.querySelector(".label-text");
      if (!text) continue;
      measurements.push({ el, text, scrollW: text.scrollWidth, clientW: el.clientWidth });
    }
    for (let i = 0; i < measurements.length; i++) {
      const { el, scrollW, clientW } = measurements[i];
      el.classList.remove("is-overflow");
      if (scrollW > clientW + 2) {
        el.classList.add("is-overflow");
        const dist = scrollW - clientW;
        const dur = Math.max(3, dist / 30);
        el.style.setProperty("--scroll-dist", `-${dist + 10}px`);
        el.style.setProperty("--scroll-dur", `${dur}s`);
      }
    }
  });
}
