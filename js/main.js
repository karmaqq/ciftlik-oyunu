/* ═══════════════════════════════════════════════════════════════════════════ */
/*                   Oyun giriş noktası                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/main.js
import { createInitialState, processQueue } from "./state.js";
import { tickTime, currentSeason } from "./systems/time.js";
import { rollNewWeather, getWeather } from "./systems/weather.js";
import { tickFieldGrowth } from "./systems/field.js";
import { tickOrchardGrowth } from "./systems/orchard.js";
import { tickBuildings } from "./systems/buildings.js";
import { tickMarket, initMarketTimestamp } from "./systems/market.js";
import { initUI, render, tickUpdate, checkHints } from "./ui/index.js";
import { initGame, startAutoSave, clearSave } from "./systems/save.js";
import { getCalendarTradeInfo } from "./systems/calendarTrade.js";
import { setLogger } from "./log.js";
const TICK_MS = 1000;

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

  function log(message, type = "info", mergeKey = null) {
    const time = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const icon = TYPE_ICON[type] || "ℹ️";
    const cls = TYPE_CLASS[type] || "log-info";

    if (mergeKey) {
      const existing = logEl.querySelector(`[data-merge-key="${mergeKey}"]`);
      if (existing) {
        const msgEl = existing.querySelector(`.${cls}`);
        if (msgEl) msgEl.innerHTML = message;
        return;
      }
    }

    const line = document.createElement("div");
    if (mergeKey) line.setAttribute("data-merge-key", mergeKey);
    const timeSpan = document.createElement("span");
    timeSpan.className = "log-time";
    timeSpan.textContent = time;
    const iconSpan = document.createElement("span");
    iconSpan.className = "log-icon";
    iconSpan.textContent = icon;
    const msgSpan = document.createElement("span");
    msgSpan.className = cls;
    msgSpan.innerHTML = message;
    line.appendChild(timeSpan);
    line.appendChild(iconSpan);
    line.appendChild(msgSpan);
    logEl.prepend(line);
    while (logEl.children.length > 50) logEl.removeChild(logEl.lastChild);
  }

  initUI(state, log, () => {
    clearSave();
    location.reload();
  });

  setLogger(log);

  initMarketTimestamp(state.market.lastRefreshTimestamp, state);

  render();
  if (isNew) {
    log("Çiftliğe hoş geldin!", "info");
    log("İpucu: Tohumları envanterden tarlaya sürükle.", "info");
  } else {
    log("Kayıtlı oyun yüklendi!", "info");
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
      const effect = SEASON_EFFECT[s] || "";
      log(`${s.charAt(0).toUpperCase() + s.slice(1)} başladı! ${effect}`, "season");

      // Takvim ticaret bilgilendirmesi
      const calendarInfo = getCalendarTradeInfo(state);
      if (calendarInfo.active) {
        const buyMult = calendarInfo.buyMultiplierSeed;
        const sellMult = calendarInfo.sellMultiplier;
        const buyDir = buyMult < 1 ? "ucuzladı" : buyMult > 1 ? "zamlı" : "normal";
        const sellDir = sellMult > 1 ? "arttı" : sellMult < 1 ? "düştü" : "normal";
        log(`📅 Takvim Ticaret: Alış ${buyDir}, Satış ${sellDir}`, "trade");
      }
    }

    if (events.yearChanged) {
      log(`Yıl ${state.time.year} başladı!`, "season");
    }

    tickFieldGrowth(state, 1);
    tickOrchardGrowth(state, 1);
    tickBuildings(state, 1);
    tickMarket(state);

    const queueAdded = processQueue(state);
    for (const item of queueAdded) {
      const name = item.itemId;
      const existing = logEl.querySelector(`[data-merge-key="queue-${name}"]`);
      if (existing) {
        const msgEl = existing.querySelector(".log-info");
        if (msgEl) {
          const match = msgEl.textContent.match(/(\d+)\s*adet/);
          const prev = match ? parseInt(match[1]) : 0;
          msgEl.textContent = `Kuyruktan eklendi: ${name} ${prev + item.qty} adet`;
        }
      } else {
        log(`Kuyruktan eklendi: ${name} ${item.qty} adet`, "info", `queue-${name}`);
      }
    }

    tickUpdate();
  }, TICK_MS);

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
