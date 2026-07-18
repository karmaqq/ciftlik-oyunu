/* ═══════════════════════════════════════════════════════════════════════════ */
/*          Tarla ve bahçe arasında paylaşılan ekim/büyüme/hasat mantığı     */
/* ═══════════════════════════════════════════════════════════════════════════ */
import { daysToSeconds } from "./time.js";
import { getWeather, rollRarity, RARITY_SELL_MULTIPLIER } from "./weather.js";
import { addItem, FIELD_LEVEL_SPEED_BONUS } from "../state.js";
import { itemDisplayName, itemEmoji } from "../data/items.js";
import { gameLog } from "../log.js";

const MIN_HARVESTS = 1;
const MAX_HARVESTS = 5;

/* ─────────────────── Slot büyüme çarpanı (tarla/bahçe ortak) ─────────────────── */
export function computeGrowthMultiplier(slot, weatherState) {
  const slotBonus = Math.min(FIELD_LEVEL_SPEED_BONUS * slot.level, 0.99);
  const levelBonus = 1 / (1 - slotBonus);
  const weatherBonus = getWeather(weatherState).growthSpeedMultiplier;
  return levelBonus * weatherBonus;
}

/* ─────────────────── Büyüme güncelle (tarla/bahçe ortak) ─────────────────── */
export function tickGrowth(slots, weatherState, dtSeconds, getItem, logPrefix) {
  for (const slot of slots) {
    if (!slot.unlocked || !slot.planted || slot.planted.ready) continue;
    const mult = computeGrowthMultiplier(slot, weatherState);
    slot.planted.elapsedSeconds += dtSeconds * mult;
    if (slot.planted.elapsedSeconds >= slot.planted.requiredSeconds) {
      slot.planted.ready = true;
      const item = getItem(slot.planted.cropId);
      if (item) {
        gameLog(`${itemEmoji(item.id)} ${itemDisplayName(item.id)} hasat için hazır`, "info");
      }
    }
  }
}

/* ─────────────────── Hasat et (tarla/bahçe ortak) ─────────────────── */
export function harvest(state, slot, getItem, returnKey) {
  if (!slot.planted || !slot.planted.ready) return { success: false, reason: "hazir_degil" };

  const item = getItem(slot.planted.cropId);
  const rarity = rollRarity(state.weather);
  const qty = 1;

  addItem(state, item.id, qty, {
    rarity,
    sellPriceOverride: rarity === "normal" ? undefined : Math.round(item.sellPrice * RARITY_SELL_MULTIPLIER[rarity]),
  });

  slot.planted.harvestsLeft--;

  if (slot.planted.harvestsLeft <= 0) {
    slot.planted = null;
    return { success: true, [returnKey]: item.id, qty, rarity, depleted: true };
  }

  if (item.recurringIntervalDays) {
    slot.planted.elapsedSeconds = 0;
    slot.planted.requiredSeconds = daysToSeconds(item.recurringIntervalDays);
    slot.planted.ready = false;
  } else {
    slot.planted = null;
  }

  return { success: true, [returnKey]: item.id, qty, rarity, depleted: false };
}

/* ─────────────────── Slotu temizle (tarla/bahçe ortak) ─────────────────── */
export function removePlant(slot) {
  if (!slot.planted) return { success: false, reason: "hazir_degil" };
  slot.planted = null;
  return { success: true };
}

/* ─────────────────── Hasat için rastgele miktar ─────────────────── */
export function randomHarvests() {
  return Math.floor(Math.random() * (MAX_HARVESTS - MIN_HARVESTS + 1)) + MIN_HARVESTS;
}
