// js/systems/save.js
// localStorage kayıt sistemi. Sadece state.js import eder, main.js kirletilmez.

import { createInitialState } from "../state.js";

const SAVE_KEY = "ciftlik_oyunu_v1";
const AUTO_SAVE_INTERVAL_MS = 30_000;
let autoSaveTimer = null;

// --- Serialize ---
export function stateToJSON(state) {
  return JSON.stringify(state);
}

// --- Deserialize (eksik alanları varsayılanlarla tamamla) ---
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

  merge(saved, fresh, "");
  return saved;
}

// --- Kaydet ---
export function saveGame(state) {
  try {
    const json = stateToJSON(state);
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch (e) {
    if (window._gameLog) window._gameLog("Kayıt hatası!", "error");
    return false;
  }
}

// --- Yükle ---
export function loadGame() {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    return stateFromJSON(json);
  } catch (e) {
    if (window._gameLog) window._gameLog("Yükleme hatası!", "error");
    return null;
  }
}

// --- Kayıt var mı? ---
export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

// --- Kaydı sil (Yeni Oyun) ---
export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// --- Otomatik kayıt başlat ---
export function startAutoSave(state) {
  stopAutoSave();
  autoSaveTimer = setInterval(() => {
    saveGame(state);
  }, AUTO_SAVE_INTERVAL_MS);
}

// --- Otomatik kaydı durdur ---
export function stopAutoSave() {
  if (autoSaveTimer !== null) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// --- Oyunu başlat: kayıttan yükle veya sıfırdan başla ---
export function initGame() {
  const saved = loadGame();
  if (saved) {
    return { state: saved, isNew: false };
  }
  return { state: createInitialState(), isNew: true };
}
