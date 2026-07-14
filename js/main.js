// js/main.js
import { createInitialState, processQueue } from "./state.js";
import { tickTime, currentSeason } from "./systems/time.js";
import { rollNewWeather, getWeather } from "./systems/weather.js";
import { tickFieldGrowth } from "./systems/field.js";
import { tickOrchardGrowth } from "./systems/orchard.js";
import { tickBuildings } from "./systems/buildings.js";
import { tickMarket, initMarketTimestamp, getMarketTimestamp } from "./systems/market.js";
import { initUI, render, checkHints } from "./ui.js";
import { ensureQuestPool } from "./systems/quests.js";
import { initGame, saveGame, startAutoSave, clearSave } from "./systems/save.js";

const TICK_MS = 1000;

const SEASON_EMOJI = { ilkbahar: "🌸", yaz: "☀️", sonbahar: "🍂", kış: "❄️" };
const SEASON_EFFECT = {
  ilkbahar: "Çoğu ürün için uygun mevsim — ekime başla!",
  yaz: "Sıcak hava bazı büyümeleri hızlandırır — tropik meyveler için ideal.",
  sonbahar: "Büyümeler yavaşlar — hasat ve satış zamanı.",
  kış: "Büyümeler çok yavaşlar — narenciye hasadına odaklan.",
};
const WEATHER_EFFECT = {
  normal: "Büyüme normal hızda.",
  yagmurlu: "Büyüme +15% hızlandı, nadir ürün şansı arttı.",
  kurak: "Büyüme −30% yavaşladı, ticaret riski var.",
  firtina: "Büyüme −40% yavaşladı, yüksek risk!",
  gokkusagi: "Büyüme +10%, nadir/efsanevi/gizemli ürün şansı çok yüksek!",
};

function main() {
  const { state, isNew } = initGame();

  const logEl = document.getElementById("log");

  const TYPE_ICON = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warn: "⚠️",
    season: "🗓️",
    build: "🔧",
    trade: "💰",
  };

  const TYPE_CLASS = {
    success: "log-success",
    error: "log-error",
    info: "log-info",
    warn: "log-warn",
    season: "log-season",
    build: "log-build",
    trade: "log-trade",
  };

  function log(message, type = "info") {
    const time = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const icon = TYPE_ICON[type] || "ℹ️";
    const cls = TYPE_CLASS[type] || "log-info";
    const line = document.createElement("div");
    line.innerHTML = `<span class="log-time">${time}</span> <span class="log-icon">${icon}</span> <span class="${cls}">${message}</span>`;
    logEl.prepend(line);
    while (logEl.children.length > 50) logEl.removeChild(logEl.lastChild);
  }

  // --- Tooltip sistemi ---
  const ttEl = document.getElementById("game-tooltip");
  const ttInner = ttEl.querySelector(".tt-inner");
  const ttStore = new Map();
  let ttIdCounter = 0;

  window._ttStore = ttStore;
  window._ttNextId = () => `tt${ttIdCounter++}`;

  initUI(state, log, () => {
    clearSave();
    location.reload();
  });

  initMarketTimestamp(state.market.lastRefreshTimestamp, state);

  render();
  ensureQuestPool(state);

  if (isNew) {
    log("🌱 Çiftliğe hoş geldin!", "info");
    log("📋 Görevler sekmesinden görevlerini görebilirsin.", "info");
    log("💡 İpucu: Tohumları envanterden tarlaya sürükle.", "info");
  } else {
    log("💾 Kayıtlı oyun yüklendi!", "info");
  }

  startAutoSave(state);

  let lastWeatherId = state.weather.current;
  let hintTimer = 0;

  setInterval(() => {
    hintTimer++;
    if (hintTimer % 300 === 0) checkHints();

    const events = tickTime(state.time, 1);

    if (events.dayChanged) {
      if (state.time.day % 7 === 1) {
        state.weather.current = rollNewWeather();
        const w = getWeather(state.weather);
        const effect = WEATHER_EFFECT[state.weather.current] || "";
        if (state.weather.current !== lastWeatherId) {
          log(`${w.name}: ${effect}`, "season");
          lastWeatherId = state.weather.current;
        }
      }
    }

    if (events.seasonChanged) {
      const s = currentSeason(state.time);
      const emoji = SEASON_EMOJI[s] || "";
      const effect = SEASON_EFFECT[s] || "";
      log(`${emoji} ${s.charAt(0).toUpperCase() + s.slice(1)} başladı! ${effect}`, "season");
    }

    if (events.yearChanged) {
      log(`Yıl ${state.time.year} başladı! 🎉`, "season");
    }

    tickFieldGrowth(state, 1);
    tickOrchardGrowth(state, 1);
    tickBuildings(state, 1);
    tickMarket(state);

    const queueAdded = processQueue(state);
    for (const item of queueAdded) {
      const name = item.itemId;
      log(`📦 Kuyruktan eklendi: ${name} x${item.qty}`, "info");
    }

    render();
  }, TICK_MS);

  let currentTooltipTarget = null;

  function showTooltip(target) {
    const id = target.getAttribute("data-tooltip");
    const html = ttStore.get(id);
    if (!html) return;
    ttInner.innerHTML = html;
    ttEl.classList.add("visible");
    positionTooltip(target);
    currentTooltipTarget = target;
  }

  function hideTooltip() {
    ttEl.classList.remove("visible");
    currentTooltipTarget = null;
  }

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (!target) {
      hideTooltip();
      return;
    }
    if (target === currentTooltipTarget) return;
    showTooltip(target);
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (!target) { hideTooltip(); return; }
    const related = e.relatedTarget;
    if (!related || !target.contains(related)) {
      hideTooltip();
    }
  });

  document.addEventListener("mousedown", () => hideTooltip());

  document.addEventListener("dragstart", () => hideTooltip(), true);

  function positionTooltip(target) {
    const rect = target.getBoundingClientRect();
    const ttRect = ttEl.getBoundingClientRect();
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    if (left + ttRect.width > vw - 4) left = vw - ttRect.width - 4;

    let top = rect.bottom + gap;
    if (top + ttRect.height > vh - 4) top = rect.top - ttRect.height - gap;
    if (top < 4) top = 4;

    ttEl.style.top = top + "px";
    ttEl.style.left = left + "px";
  }
  const handle = document.getElementById("log-resize-handle");
  const panel = document.getElementById("log-panel");
  let dragging = false, startY = 0, startH = 0;

  handle.addEventListener("mousedown", (e) => {
    dragging = true;
    startY = e.clientY;
    startH = panel.offsetHeight;
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const delta = startY - e.clientY;
    const minH = 62;
    const maxH = Math.floor(window.innerHeight * 0.5);
    const newH = Math.min(Math.max(minH, startH + delta), maxH);
    panel.style.height = newH + "px";
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
  });
}

window.addEventListener("DOMContentLoaded", main);
