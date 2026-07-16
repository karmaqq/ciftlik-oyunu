/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Header paneli render fonksiyonu                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/header.js
// Header paneli render ve tick güncellemeleri.

import { currentSeason, MONTHS } from "../systems/time.js";
import { getWeather } from "../systems/weather.js";
import { MARKET_REFRESH_SECONDS } from "../systems/market.js";
import { getCalendarTradeInfo } from "../systems/calendarTrade.js";
import { getContext, gold, seasonEmoji, weatherEmoji } from "./shared.js";

let _onNewGame = null;
/* ─────────────────── Yeni oyun callback'ini ayarla ─────────────────── */
export function setNewGameCallback(cb) { _onNewGame = cb; }

/* ─────────────────── Header panelini oluştur ─────────────────── */
export function renderHeader() {
  const ctx = getContext();
  const weather = getWeather(ctx.state.weather);
  const season = currentSeason(ctx.state.time);
  const seasonEmojiStr = seasonEmoji(season);
  const weatherEmojiStr = weatherEmoji(weather);
  const monthName = MONTHS[ctx.state.time.month].name;
  const calendarActive = ctx.state.features && ctx.state.features.calendar;

  const calendarInfo = getCalendarTradeInfo(ctx.state);

  const seasonEffect = {
    ilkbahar: "Çilek, ahududu, nohut gibi ürünler yetişir.",
    yaz: "Tropik meyveler ve domates için uygun mevsim.",
    sonbahar: "Nar, incir, bal kabağı hasat zamanı.",
    kış: "Narenciye ve serada yetişen ürünler öne çıkar.",
  };

  const marketSeconds = Math.max(0, MARKET_REFRESH_SECONDS - Math.round(ctx.state.market.secondsSinceRefresh));
  const queueCount = ctx.state.inventory.queue.length;

  const timeInfoHtml = calendarActive
    ? `<div class="hdr-item"><span class="hdr-time-info">Yıl ${ctx.state.time.year} · ${season.charAt(0).toUpperCase() + season.slice(1)} · ${ctx.state.time.day} ${monthName} ${weatherEmojiStr} ${weather.name}</span></div>`
    : "";

  document.getElementById("header").innerHTML = `
    <div class="hdr-item">🪙 <b class="hdr-gold-val">${gold().toLocaleString("tr-TR")}</b></div>
    ${timeInfoHtml}
    <div class="hdr-item ml-auto"><span class="hdr-market-timer">🏪 Market: ${marketSeconds}s</span></div>
    ${queueCount > 0 ? `<div class="hdr-item hdr-queue"><span class="hdr-queue-count">📦 ${queueCount}</span></div>` : ""}
    <div class="hdr-item"><button class="new-game-btn" id="new-game-btn">🔄 Yeni Oyun</button></div>
  `;

  const ngBtn = document.getElementById("new-game-btn");
  if (ngBtn) {
    ngBtn.addEventListener("click", () => {
      if (_onNewGame) _onNewGame();
    });
  }
}

/* ─────────────────── Header zamanlı güncelleme ─────────────────── */
export function updateHeaderTick() {
  const ctx = getContext();
  const s = ctx.state;
  const hdrEl = document.getElementById("header");
  if (!hdrEl) return;

  const currentQueueCount = s.inventory.queue.length;
  const queueEl = hdrEl.querySelector(".hdr-queue-count");
  if ((currentQueueCount > 0 && !queueEl) || (currentQueueCount === 0 && queueEl)) {
    renderHeader();
    return;
  }

  const goldEl = hdrEl.querySelector(".hdr-gold-val");
  if (goldEl) goldEl.textContent = gold().toLocaleString("tr-TR");

  const calendarActive = s.features && s.features.calendar;
  const timeEl = hdrEl.querySelector(".hdr-time-info");
  if (timeEl && calendarActive) {
    const season = currentSeason(s.time);
    const monthName = MONTHS[s.time.month].name;
    const weather = getWeather(s.weather);
    const weatherEmojiStr = weatherEmoji(weather);
    timeEl.textContent = `Yıl ${s.time.year} · ${season.charAt(0).toUpperCase() + season.slice(1)} · ${s.time.day} ${monthName} ${weatherEmojiStr} ${weather.name}`;
  }

  const marketEl = hdrEl.querySelector(".hdr-market-timer");
  if (marketEl) {
    const marketSeconds = Math.max(0, MARKET_REFRESH_SECONDS - Math.round(s.market.secondsSinceRefresh));
    marketEl.textContent = `🏪 Market: ${marketSeconds}s`;
  }

  if (queueEl) {
    queueEl.textContent = `📦 ${currentQueueCount}`;
  }
}
