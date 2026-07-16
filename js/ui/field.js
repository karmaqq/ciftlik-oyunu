/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Tarla ve bahçe grid render                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/field.js
// Tarla ve bahçe grid render + slot tick güncellemeleri.

import { CROPS } from "../data/crops.js";
import { TREES } from "../data/trees.js";
import { itemEmoji } from "../data/items.js";
import { fieldUpgradeCost } from "../systems/field.js";
import { orchardUpgradeCost } from "../systems/orchard.js";
import { fieldSlotUnlockCost, orchardSlotUnlockCost } from "../systems/upgrades.js";
import { MAX_FIELD_LEVEL } from "../state.js";
import { getContext, gold } from "./shared.js";

function getData(kind) { return kind === "field" ? CROPS : TREES; }

function unlockedCountFn(kind) {
  const ctx = getContext();
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  return slots.filter((s) => s.unlocked).length;
}

function upgradeButtonsHTML(slot, index, kind) {
  const lvlMaxed = slot.level >= MAX_FIELD_LEVEL;
  const speedCost = kind === "field" ? fieldUpgradeCost(slot.level) : orchardUpgradeCost(slot.level);

  return `<div class="slot-upgrades">
    <button class="mini-btn${gold() < speedCost && !lvlMaxed ? " insufficient-gold" : ""}" data-kind="${kind}" data-index="${index}" data-action="upgradeLevel" data-tt="slotUpgrade" data-tt-kind="${kind}" data-tt-index="${index}" ${lvlMaxed ? "disabled" : ""}><svg class="upgrade-icon" viewBox="0 0 12 12" width="18" height="18"><path d="M6 2 L10 7 L8 7 L8 10 L4 10 L4 7 L2 7 Z" fill="currentColor"/></svg>${slot.level}</button>
  </div>`;
}

function slotHTML(slot, index, kind) {
  const dataset = getData(kind);
  const kindName = kind === "field" ? "Tarla" : "Bahçe";
  const unlockedCount = unlockedCountFn(kind);

  if (!slot.unlocked) {
    const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount) : orchardSlotUnlockCost(unlockedCount);
    return `<div class="slot locked" data-kind="${kind}" data-index="${index}" data-action="unlock" data-tt="lockedSlot" data-tt-kind="${kind}" data-tt-index="${index}">
      <div class="slot-inner">🔒</div>
      <div class="slot-name">${cost}🪙</div>
    </div>`;
  }

  if (!slot.planted) {
    return `<div class="slot empty-plantable" data-kind="${kind}" data-index="${index}" data-tt="emptySlot" data-tt-kind="${kind}" data-tt-index="${index}">
      ${upgradeButtonsHTML(slot, index, kind)}
      <div class="slot-inner">＋</div>
    </div>`;
  }

  const def = dataset.find((d) => d.id === slot.planted.cropId);
  const pct = Math.min(100, Math.round((slot.planted.elapsedSeconds / slot.planted.requiredSeconds) * 100));
  const ready = slot.planted.ready;
  const baseEmoji = itemEmoji(def ? def.id : slot.planted.cropId);

  return `<div class="slot ${ready ? "ready" : "growing"}" data-kind="${kind}" data-index="${index}" data-action="${ready ? "harvest" : ""}" data-tt="${ready ? "readySlot" : "growingSlot"}" data-tt-kind="${kind}" data-tt-index="${index}">
    ${upgradeButtonsHTML(slot, index, kind)}
    <div class="slot-inner">${baseEmoji}</div>
    ${ready ? "" : `<div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>`}
    <button class="remove-btn" data-kind="${kind}" data-index="${index}" data-action="removePlant" title="Sök">🗑️</button>
  </div>`;
}

/* ─────────────────── Tarla grid HTML içeriği ─────────────────── */
export function fieldGridHTML() {
  const ctx = getContext();
  const slots = ctx.state.field.slots
    .filter((slot) => slot.unlocked)
    .map((slot, i) => slotHTML(slot, i, "field"))
    .join("");
  return `<div class="plot-grid field-grid">${slots}</div>`;
}

/* ─────────────────── Bahçe grid HTML içeriği ─────────────────── */
export function orchardGridHTML() {
  const ctx = getContext();
  const slots = ctx.state.orchard.slots
    .filter((slot) => slot.unlocked)
    .map((slot, i) => slotHTML(slot, i, "orchard"))
    .join("");
  return `<div class="plot-grid orchard-grid">${slots}</div>`;
}

/* ─────────────────── Slot güncelleme zamanlayıcısı ─────────────────── */
export function updateSlotsTick(kind) {
  const ctx = getContext();
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const dataset = kind === "field" ? CROPS : TREES;
  const slotEls = document.querySelectorAll(`.slot[data-kind="${kind}"]`);

  slotEls.forEach((slotEl) => {
    const index = Number(slotEl.dataset.index);
    const slot = slots[index];
    if (!slot || !slot.planted) return;

    const pct = Math.min(100, Math.round((slot.planted.elapsedSeconds / slot.planted.requiredSeconds) * 100));
    const ready = slot.planted.ready;

    const progressFill = slotEl.querySelector(".progress-fill");
    if (progressFill) {
      progressFill.style.width = `${pct}%`;
    }

    const progressEl = slotEl.querySelector(".progress");
    if (progressEl) {
      progressEl.style.display = ready ? "none" : "";
    }

    if (ready && !slotEl.classList.contains("ready")) {
      slotEl.classList.add("ready");
      slotEl.classList.remove("growing");
      slotEl.dataset.action = "harvest";
    } else if (!ready && !slotEl.classList.contains("growing")) {
      slotEl.classList.add("growing");
      slotEl.classList.remove("ready");
      slotEl.dataset.action = "";
    }
  });
}
