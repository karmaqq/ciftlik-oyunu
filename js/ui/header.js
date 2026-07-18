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
import { openSettings } from "./settings.js";

let settingsBtnBound = false;

/* ─────────────────── Header panelini oluştur ─────────────────── */
export function renderHeader() {
  const ctx = getContext();
  const weather = getWeather(ctx.state.weather);
  const season = currentSeason(ctx.state.time);
  const weatherEmojiStr = weatherEmoji(weather);
  const monthName = MONTHS[ctx.state.time.month].name;
  const calendarActive = ctx.state.features && ctx.state.features.calendar;

  const marketSeconds = Math.max(0, MARKET_REFRESH_SECONDS - Math.round(ctx.state.market.secondsSinceRefresh));
  const queueCount = ctx.state.inventory.queue.length;

  const timeInfoHtml = calendarActive
    ? `<div class="hdr-item hdr-calendar" data-tt="calendarInfo" data-tt-icon="📅">
        <span class="hdr-calendar-main">${seasonEmoji(season)} ${season.charAt(0).toUpperCase() + season.slice(1)}  ${weather.name}</span>
        <span class="hdr-calendar-sub">Yıl ${ctx.state.time.year} · ${ctx.state.time.day} ${monthName}</span>
       </div>`
    : "";

  document.getElementById("header").innerHTML = `
    <div class="hdr-item">🪙 <b class="hdr-gold-val">${gold().toLocaleString("tr-TR")}</b></div>
    <div class="hdr-center">
      ${timeInfoHtml}
    </div>
    <div class="hdr-right">
      ${queueCount > 0 ? `<div class="hdr-item hdr-queue"><span class="hdr-queue-count">📦 ${queueCount}</span></div>` : ""}
      <div class="hdr-item hdr-market"><span class="hdr-market-label">🏪 Market:</span> <span class="hdr-market-timer">${marketSeconds}s</span></div>
      <div class="hdr-item"><button class="hdr-settings-btn" id="settings-btn" title="Ayarlar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button></div>
    </div>
  `;

  if (!settingsBtnBound) {
    const hdrEl = document.getElementById("header");
    if (hdrEl) {
      hdrEl.addEventListener("click", (e) => {
        if (e.target.closest("#settings-btn")) openSettings();
      });
      settingsBtnBound = true;
    }
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
  const calendarEl = hdrEl.querySelector(".hdr-calendar");
  if (calendarEl && calendarActive) {
    const season = currentSeason(s.time);
    const monthName = MONTHS[s.time.month].name;
    const weather = getWeather(s.weather);
    const mainEl = calendarEl.querySelector(".hdr-calendar-main");
    const subEl = calendarEl.querySelector(".hdr-calendar-sub");
    if (mainEl) mainEl.textContent = `${seasonEmoji(season)} ${season.charAt(0).toUpperCase() + season.slice(1)}  ${weather.name}`;
    if (subEl) subEl.textContent = `Yıl ${s.time.year} · ${s.time.day} ${monthName}`;
  }

  const marketEl = hdrEl.querySelector(".hdr-market-timer");
  if (marketEl) {
    const marketSeconds = Math.max(0, MARKET_REFRESH_SECONDS - Math.round(s.market.secondsSinceRefresh));
    marketEl.textContent = `${marketSeconds}s`;
  }

  if (queueEl) {
    queueEl.textContent = `📦 ${currentQueueCount}`;
  }
}
