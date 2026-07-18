/* ═══════════════════════════════════════════════════════════════════════════ */
/*                   localStorage kayıt sistemi                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/systems/save.js
// localStorage kayıt sistemi. Sadece state.js import eder, main.js kirletilmez.

import { createInitialState } from "../state.js";
import { gameLog } from "../log.js";

const SAVE_KEY = "ciftlik_oyunu_v1";
const SAVE_VERSION = 2;
const AUTO_SAVE_INTERVAL_MS = 30_000;
let autoSaveTimer = null;

// --- Serialize ---
/* ─────────────────── Durumu JSON'a çevir ─────────────────── */
export function stateToJSON(state) {
  state._saveVersion = SAVE_VERSION;
  return JSON.stringify(state);
}

// --- Versiyon migrasyonu ---
/* ─────────────────── Eski kayıtları güncelle ─────────────────── */
function migrateState(saved) {
  const v = saved._saveVersion || 1;

  if (v < 2) {
    if (saved.market && typeof saved.market.lastRefreshTimestamp !== "number") {
      saved.market.lastRefreshTimestamp = 0;
    }
  }

  saved._saveVersion = SAVE_VERSION;
  return saved;
}

// --- Deserialize (eksik alanları varsayılanlarla tamamla) ---
/* ─────────────────── JSON'dan duruma çevir ─────────────────── */
export function stateFromJSON(json) {
  const saved = JSON.parse(json);
  const fresh = createInitialState();

  function merge(target, source, path) {
    for (const key of Object.keys(source)) {
      if (path === "inventory.items") continue;

      if (!(key in target)) {
        target[key] = source[key];
      } else if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key]) &&
        typeof target[key] === "object" &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        merge(target[key], source[key], path ? `${path}.${key}` : key);
      }
    }
  }

  migrateState(saved);
  merge(saved, fresh, "");
  return saved;
}

// --- Kaydet ---
/* ─────────────────── Oyunu kaydet ─────────────────── */
export function saveGame(state) {
  try {
    const json = stateToJSON(state);
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch (e) {
    if (gameLog) gameLog("Kayıt hatası!", "error");
    return false;
  }
}

// --- Yükle ---
/* ─────────────────── Oyunu yükle ─────────────────── */
export function loadGame() {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    return stateFromJSON(json);
  } catch (e) {
    if (gameLog) gameLog("Kayıt bozuk! Yeni oyun başlatılıyor.", "error");
    return null;
  }
}

// --- Kaydı sil (Yeni Oyun) ---
/* ─────────────────── Kaydı sil ─────────────────── */
export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// --- Otomatik kayıt başlat ---
/* ─────────────────── Otomatik kaydı başlat ─────────────────── */
export function startAutoSave(state) {
  stopAutoSave();
  autoSaveTimer = setInterval(() => {
    saveGame(state);
  }, AUTO_SAVE_INTERVAL_MS);
}

// --- Otomatik kaydı durdur ---
/* ─────────────────── Otomatik kaydı durdur ─────────────────── */
export function stopAutoSave() {
  if (autoSaveTimer !== null) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// --- Oyunu başlat: kayıttan yükle veya sıfırdan başla ---
/* ─────────────────── Oyunu başlat ─────────────────── */
export function initGame() {
  const saved = loadGame();
  if (saved) {
    return { state: saved, isNew: false };
  }
  return { state: createInitialState(), isNew: true };
}
