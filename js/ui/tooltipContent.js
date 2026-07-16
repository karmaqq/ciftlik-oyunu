/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Tooltip içerik üreticileri                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/tooltipContent.js

import { getContext } from "./shared.js";
import { resolveItem, itemDisplayName, itemSellPrice } from "../data/items.js";
import { getCrop } from "../data/crops.js";
import { getTree } from "../data/trees.js";
import { getCalendarSellMultiplier, getCalendarBuyMultiplier, getCalendarTradeInfo, SEASON_SELL_MULTIPLIER, SEASON_BUY_MULTIPLIER, SEASON_SAPLING_MULTIPLIER, WEATHER_BUY_MULTIPLIER, WEATHER_RARITY_BONUS } from "../systems/calendarTrade.js";
import { getWeather, RARITY_SELL_MULTIPLIER, WEATHER_TYPES } from "../systems/weather.js";
import { currentSeason } from "../systems/time.js";
import { getBulkDiscountPercent, MARKET_REFRESH_SECONDS } from "../systems/market.js";
import { FIELD_LEVEL_SPEED_BONUS, MAX_FIELD_LEVEL } from "../state.js";
import { fieldSlotUnlockCost, orchardSlotUnlockCost, FEATURE_COSTS, FEATURE_NAMES, FEATURE_DESCRIPTIONS } from "../systems/upgrades.js";
import { fieldUpgradeCost } from "../systems/field.js";
import { orchardUpgradeCost } from "../systems/orchard.js";
import { BUILDING_TYPES, capacityForLevel } from "../data/animals.js";
import { RECIPES } from "../data/recipes.js";
import { canCraft } from "../systems/crafting.js";
import { seasonEmoji, quickSellMode } from "./shared.js";

/* ─────────────────── İşaretli yüzde ─────────────────── */
function signedPercent(value) {
  const pct = Math.round(value * 100);
  if (pct === 0) return `<span class="tt-neutral">%0</span>`;
  const cls = pct > 0 ? "tt-positive" : "tt-negative";
  return `<span class="${cls}">%${Math.abs(pct)}</span>`;
}

/* ─────────────────── Tooltip içeriğini çöz ─────────────────── */
export function resolveTooltipContent(dataset, detail) {
  const type = dataset.tt;
  if (!type) return null;

  switch (type) {
    case "product": return buildProduct(dataset, detail);
    case "marketBuy": return buildMarketBuy(dataset, detail);
    case "marketInfo": return buildMarketInfo(dataset, detail);
    case "soldOut": return buildSoldOut(dataset, detail);
    case "bulkDiscount": return buildBulkDiscount(dataset, detail);
    case "emptySlot": return buildEmptySlot(dataset, detail);
    case "lockedSlot": return buildLockedSlot(dataset, detail);
    case "growingSlot": return buildGrowingSlot(dataset, detail);
    case "readySlot": return buildReadySlot(dataset, detail);
    case "slotUpgrade": return buildSlotUpgrade(dataset, detail);
    case "upgradeNode": return buildUpgradeNode(dataset, detail);
    case "featureNode": return buildFeatureNode(dataset, detail);
    case "calendarInfo": return buildCalendarInfo(dataset, detail);
    case "craftRecipe": return buildCraftRecipe(dataset, detail);
    case "quickSellZone": return buildQuickSellZone(dataset, detail);
    case "buildingCapacity": return buildBuildingCapacity(dataset, detail);
    case "inventoryFilter": return buildInventoryFilter(dataset, detail);
    case "inventorySort": return buildInventorySort(dataset, detail);
    default: return null;
  }
}

/* ─────────────────── Ürün (envanter, tarla, bina) ─────────────────── */
function buildProduct(ds, detail) {
  const ctx = getContext();
  const itemId = ds.ttItem;
  if (!itemId) return null;

  const resolved = resolveItem(itemId);
  const entry = ctx.state.inventory.items[itemId];
  const meta = entry && entry.meta ? entry.meta : {};
  const rarity = meta.rarity || "normal";

  const baseSellPrice = resolved.sellPrice;
  const effectivePrice = meta.sellPriceOverride || baseSellPrice;

  const calendarMult = getCalendarSellMultiplier(ctx.state, rarity);
  const finalPrice = Math.round(effectivePrice * calendarMult);

  const rarityLabel = { nadir: "Nadir", legendary: "Efsanevi", gizemli: "Gizemli" };
  const rarityClass = { nadir: "tt-rarity-nadir", legendary: "tt-rarity-legendary", gizemli: "tt-rarity-gizemli" };

  let title = resolved.name;
  if (rarity !== "normal" && rarityLabel[rarity]) {
    title += ` <span class="${rarityClass[rarity]}">(${rarityLabel[rarity]})</span>`;
  }

  const rows = [];
  rows.push({ label: "Satış fiyatı", value: `${finalPrice} 🪙` });

  if (entry && entry.quantity > 1) {
    const totalValue = Math.round(effectivePrice * entry.quantity * calendarMult);
    rows.push({ label: `Toplam (${entry.quantity}x)`, value: `${totalValue} 🪙` });
  }

  if (detail) {
    const calendarActive = ctx.state.features && ctx.state.features.calendar;
    const detailRows = [];
    detailRows.push({ label: "Taban fiyat", value: `${baseSellPrice} 🪙` });

    if (rarity !== "normal" && meta.sellPriceOverride) {
      const rarityPct = (RARITY_SELL_MULTIPLIER[rarity] || 1) - 1;
      detailRows.push({ label: `Nadirlik (${rarityLabel[rarity] || rarity})`, value: signedPercent(rarityPct) });
    }

    if (calendarActive) {
      const season = currentSeason(ctx.state.time);
      const seasonName = { ilkbahar: "İlkbahar", yaz: "Yaz", sonbahar: "Sonbahar", kış: "Kış" };
      const seasonOnlyMult = SEASON_SELL_MULTIPLIER[season] || 1;
      const seasonPct = seasonOnlyMult - 1;
      if (seasonPct !== 0) {
        detailRows.push({ label: `Mevsim (${seasonName[season] || season})`, value: signedPercent(seasonPct) });
      }

      const weather = getWeather(ctx.state.weather);
      if (rarity !== "normal" && weather.id === "gokkusagi") {
        detailRows.push({ label: "Hava (Gökkuşağı)", value: signedPercent(-0.20) });
      }
    }

    detailRows.push("---");
    detailRows.push({ label: "Nihai", value: `${finalPrice} 🪙` });

    if (entry && entry.quantity > 1) {
      const totalValue = Math.round(effectivePrice * entry.quantity * calendarMult);
      detailRows.push({ label: `Toplam (${entry.quantity}x)`, value: `${totalValue} 🪙` });
    }

    return { title, rows: detailRows };
  }

  return { title, rows };
}

/* ─────────────────── Market alım butonu ─────────────────── */
function buildMarketBuy(ds, detail) {
  const ctx = getContext();
  const index = Number(ds.ttIndex);
  const mode = ds.ttMode || "single";
  const listing = ctx.state.market.listings[index];
  if (!listing) return null;

  const isAnimal = listing.category === "animal";
  const name = isAnimal ? listing.label : itemDisplayName(listing.seedId);
  const unitPrice = listing.pricePerUnit;
  const basePrice = listing.basePrice;
  const discountPct = getBulkDiscountPercent();

  const rows = [];

  if (mode === "single") {
    rows.push({ label: "1 adet", value: `${unitPrice} 🪙` });
  } else {
    const bulkCost = Math.round(unitPrice * listing.remaining * (1 - discountPct / 100));
    rows.push({ label: `${listing.remaining} adet`, value: `${bulkCost} 🪙` });
    rows.push({ label: "Toplu indirim", value: `<span class="tt-positive">%${discountPct}</span>` });
  }

  if (detail) {
    const detailRows = [];

    detailRows.push({ label: "Taban fiyat", value: `${basePrice} 🪙` });

    const calendarActive = ctx.state.features && ctx.state.features.calendar;

    if (calendarActive && basePrice > 0) {
      const category = listing.category === "sapling" ? "sapling" : "seed";
      const calendarMult = getCalendarBuyMultiplier(ctx.state, category);
      const rollResult = calendarMult !== 0 ? listing.priceMultiplier / calendarMult : listing.priceMultiplier;
      const rollDiff = rollResult - 1;
      detailRows.push({ label: "Piyasa dalgalanması", value: signedPercent(rollDiff) });

      if (!isAnimal) {
        const season = currentSeason(ctx.state.time);
        const seasonName = { ilkbahar: "İlkbahar", yaz: "Yaz", sonbahar: "Sonbahar", kış: "Kış" };

        const seasonTable = category === "sapling" ? SEASON_SAPLING_MULTIPLIER : SEASON_BUY_MULTIPLIER;
        const seasonOnlyMult = seasonTable[season] || 1.0;

        if (seasonOnlyMult !== 1.0) {
          detailRows.push({ label: `Mevsim (${seasonName[season] || season})`, value: signedPercent(seasonOnlyMult - 1) });
        }

        const weather = getWeather(ctx.state.weather);
        const weatherMult = WEATHER_BUY_MULTIPLIER[weather.id] || 1.0;
        if (weatherMult !== 1.0) {
          detailRows.push({ label: `Hava (${weather.name})`, value: signedPercent(weatherMult - 1) });
        }
      }
    }

    detailRows.push("---");
    if (mode === "single") {
      detailRows.push({ label: "1 adet", value: `${unitPrice} 🪙` });
    } else {
      const bulkCost2 = Math.round(unitPrice * listing.remaining * (1 - discountPct / 100));
      detailRows.push({ label: `${listing.remaining} adet`, value: `${bulkCost2} 🪙` });
    }

    return { title: name, rows: detailRows };
  }

  return { title: name, rows };
}

/* ─────────────────── Market ürün bilgisi (satır) ─────────────────── */
function buildMarketInfo(ds, detail) {
  const ctx = getContext();
  const index = Number(ds.ttIndex);
  const listing = ctx.state.market.listings[index];
  if (!listing) return null;

  const isAnimal = listing.category === "animal";
  const name = isAnimal ? listing.label : itemDisplayName(listing.seedId);

  const rows = [];

  if (!isAnimal) {
    const cropOrTree = listing.category === "seed" ? getCrop(listing.itemId) : getTree(listing.itemId);
    if (cropOrTree) {
      rows.push({ label: "Tier", value: `${cropOrTree.tier}` });
      rows.push({ label: "Büyüme", value: `${cropOrTree.growthDays} gün` });
      rows.push({ label: "Sezon", value: cropOrTree.seasons.join(", ") });
      rows.push({ label: "Satış", value: `${cropOrTree.sellPrice} 🪙` });
      rows.push({ label: "Hasat", value: cropOrTree.harvestCycle === "once" ? "Tek seferlik" : "Tekrarlayan" });
    }
  } else {
    const def = BUILDING_TYPES[listing.buildingType];
    if (def) {
      rows.push({ label: "Bina", value: def.name });
      rows.push({ label: "Üretim", value: `${def.baseProductionDays} günde 1 ${itemDisplayName(def.productId)}` });
    }
  }

  if (detail) {
    const calendarActive = ctx.state.features && ctx.state.features.calendar;

    if (calendarActive && listing.basePrice > 0) {
      rows.push("---");
      rows.push({ label: "Taban fiyat", value: `${listing.basePrice} 🪙` });

      const category = listing.category === "sapling" ? "sapling" : "seed";
      const calendarMult = getCalendarBuyMultiplier(ctx.state, category);
      const rollResult = calendarMult !== 0 ? listing.priceMultiplier / calendarMult : listing.priceMultiplier;
      const rollDiff = rollResult - 1;
      rows.push({ label: "Piyasa dalgalanması", value: signedPercent(rollDiff) });

      if (!isAnimal) {
        const season = currentSeason(ctx.state.time);
        const seasonName = { ilkbahar: "İlkbahar", yaz: "Yaz", sonbahar: "Sonbahar", kış: "Kış" };
        const seasonTable = category === "sapling" ? SEASON_SAPLING_MULTIPLIER : SEASON_BUY_MULTIPLIER;
        const seasonOnlyMult = seasonTable[season] || 1.0;
        if (seasonOnlyMult !== 1.0) {
          rows.push({ label: `Mevsim (${seasonName[season] || season})`, value: signedPercent(seasonOnlyMult - 1) });
        }

        const weather = getWeather(ctx.state.weather);
        const weatherMult = WEATHER_BUY_MULTIPLIER[weather.id] || 1.0;
        if (weatherMult !== 1.0) {
          rows.push({ label: `Hava (${weather.name})`, value: signedPercent(weatherMult - 1) });
        }
      }
    }

    rows.push("---");
    rows.push({ label: "Birim fiyat", value: `${listing.pricePerUnit} 🪙` });
  } else {
    rows.push("---");
    rows.push({ label: "Birim fiyat", value: `${listing.pricePerUnit} 🪙` });
  }

  return { title: name, rows };
}

/* ─────────────────── Tükenmiş market satırı ─────────────────── */
function buildSoldOut(ds, detail) {
  const ctx = getContext();
  const remaining = Math.max(0, MARKET_REFRESH_SECONDS - Math.round(ctx.state.market.secondsSinceRefresh));
  return {
    title: "Tükendi",
    rows: [{ label: "Market yenilenme", value: `${remaining}s` }],
  };
}

/* ─────────────────── Toplu indirim bilgisi ─────────────────── */
function buildBulkDiscount(ds, detail) {
  const discountPct = getBulkDiscountPercent();
  return {
    title: "Toplu Alım",
    rows: [{ label: "İndirim", value: `<span class="tt-positive">%${discountPct}</span>` }],
    footer: "Tüm kalan stoğu tek seferde indirimli alırsın.",
  };
}

/* ─────────────────── Boş dikilebilir slot ─────────────────── */
function buildEmptySlot(ds, detail) {
  const ctx = getContext();
  const kind = ds.ttKind || "field";
  const index = Number(ds.ttIndex);
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const slot = slots[index];

  const rows = [];
  rows.push({ label: "Bilgi", value: "Ekmek için bir tohum sürükleyin" });

  if (slot && slot.level > 0) {
    const speedBonus = FIELD_LEVEL_SPEED_BONUS * slot.level;
    rows.push({ label: "Hız bonusu", value: `<span class="tt-positive">%${Math.round(speedBonus * 100)}</span>` });
  }

  return { title: kind === "field" ? "Tarla Slotu" : "Bahçe Slotu", rows };
}

/* ─────────────────── Kilitli slot ─────────────────── */
function buildLockedSlot(ds, detail) {
  const ctx = getContext();
  const kind = ds.ttKind || "field";
  const index = Number(ds.ttIndex);
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const unlockedCount = slots.filter((s) => s.unlocked).length;
  const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount) : orchardSlotUnlockCost(unlockedCount);

  const rows = [];
  rows.push({ label: "Açma maliyeti", value: `${cost} 🪙` });

  const playerGold = Math.floor(ctx.state.player.gold);
  if (playerGold < cost) {
    rows.push({ label: "", value: `<span class="tt-negative">Yetersiz altın</span>` });
  }

  if (detail) {
    const base = kind === "field" ? 15 : 20;
    const rate = kind === "field" ? "1.2" : "1.25";
    rows.push("---");
    rows.push({ label: "Formül", value: `${base} 🪙 × ${rate}^açık_sayı` });
  }

  return { title: "Kilitli Slot", rows };
}

/* ─────────────────── Büyümekte olan bitki ─────────────────── */
function buildGrowingSlot(ds, detail) {
  const ctx = getContext();
  const kind = ds.ttKind || "field";
  const index = Number(ds.ttIndex);
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const slot = slots[index];
  if (!slot || !slot.planted) return null;

  const planted = slot.planted;
  const pct = Math.min(100, Math.round((planted.elapsedSeconds / planted.requiredSeconds) * 100));
  const remainingSec = Math.max(0, Math.round(planted.requiredSeconds - planted.elapsedSeconds));
  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;

  const cropId = planted.cropId;
  const name = itemDisplayName(cropId);

  const levelBonus = 1 + FIELD_LEVEL_SPEED_BONUS * slot.level;
  const weather = getWeather(ctx.state.weather);
  const weatherBonus = weather.growthSpeedMultiplier;
  const totalMult = levelBonus * weatherBonus;

  const rows = [];
  rows.push({ label: "İlerleme", value: `%${pct}` });
  rows.push({ label: "Kalan süre", value: `${min}dk ${sec}sn` });
  rows.push({ label: "Büyüme hızı", value: `×${totalMult.toFixed(2)}` });

  if (detail) {
    const detailRows = [];
    detailRows.push({ label: "İlerleme", value: `%${pct}` });
    detailRows.push({ label: "Kalan süre", value: `${min}dk ${sec}sn` });
    detailRows.push("---");
    if (slot.level > 0) {
      const slotPct = FIELD_LEVEL_SPEED_BONUS * slot.level;
      detailRows.push({ label: "Slot seviyesi", value: signedPercent(slotPct) });
    }
    if (weatherBonus !== 1) {
      detailRows.push({ label: `Hava (${weather.name})`, value: signedPercent(weatherBonus - 1) });
    }
    detailRows.push("---");
    detailRows.push({ label: "Toplam hız", value: `×${totalMult.toFixed(2)}` });

    return { title: name, rows: detailRows };
  }

  return { title: name, rows };
}

/* ─────────────────── Hasada hazır slot ─────────────────── */
function buildReadySlot(ds, detail) {
  const ctx = getContext();
  const kind = ds.ttKind || "field";
  const index = Number(ds.ttIndex);
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const slot = slots[index];
  if (!slot || !slot.planted) return null;

  const cropId = slot.planted.cropId;
  const name = itemDisplayName(cropId);

  const rows = [];
  rows.push({ label: "Durum", value: "Hasada hazır" });

  if (detail) {
    const weather = getWeather(ctx.state.weather);
    const rc = weather.rarityChance || {};
    if (rc.nadir || rc.legendary || rc.gizemli) {
      rows.push("---");
      if (rc.nadir) rows.push({ label: "Nadir şans", value: `%${Math.round(rc.nadir * 100)}` });
      if (rc.legendary) rows.push({ label: "Efsanevi şans", value: `%${Math.round(rc.legendary * 100)}` });
      if (rc.gizemli) rows.push({ label: "Gizemli şans", value: `%${Math.round(rc.gizemli * 100)}` });
    }
  }

  return { title: name, rows };
}

/* ─────────────────── Slot seviye yükseltme butonu ─────────────────── */
function buildSlotUpgrade(ds, detail) {
  const ctx = getContext();
  const kind = ds.ttKind || "field";
  const index = Number(ds.ttIndex);
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const slot = slots[index];
  if (!slot) return null;

  const lvlMaxed = slot.level >= MAX_FIELD_LEVEL;
  const cost = kind === "field" ? fieldUpgradeCost(slot.level) : orchardUpgradeCost(slot.level);
  const currentPct = FIELD_LEVEL_SPEED_BONUS * slot.level;
  const nextPct = FIELD_LEVEL_SPEED_BONUS * (slot.level + 1);
  const playerGold = Math.floor(ctx.state.player.gold);
  const poor = playerGold < cost && !lvlMaxed;

  const rows = [];
  rows.push({ label: "Seviye", value: `${slot.level} / ${MAX_FIELD_LEVEL}` });

  if (lvlMaxed) {
    rows.push({ label: "Hız", value: signedPercent(currentPct) });
    rows.push("---");
    rows.push({ label: "Durum", value: "Maksimum seviye" });
  } else {
    rows.push({ label: "Hız", value: `<span class="tt-positive">%${Math.round(currentPct * 100)}</span> → <span class="tt-positive">%${Math.round(nextPct * 100)}</span>` });
    rows.push("---");
    rows.push({ label: "Maliyet", value: `${cost} 🪙` });
    if (poor) {
      rows.push({ label: "", value: `<span class="tt-negative">Yetersiz altın</span>` });
    }
  }

  return { title: "Hız Geliştirme", rows };
}

/* ─────────────────── Yetenek ağacı düğümü ─────────────────── */
function buildUpgradeNode(ds, detail) {
  const ctx = getContext();
  const action = ds.ttAction || "";
  const title = ds.ttTitle || "Geliştirme";
  const hint = ds.ttHint || "";
  const cost = ds.ttCost ? Number(ds.ttCost) : undefined;
  const current = ds.ttCurrent ? Number(ds.ttCurrent) : 0;
  const max = ds.ttMax ? Number(ds.ttMax) : 0;
  const maxed = ds.ttMaxed === "true";
  const locked = ds.ttLocked === "true";
  const lockedBy = ds.ttLockedBy || "";
  const buildingType = ds.building || "";

  const rows = [];
  if (hint) rows.push({ label: "Bilgi", value: hint });

  if (maxed) {
    rows.push({ label: "Durum", value: "Maksimum seviye" });
  } else if (locked) {
    rows.push({ label: "Kilitli", value: `<span class="tt-negative">${lockedBy} gerekli</span>` });
  } else if (cost !== undefined) {
    rows.push({ label: "Maliyet", value: `${cost} 🪙` });
    rows.push({ label: "Mevcut", value: `${current} / ${max}` });
  }

  if (buildingType && detail) {
    const def = BUILDING_TYPES[buildingType];
    const building = ctx.state.buildings[buildingType];
    if (def && building) {
      const curCap = capacityForLevel(buildingType, building.level);
      const nextCap = capacityForLevel(buildingType, building.level + 1);
      if (building.level < 5) {
        rows.push({ label: "Yeni kapasite", value: `<span class="tt-positive">${curCap} → ${nextCap}</span>` });
      }
    }
  }

  return { title, rows };
}

/* ─────────────────── Özellik satın alma ─────────────────── */
function buildFeatureNode(ds, detail) {
  const ctx = getContext();
  const featureId = ds.ttFeature || "";
  const name = FEATURE_NAMES[featureId] || featureId;
  const desc = FEATURE_DESCRIPTIONS[featureId] || "";
  const cost = FEATURE_COSTS[featureId];
  const owned = ctx.state.features && ctx.state.features[featureId];

  const rows = [];
  if (desc) rows.push({ label: "Bilgi", value: desc });

  if (owned) {
    rows.push({ label: "Durum", value: `<span class="tt-positive">Satın alındı</span>` });
  } else if (cost !== undefined) {
    rows.push({ label: "Maliyet", value: `${cost} 🪙` });
  }

  return { title: name, rows };
}

/* ─────────────────── Takvim bilgi ─────────────────── */
function buildCalendarInfo(ds, detail) {
  const ctx = getContext();
  const info = getCalendarTradeInfo(ctx.state);
  if (!info.active) return null;

  const seasonEm = seasonEmoji(info.season);
  const rows = [];
  rows.push({ label: "Mevsim", value: `${info.seasonName} ${seasonEm}` });
  rows.push({ label: "Hava", value: info.weather });

  if (info.seasonEffect) {
    rows.push({ label: "Etki", value: info.seasonEffect });
  }

  if (detail) {
    const season = info.season;
    const seasonEm = seasonEmoji(info.season);

    const detailRows = [];
    detailRows.push({ label: "Mevsim", value: `${info.seasonName} ${seasonEm}` });
    detailRows.push({ label: "Hava", value: info.weather });
    detailRows.push("---");

    const sellPct = (SEASON_SELL_MULTIPLIER[season] || 1) - 1;
    if (sellPct !== 0) detailRows.push({ label: "Mevsim satış etkisi", value: signedPercent(sellPct) });

    const buySeedPct = (SEASON_BUY_MULTIPLIER[season] || 1) - 1;
    if (buySeedPct !== 0) detailRows.push({ label: "Mevsim alış (tohum)", value: signedPercent(buySeedPct) });

    const buySaplingPct = (SEASON_SAPLING_MULTIPLIER[season] || 1) - 1;
    if (buySaplingPct !== 0) detailRows.push({ label: "Mevsim alış (fidan)", value: signedPercent(buySaplingPct) });

    const weather = getWeather(ctx.state.weather);
    const weatherMult = WEATHER_BUY_MULTIPLIER[weather.id] || 1.0;
    if (weatherMult !== 1.0) {
      detailRows.push({ label: "Hava alış etkisi", value: signedPercent(weatherMult - 1) });
    }

    if (weather.id === "gokkusagi") {
      detailRows.push({ label: "Hava nadir-satış bonusu", value: signedPercent(-0.20) });
    }

    if (detailRows.length > 0) {
      return { title: "Takvim Ticaret", rows: detailRows };
    }
  }

  return { title: "Takvim Ticaret", rows };
}

/* ─────────────────── Üretim tarifi ─────────────────── */
function buildCraftRecipe(ds, detail) {
  const ctx = getContext();
  const recipeId = ds.ttRecipe;
  if (!recipeId) return null;

  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return null;

  const rows = [];

  const inputLines = recipe.inputs.map((inp) => {
    const entry = ctx.state.inventory.items[inp.id];
    const have = entry ? entry.quantity : 0;
    const enough = have >= inp.qty;
    const cls = enough ? "tt-positive" : "tt-negative";
    return `<span class="${cls}">${itemDisplayName(inp.id)} ${have}/${inp.qty}</span>`;
  });

  rows.push({ label: "Girdiler", value: inputLines.join(", ") });

  const outputPrice = itemSellPrice(recipe.output.id, {});
  rows.push({ label: "Çıktı fiyat", value: `${outputPrice} 🪙` });

  let maxQty = 0;
  while (canCraft(ctx.state, recipe.id, maxQty + 1)) maxQty++;
  rows.push({ label: "Üretilebilir", value: `${maxQty}x` });

  return { title: recipe.name, rows };
}

/* ─────────────────── Hızlı satış bölgesi ─────────────────── */
function buildQuickSellZone(ds, detail) {
  const ctx = getContext();
  const mode = quickSellMode;

  const rows = [];
  if (mode === "single") {
    rows.push({ label: "Mod", value: "Tekli satış" });
    rows.push({ label: "Bilgi", value: "Sürüklenen üründen 1 adet satar" });
  } else {
    rows.push({ label: "Mod", value: "Toplu satış" });
    rows.push({ label: "Bilgi", value: "Sürüklenen ürünün tamamını satar" });
  }

  const weather = getWeather(ctx.state.weather);
  if (weather.tradeLossChance > 0) {
    rows.push({ label: "Risk", value: `<span class="tt-negative">%${Math.round(weather.tradeLossChance * 100)} ihtimalle ürün kaybolur</span>` });
  }

  return { title: "Hızlı Satış", rows };
}

/* ─────────────────── Bina kapasitesi ─────────────────── */
function buildBuildingCapacity(ds, detail) {
  const ctx = getContext();
  const buildingType = ds.ttBuilding;
  if (!buildingType) return null;

  const def = BUILDING_TYPES[buildingType];
  const building = ctx.state.buildings[buildingType];
  if (!def || !building) return null;

  const capacity = capacityForLevel(buildingType, building.level);
  const rows = [];
  rows.push({ label: "Kapasite", value: `${building.population}/${capacity}` });

  if (building.population >= capacity) {
    rows.push({ label: "", value: `<span class="tt-negative">Kapasite dolu</span>` });
  }

  if (building.population > 0) {
    rows.push({ label: "Üretim", value: `${def.baseProductionDays} günde ${building.population} ${itemDisplayName(def.productId)}` });
  }

  return { title: def.name, rows };
}

/* ─────────────────── Envanter filtresi ─────────────────── */
function buildInventoryFilter(ds, detail) {
  const filterName = ds.ttFilter || "tümü";
  return {
    title: "Filtre",
    rows: [{ label: "Aktif", value: filterName.charAt(0).toUpperCase() + filterName.slice(1) }],
  };
}

/* ─────────────────── Envanter sıralama ─────────────────── */
function buildInventorySort(ds, detail) {
  const sortMode = ds.ttSort || "isim";
  const label = sortMode === "deger" ? "Değere göre sırala" : "İsme göre sırala";
  return {
    title: "Sıralama",
    rows: [{ label: "Aktif", value: label }],
  };
}
