// js/main.js
import { createInitialState } from "./state.js";
import { tickTime } from "./systems/time.js";
import { rollNewWeather } from "./systems/weather.js";
import { tickFieldGrowth } from "./systems/field.js";
import { tickOrchardGrowth } from "./systems/orchard.js";
import { tickBuildings } from "./systems/buildings.js";
import { tickMarket } from "./systems/market.js";
import { ensureQuestPool } from "./systems/quests.js";
import { initUI, render } from "./ui.js";

const TICK_MS = 1000; // 1 gerçek saniyede bir tik (1 in-game gün = 60 tik)

function main() {
  const state = createInitialState();
  ensureQuestPool(state, 3);

  const logEl = document.getElementById("log");
  function log(message) {
    const time = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const line = document.createElement("div");
    line.textContent = `[${time}] ${message}`;
    logEl.prepend(line);
    while (logEl.children.length > 30) logEl.removeChild(logEl.lastChild);
  }

  initUI(state, log);
  render();
  log("Çiftliğe hoş geldin! Tohumları envanterden tarlaya sürükleyip ekebilirsin.");

  setInterval(() => {
    const events = tickTime(state.time, 1);
    if (events.dayChanged) {
      state.weather.current = rollNewWeather();
    }
    tickFieldGrowth(state, 1);
    tickOrchardGrowth(state, 1);
    tickBuildings(state, 1);
    tickMarket(state, 1);
    ensureQuestPool(state, 3);
    render();
  }, TICK_MS);
}

window.addEventListener("DOMContentLoaded", main);
