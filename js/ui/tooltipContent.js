/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Tooltip içerik üreticileri — TT Pro v1.0                */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/tooltipContent.js
// Her tooltip tipi için { title, badge, badgeClass, groups, footer } üretir.

import { getContext } from "./shared.js";
import { resolveItem, itemDisplayName, itemSellPrice, itemEmoji } from "../data/items.js";
import { baseItemIdOf } from "../state.js";
import { getCrop } from "../data/crops.js";
import { getTree } from "../data/trees.js";
import { getCalendarSellMultiplier, getCalendarBuyMultiplier, getCalendarTradeInfo, SEASON_SELL_MULTIPLIER, SEASON_BUY_MULTIPLIER, SEASON_SAPLING_MULTIPLIER, WEATHER_BUY_MULTIPLIER } from "../systems/calendarTrade.js";
import { getWeather, RARITY_SELL_MULTIPLIER } from "../systems/weather.js";
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

/* ─────────────────── Yardımcı fonksiyonlar ─────────────────── */

function signedPercent(value) {
  const pct = Math.round(value * 100);
  if (pct === 0) return `<span class="tt-neutral">%0</span>`;
  const cls = pct > 0 ? "tt-positive" : "tt-negative";
  return `<span class="${cls}">%${Math.abs(pct)}</span>`;
}

function seasonName(s) {
  return { ilkbahar: "İlkbahar", yaz: "Yaz", sonbahar: "Sonbahar", kış: "Kış" }[s] || s;
}

function growTypeText(cropId) {
  const crop = getCrop(cropId);
  const tree = getTree(cropId);
  if (crop) return crop.harvestCycle === "recurring" ? `Tekrarlı (${crop.recurringIntervalDays}g aralık)` : "Tek hasat";
  if (tree) return `Tekrarlı (${tree.recurringIntervalDays || tree.growthDays}g aralık)`;
  return "";
}

/* ─────────────────── Tooltip içeriğini çöz ─────────────────── */
export function resolveTooltipContent(dataset) {
  const type = dataset.tt;
  if (!type) return null;

  switch (type) {
    case "product": return buildProduct(dataset);
    case "marketBuy": return buildMarketBuy(dataset);
    case "marketInfo": return buildMarketInfo(dataset);
    case "soldOut": return buildSoldOut(dataset);
    case "bulkDiscount": return buildBulkDiscount(dataset);
    case "emptySlot": return buildEmptySlot(dataset);
    case "lockedSlot": return buildLockedSlot(dataset);
    case "growingSlot": return buildGrowingSlot(dataset);
    case "readySlot": return buildReadySlot(dataset);
    case "slotUpgrade": return buildSlotUpgrade(dataset);
    case "upgradeNode": return buildUpgradeNode(dataset);
    case "featureNode": return buildFeatureNode(dataset);
    case "calendarInfo": return buildCalendarInfo(dataset);
    case "craftRecipe": return buildCraftRecipe(dataset);
    case "quickSellZone": return buildQuickSellZone(dataset);
    case "buildingCapacity": return buildBuildingCapacity(dataset);
    case "inventoryFilter": return buildInventoryFilter(dataset);
    case "inventorySort": return buildInventorySort(dataset);
    default: return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    1. ÜRÜN (envanter, tarla, bina)                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildProduct(ds) {
  const ctx = getContext();
  const itemId = ds.ttItem;
  if (!itemId) return null;

  const baseId = baseItemIdOf(itemId);
  const resolved = resolveItem(baseId);
  const entry = ctx.state.inventory.items[itemId] || ctx.state.inventory.items[baseId];
  const meta = entry && entry.meta ? entry.meta : {};
  const rarity = meta.rarity || "normal";

  const baseSellPrice = resolved.sellPrice;
  const effectivePrice = meta.sellPriceOverride || baseSellPrice;
  const calendarMult = getCalendarSellMultiplier(ctx.state, rarity);
  const finalPrice = Math.round(effectivePrice * calendarMult);

  const rarityLabel = { nadir: "Nadir", legendary: "Efsanevi", gizemli: "Gizemli" };
  const rarityClass = { nadir: "tt-badge-nadir", legendary: "tt-badge-legendary", gizemli: "tt-badge-gizemli" };

  const icon = itemEmoji(itemId);
  const title = resolved.name;
  const badge = rarity !== "normal" && rarityLabel[rarity] ? rarityLabel[rarity] : null;
  const badgeClass = rarity !== "normal" ? (rarityClass[rarity] || "") : "";

  const groups = [];
  const calendarActive = ctx.state.features && ctx.state.features.calendar;
  const isSeedLike = itemId.endsWith("_tohum") || itemId.endsWith("_fidan");
  const isKaliteli = (entry && entry.category === "kaliteli") || false;

  const ANIMAL_PRODUCTS = new Set(["bal", "yumurta", "sut", "tavuk_eti", "inek_eti"]);

  // GROUP 1 — Dönüşüm (tohum/fidan → ürün)
  if (isSeedLike) {
    const cropId = baseId.replace(/_tohum$/, "").replace(/_fidan$/, "");
    groups.push({
      rows: [{ label: "Dönüşüm", value: `${itemEmoji(cropId)} ${itemDisplayName(cropId)}` }],
    });
  }

  // GROUP 1 — Kullanıldığı (ürün tariflerde kullanılıyorsa)
  if (!isSeedLike) {
    const usedIn = RECIPES.filter((r) => r.inputs.some((inp) => inp.id === baseId));
    if (usedIn.length > 0) {
      const usedRows = [{ label: "Kullanıldığı", value: "" }];
      for (const r of usedIn) {
        usedRows.push({ label: "", value: `${itemEmoji(r.output.id)} ${r.name}` });
      }
      groups.push({ rows: usedRows });
    }
  }

  // GROUP 2 — Tohum/Fidan bilgisi
  if (isSeedLike) {
    const cropId = baseId;
    const crop = getCrop(cropId);
    const tree = getTree(cropId);
    const plant = crop || tree;
    if (plant) {
      const tohumRows = [];
      const seasons = plant.seasons.map((s) => `${seasonEmoji(s)}${seasonName(s)}`).join(" ");
      tohumRows.push({ label: "Sezon", value: seasons });
      tohumRows.push({ label: "Büyüme", value: `${plant.growthDays} gün` });
      tohumRows.push({ label: "Hasat", value: growTypeText(cropId) });
      groups.push({ rows: tohumRows });
    }
  }

  // GROUP 2 — Fiyat zinciri (taban → çarpanlar → kâr/zarar → satış → toplam)
  const priceRows = [];
  priceRows.push({ label: "Taban fiyat", value: `${baseSellPrice} 🪙` });

  if (rarity !== "normal" && meta.sellPriceOverride) {
    const rarityPct = (RARITY_SELL_MULTIPLIER[rarity] || 1) - 1;
    if (rarityPct !== 0) {
      priceRows.push({ label: `Nadirlik bonusu`, value: signedPercent(rarityPct) });
    }
  }
  if (calendarActive) {
    const season = currentSeason(ctx.state.time);
    const seasonOnlyMult = SEASON_SELL_MULTIPLIER[season] || 1;
    const seasonPct = seasonOnlyMult - 1;
    if (seasonPct !== 0) {
      priceRows.push({ label: `Mevsim (${seasonName(season)})`, value: signedPercent(seasonPct) });
    }
    const weather = getWeather(ctx.state.weather);
    if (rarity !== "normal" && weather.id === "gokkusagi") {
      priceRows.push({ label: `Hava (${weather.name})`, value: signedPercent(-0.20) });
    }
  }

  const diff = finalPrice - baseSellPrice;
  if (diff > 0) {
    priceRows.push({ label: "Kâr", value: `<span class="tt-positive">+${diff} 🪙</span>` });
  } else if (diff < 0) {
    priceRows.push({ label: "Zarar", value: `<span class="tt-negative">-${Math.abs(diff)} 🪙</span>` });
  }
  priceRows.push({ label: "Satış fiyatı", value: `${finalPrice} 🪙` });
  if (entry && entry.quantity > 1) {
    const totalValue = Math.round(effectivePrice * entry.quantity * calendarMult);
    priceRows.push({ label: `Toplam (${entry.quantity}x)`, value: `${totalValue} 🪙` });
  }
  groups.push({ rows: priceRows });

  // FOOTER
  let footer = null;
  if (isSeedLike) {
    footer = "Sürükle ve ek";
  } else if (isKaliteli) {
    footer = "4x fiyatına satılır";
  }

  return { icon, title, badge, badgeClass, groups, footer };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    2. MARKET ALIM BUTONU                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildMarketBuy(ds) {
  const ctx = getContext();
  const index = Number(ds.ttIndex);
  const mode = ds.ttMode || "single";
  const listing = ctx.state.market.listings[index];
  if (!listing) return null;

  const isAnimal = listing.category === "animal";
  const name = isAnimal ? listing.label : itemDisplayName(listing.seedId);
  const icon = ds.ttIcon || (isAnimal ? "🐄" : itemEmoji(listing.seedId));
  const unitPrice = listing.pricePerUnit;
  const basePrice = listing.basePrice;
  const discountPct = getBulkDiscountPercent();
  const calendarActive = ctx.state.features && ctx.state.features.calendar;

  const groups = [];

  // GROUP 1 — Dönüşüm (tohum/fidan → ürün)
  if (listing.category === "seed" || listing.category === "sapling") {
    groups.push({
      rows: [{ label: "Dönüşüm", value: `${itemEmoji(listing.itemId)} ${itemDisplayName(listing.itemId)}` }],
    });
  }

  // GROUP 2 — Fiyat zinciri (taban → çarpanlar → kâr/zarar → alım → toplu)
  const priceRows = [];
  if (calendarActive && basePrice > 0) {
    priceRows.push({ label: "Taban fiyat", value: `${basePrice} 🪙` });

    const category = listing.category === "sapling" ? "sapling" : "seed";
    const calendarMult = getCalendarBuyMultiplier(ctx.state, category);
    const rollResult = calendarMult !== 0 ? listing.priceMultiplier / calendarMult : listing.priceMultiplier;
    const rollDiff = rollResult - 1;
    if (rollDiff !== 0) {
      priceRows.push({ label: "Piyasa", value: signedPercent(rollDiff) });
    }
    if (!isAnimal) {
      const season = currentSeason(ctx.state.time);
      const seasonTable = category === "sapling" ? SEASON_SAPLING_MULTIPLIER : SEASON_BUY_MULTIPLIER;
      const seasonOnlyMult = seasonTable[season] || 1.0;
      if (seasonOnlyMult !== 1.0) {
        priceRows.push({ label: `Mevsim (${seasonName(season)})`, value: signedPercent(seasonOnlyMult - 1) });
      }
      const weather = getWeather(ctx.state.weather);
      const weatherMult = WEATHER_BUY_MULTIPLIER[weather.id] || 1.0;
      if (weatherMult !== 1.0) {
        priceRows.push({ label: `Hava (${weather.name})`, value: signedPercent(weatherMult - 1) });
      }
    }

    const diff = unitPrice - basePrice;
    if (diff > 0) {
      priceRows.push({ label: "Zarar", value: `<span class="tt-negative">-${diff} 🪙</span>` });
    } else if (diff < 0) {
      priceRows.push({ label: "Kâr", value: `<span class="tt-positive">+${Math.abs(diff)} 🪙</span>` });
    }
  }

  if (mode === "single") {
    priceRows.push({ label: "Alım fiyatı", value: `${unitPrice} 🪙` });
  } else {
    const bulkCost = Math.round(unitPrice * listing.remaining * (1 - discountPct / 100));
    priceRows.push({ label: "Alım fiyatı", value: `${unitPrice} 🪙` });
    priceRows.push({ label: `${listing.remaining} adet`, value: `${bulkCost} 🪙` });
    priceRows.push({ label: "Toplu indirim", value: `<span class="tt-positive">%${discountPct}</span>` });
  }
  groups.push({ rows: priceRows });

  return { icon, title: name, badge: null, badgeClass: "", groups, footer: null };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    3. MARKET ÜRÜN BİLGİSİ (satır)                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildMarketInfo(ds) {
  const ctx = getContext();
  const index = Number(ds.ttIndex);
  const listing = ctx.state.market.listings[index];
  if (!listing) return null;

  const isAnimal = listing.category === "animal";
  const name = isAnimal ? listing.label : itemDisplayName(listing.seedId);
  const icon = ds.ttIcon || (isAnimal ? "🐄" : itemEmoji(listing.seedId));
  const calendarActive = ctx.state.features && ctx.state.features.calendar;

  const groups = [];

  // GROUP 1 — Dönüşüm (tohum/fidan → ürün)
  if (listing.category === "seed" || listing.category === "sapling") {
    groups.push({
      rows: [{ label: "Dönüşüm", value: `${itemEmoji(listing.itemId)} ${itemDisplayName(listing.itemId)}` }],
    });
  }

  // GROUP 2 — Ürün Detayı
  const detayRows = [];
  if (!isAnimal) {
    const cropOrTree = listing.category === "seed" ? getCrop(listing.itemId) : getTree(listing.itemId);
    if (cropOrTree) {
      detayRows.push({ label: "Tier", value: `${cropOrTree.tier}` });
      detayRows.push({ label: "Büyüme", value: `${cropOrTree.growthDays} gün` });
      detayRows.push({ label: "Satış", value: `${cropOrTree.sellPrice} 🪙` });
      detayRows.push({ label: "Hasat", value: growTypeText(listing.itemId) });
    }
  } else {
    const def = BUILDING_TYPES[listing.buildingType];
    if (def) {
      detayRows.push({ label: "Bina", value: def.name });
      detayRows.push({ label: "Üretim", value: `${def.baseProductionDays} günde 1 ${itemDisplayName(def.productId)}` });
      if (def.secondaryProductId) {
        detayRows.push({ label: "Nadiren", value: `${itemEmoji(def.secondaryProductId)} ${itemDisplayName(def.secondaryProductId)}` });
      }
    }
  }
  groups.push({ rows: detayRows });

  // GROUP 2 — Fiyat zinciri (taban → kâr/zarar → birim fiyat → adet satış)
  const priceRows = [];
  if (calendarActive && listing.basePrice > 0) {
    priceRows.push({ label: "Taban fiyat", value: `${listing.basePrice} 🪙` });
    const diff = listing.pricePerUnit - listing.basePrice;
    if (diff > 0) {
      priceRows.push({ label: "Zarar", value: `<span class="tt-negative">-${diff} 🪙</span>` });
    } else if (diff < 0) {
      priceRows.push({ label: "Kâr", value: `<span class="tt-positive">+${Math.abs(diff)} 🪙</span>` });
    }
  }
  priceRows.push({ label: "Birim fiyat", value: `${listing.pricePerUnit} 🪙` });
  if (isAnimal && listing.remaining > 0) {
    const totalSale = listing.pricePerUnit * listing.remaining;
    priceRows.push({ label: `${listing.remaining} adet satış`, value: `${totalSale} 🪙` });
  }
  groups.push({ rows: priceRows });

  return { icon, title: name, badge: null, badgeClass: "", groups, footer: null };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    4. TÜKENMİŞ MARKET SATIRI                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildSoldOut(ds) {
  const ctx = getContext();
  const remaining = Math.max(0, MARKET_REFRESH_SECONDS - Math.round(ctx.state.market.secondsSinceRefresh));

  return {
    icon: ds.ttIcon || "🚫",
    title: "Tükendi",
    badge: null,
    badgeClass: "",
    groups: [
      { rows: [{ label: "Yenilenme", value: `${remaining}s` }] },
    ],
    footer: "Bu döngüde gelmeyecek",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    5. TOPLU İNDİRİM BİLGİSİ                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildBulkDiscount(ds) {
  const discountPct = getBulkDiscountPercent();

  return {
    icon: ds.ttIcon || "💰",
    title: "Toplu Alım",
    badge: null,
    badgeClass: "",
    groups: [
      { rows: [{ label: "İndirim", value: `<span class="tt-positive">%${discountPct}</span>` }] },
    ],
    footer: "Tüm kalan stoğu tek seferde indirimli alırsın.",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    6. BOŞ DİKİLEBİLİR SLOT                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildEmptySlot(ds) {
  const ctx = getContext();
  const kind = ds.ttKind || "field";
  const index = Number(ds.ttIndex);
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const slot = slots[index];
  const kindName = kind === "field" ? "Tarla" : "Bahçe";
  const actionHint = kind === "field" ? "Tohum sürükle" : "Fidan sürükle";

  const rows = [];
  rows.push({ label: "Durum", value: "Boş" });

  if (slot && slot.level > 0) {
    const speedBonus = FIELD_LEVEL_SPEED_BONUS * slot.level;
    rows.push({ label: "Hız bonusu", value: `<span class="tt-positive">%${Math.round(speedBonus * 100)}</span>` });
  }

  return {
    icon: ds.ttIcon || (kind === "field" ? "🌾" : "🌳"),
    title: `${kindName} Slot #${index + 1}`,
    badge: null,
    badgeClass: "",
    groups: [{ rows }],
    footer: actionHint,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    7. KİLİTLİ SLOT                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildLockedSlot(ds) {
  const ctx = getContext();
  const kind = ds.ttKind || "field";
  const index = Number(ds.ttIndex);
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const unlockedCount = slots.filter((s) => s.unlocked).length;
  const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount) : orchardSlotUnlockCost(unlockedCount);

  const groups = [];

  // GROUP 1 — Maliyet
  const maliyetRows = [];
  maliyetRows.push({ label: "Maliyet", value: `${cost} 🪙` });
  const playerGold = Math.floor(ctx.state.player.gold);
  if (playerGold < cost) {
    maliyetRows.push({ label: "", value: `<span class="tt-negative">Yetersiz altın</span>` });
  }
  groups.push({ rows: maliyetRows });

  // GROUP 2 — Formül (takvim açıksa)
  if (ctx.state.features && ctx.state.features.calendar) {
    const base = kind === "field" ? 15 : 20;
    const rate = kind === "field" ? "1.2" : "1.25";
    groups.push({
      rows: [
        { label: "Formül", value: `${base} × ${rate}^n` },
        { label: "Açık slot", value: `${unlockedCount}` },
      ],
    });
  }

  return {
    icon: ds.ttIcon || "🔒",
    title: "Kilitli Slot",
    badge: null,
    badgeClass: "",
    groups,
    footer: "Açmak için tıkla",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    8. BÜYÜMEKTE OLAN BİTKİ                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildGrowingSlot(ds) {
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
  const name = itemDisplayName(planted.cropId);

  const slotBonus = Math.min(FIELD_LEVEL_SPEED_BONUS * slot.level, 0.99);
  const levelBonus = 1 / (1 - slotBonus);
  const weather = getWeather(ctx.state.weather);
  const weatherBonus = weather.growthSpeedMultiplier;
  const totalMult = levelBonus * weatherBonus;

  const groups = [];

  // GROUP 1 — İlerleme
  groups.push({
    rows: [
      { label: "İlerleme", value: `%${pct}` },
      { label: "Kalan süre", value: `${min}dk ${sec}sn` },
    ],
  });

  // GROUP 2 — Hız
  const hizRows = [];
  hizRows.push({ label: "Büyüme hızı", value: `×${totalMult.toFixed(2)}` });
  hizRows.push({ label: "Kalan hasat", value: `${planted.harvestsLeft} / ${planted.maxHarvests}` });
  groups.push({ rows: hizRows });

  // GROUP 3 — Hava Etkisi (sıfır değilse)
  if (weatherBonus !== 1) {
    groups.push({
      rows: [
        { label: `Hava (${weather.name})`, value: signedPercent(weatherBonus - 1) },
      ],
    });
  }

  return { icon: ds.ttIcon || itemEmoji(planted.cropId), title: name, badge: null, badgeClass: "", groups, footer: null };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    9. HASADA HAZIR SLOT                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildReadySlot(ds) {
  const ctx = getContext();
  const kind = ds.ttKind || "field";
  const index = Number(ds.ttIndex);
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const slot = slots[index];
  if (!slot || !slot.planted) return null;

  const name = itemDisplayName(slot.planted.cropId);
  const groups = [];

  // GROUP 1 — Durum
  groups.push({
    rows: [
      { label: "Durum", value: `<span class="tt-positive">Hasat hazır!</span>` },
      { label: "Kalan hasat", value: `${slot.planted.harvestsLeft} / ${slot.planted.maxHarvests}` },
    ],
  });

  // GROUP 2 — Nadirlik Şansları (varsa)
  const weather = getWeather(ctx.state.weather);
  const rc = weather.rarityChance || {};
  const hasRarity = rc.nadir || rc.legendary || rc.gizemli;

  if (hasRarity) {
    const nadirRows = [];
    if (rc.nadir) nadirRows.push({ label: "Nadir şans", value: `<span class="tt-rarity-nadir">%${Math.round(rc.nadir * 100)}</span>` });
    if (rc.legendary) nadirRows.push({ label: "Efsanevi şans", value: `<span class="tt-rarity-legendary">%${Math.round(rc.legendary * 100)}</span>` });
    if (rc.gizemli) nadirRows.push({ label: "Gizemli şans", value: `<span class="tt-rarity-gizemli">%${Math.round(rc.gizemli * 100)}</span>` });
    groups.push({ rows: nadirRows });
  }

  return { icon: ds.ttIcon || itemEmoji(slot.planted.cropId), title: name, badge: null, badgeClass: "", groups, footer: "Tıklayarak hasat et" };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    10. SLOT HIZ GELİŞTİRME                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildSlotUpgrade(ds) {
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

  const groups = [];

  // GROUP 1 — Durum
  const durumRows = [];
  durumRows.push({ label: "Seviye", value: `${slot.level} / ${MAX_FIELD_LEVEL}` });
  if (lvlMaxed) {
    durumRows.push({ label: "Hız", value: `<span class="tt-positive">%${Math.round(currentPct * 100)}</span>` });
  } else {
    durumRows.push({ label: "Hız", value: `<span class="tt-positive">%${Math.round(currentPct * 100)}</span> → <span class="tt-positive">%${Math.round(nextPct * 100)}</span>` });
  }
  groups.push({ rows: durumRows });

  // GROUP 2 — Alım
  if (!lvlMaxed) {
    const alimRows = [];
    alimRows.push({ label: "Maliyet", value: `${cost} 🪙` });
    if (playerGold < cost) {
      alimRows.push({ label: "", value: `<span class="tt-negative">Yetersiz altın</span>` });
    }
    groups.push({ rows: alimRows });
  }

  let footer = null;
  if (lvlMaxed) {
    footer = "Maksimum seviye";
  } else {
    footer = "Büyüme hızını +1 artırır";
  }

  return { icon: ds.ttIcon || "⚡", title: "Hız Geliştirme", badge: null, badgeClass: "", groups, footer };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    11. YETENEK AĞACI DÜĞÜMÜ                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildUpgradeNode(ds) {
  const ctx = getContext();
  const title = ds.ttTitle || "Geliştirme";
  const hint = ds.ttHint || "";
  const cost = ds.ttCost ? Number(ds.ttCost) : undefined;
  const current = ds.ttCurrent ? Number(ds.ttCurrent) : 0;
  const max = ds.ttMax ? Number(ds.ttMax) : 0;
  const maxed = ds.ttMaxed === "true";
  const locked = ds.ttLocked === "true";
  const lockedBy = ds.ttLockedBy || "";
  const buildingType = ds.building || "";

  const playerGold = Math.floor(ctx.state.player.gold);
  const groups = [];

  // GROUP 1 — Bilgi
  const hints = Array.isArray(hint) ? hint : hint ? [hint] : [];
  if (hints.length > 0) {
    groups.push({ rows: hints.map((line) => ({ label: "", value: line })) });
  }

  // GROUP 2 — Durum
  const durumRows = [];
  if (maxed) {
    durumRows.push({ label: "Durum", value: `<span class="tt-positive">Maksimum</span>` });
  } else if (locked) {
    durumRows.push({ label: "Kilitli", value: `<span class="tt-negative">${lockedBy} gerekli</span>` });
  } else if (cost !== undefined) {
    durumRows.push({ label: "Mevcut", value: `${current} / ${max}` });
    durumRows.push({ label: "Maliyet", value: `${cost} 🪙` });
    if (playerGold < cost) {
      durumRows.push({ label: "", value: `<span class="tt-negative">Yetersiz altın</span>` });
    }
  }
  if (durumRows.length > 0) {
    groups.push({ rows: durumRows });
  }

  // GROUP 3 — Bina detayı (buildingType varsa)
  if (buildingType) {
    const def = BUILDING_TYPES[buildingType];
    const building = ctx.state.buildings[buildingType];
    if (def && building && building.level < MAX_FIELD_LEVEL) {
      const curCap = capacityForLevel(buildingType, building.level);
      const nextCap = capacityForLevel(buildingType, building.level + 1);
      groups.push({
        rows: [{ label: "Kapasite", value: `<span class="tt-positive">${curCap} → ${nextCap}</span>` }],
      });
    }
  }

  return { icon: ds.ttIcon || "🔧", title, badge: null, badgeClass: "", groups, footer: null };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    12. ÖZELLİK SATIN ALMA                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildFeatureNode(ds) {
  const ctx = getContext();
  const featureId = ds.ttFeature || "";
  const name = FEATURE_NAMES[featureId] || featureId;
  const desc = FEATURE_DESCRIPTIONS[featureId] || "";
  const cost = FEATURE_COSTS[featureId];
  const owned = ctx.state.features && ctx.state.features[featureId];
  const playerGold = Math.floor(ctx.state.player.gold);

  const groups = [];

  // GROUP 1 — Bilgi
  const descs = Array.isArray(desc) ? desc : desc ? [desc] : [];
  if (descs.length > 0) {
    groups.push({ rows: descs.map((line) => ({ label: "", value: line })) });
  }

  // GROUP 2 — Durum
  const durumRows = [];
  if (owned) {
    durumRows.push({ label: "Durum", value: `<span class="tt-positive">Satın alındı</span>` });
  } else if (cost !== undefined) {
    durumRows.push({ label: "Maliyet", value: `${cost} 🪙` });
    if (playerGold < cost) {
      durumRows.push({ label: "", value: `<span class="tt-negative">Yetersiz altın</span>` });
    }
  }
  if (durumRows.length > 0) {
    groups.push({ rows: durumRows });
  }

  return {
    icon: ds.ttIcon || FEATURE_EMOJIS[featureId] || "🔓",
    title: name,
    badge: null,
    badgeClass: "",
    groups,
    footer: owned ? null : "Satın almak için tıkla",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    13. TAKVİM TİCARET BİLGİSİ                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildCalendarInfo(ds) {
  const ctx = getContext();
  const info = getCalendarTradeInfo(ctx.state);
  if (!info.active) return null;

  const seasonEm = seasonEmoji(info.season);
  const season = info.season;
  const groups = [];

  // GROUP 1 — Genel Durum
  groups.push({
    rows: [
      { label: "Mevsim", value: `${info.seasonName} ${seasonEm}` },
      { label: "Hava", value: info.weather },
      { label: "Etki", value: info.seasonEffect },
    ],
  });

  // GROUP 2 — Çarpanlar
  const carpanRows = [];
  const weather = getWeather(ctx.state.weather);
  const speedPct = Math.round((weather.growthSpeedMultiplier - 1) * 100);
  if (speedPct !== 0) {
    carpanRows.push({ label: "Büyüme hızı", value: signedPercent(weather.growthSpeedMultiplier - 1) });
  }
  if (weather.tradeLossChance > 0) {
    carpanRows.push({ label: "Ticaret riski", value: `<span class="tt-negative">%${Math.round(weather.tradeLossChance * 100)}</span>` });
  }
  if (carpanRows.length > 0) {
    groups.push({ rows: carpanRows });
  }

  // GROUP 3 — Satış/Alış
  const satisRows = [];
  const sellPct = (SEASON_SELL_MULTIPLIER[season] || 1) - 1;
  if (sellPct !== 0) satisRows.push({ label: "Satış etkisi", value: signedPercent(sellPct) });

  const buySeedPct = (SEASON_BUY_MULTIPLIER[season] || 1) - 1;
  if (buySeedPct !== 0) satisRows.push({ label: "Alış (tohum)", value: signedPercent(buySeedPct) });

  const buySaplingPct = (SEASON_SAPLING_MULTIPLIER[season] || 1) - 1;
  if (buySaplingPct !== 0) satisRows.push({ label: "Alış (fidan)", value: signedPercent(buySaplingPct) });

  const weatherMult = WEATHER_BUY_MULTIPLIER[weather.id] || 1.0;
  if (weatherMult !== 1.0) {
    satisRows.push({ label: `Hava alış`, value: signedPercent(weatherMult - 1) });
  }

  if (satisRows.length > 0) {
    groups.push({ rows: satisRows });
  }

  return { icon: ds.ttIcon || "📅", title: "Takvim", badge: null, badgeClass: "", groups, footer: null };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    14. ÜRETİM TARİFİ                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildCraftRecipe(ds) {
  const ctx = getContext();
  const recipeId = ds.ttRecipe;
  if (!recipeId) return null;

  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return null;

  const groups = [];

  // GROUP 1 — Girdiler
  const girdiRows = recipe.inputs.map((inp) => {
    const entry = ctx.state.inventory.items[inp.id] || (() => {
      for (const [k, v] of Object.entries(ctx.state.inventory.items)) {
        if (baseItemIdOf(k) === inp.id) return v;
      }
      return null;
    })();
    const have = entry ? entry.quantity : 0;
    const enough = have >= inp.qty;
    const cls = enough ? "tt-positive" : "tt-negative";
    return { label: `${itemEmoji(inp.id)} ${itemDisplayName(inp.id)}`, value: `<span class="${cls}">${have}/${inp.qty}</span>` };
  });
  groups.push({ rows: girdiRows });

  // GROUP 2 — Fiyat zinciri (taban maliyet → kâr/zarar → çıktı fiyat → üretilebilir)
  const outputPrice = itemSellPrice(recipe.output.id, {});
  const inputCost = recipe.inputs.reduce((sum, inp) => sum + itemSellPrice(inp.id, {}) * inp.qty, 0);
  const profit = outputPrice - inputCost;

  let maxQty = 0;
  while (canCraft(ctx.state, recipe.id, maxQty + 1)) maxQty++;

  const priceRows = [];
  priceRows.push({ label: "Taban maliyet", value: `${inputCost} 🪙` });
  if (profit > 0) {
    priceRows.push({ label: "Kâr", value: `<span class="tt-positive">+${profit} 🪙</span>` });
  } else if (profit < 0) {
    priceRows.push({ label: "Zarar", value: `<span class="tt-negative">${profit} 🪙</span>` });
  }
  priceRows.push({ label: "Çıktı fiyat", value: `${outputPrice} 🪙` });
  priceRows.push({ label: "Üretilebilir", value: `${maxQty}x` });
  groups.push({ rows: priceRows });

  // GROUP 3 — Bağlantılar
  const baglantiRows = [];
  const chainInputs = recipe.inputs.filter((inp) => RECIPES.some((x) => x.output.id === inp.id));
  if (chainInputs.length > 0) {
    const chainText = chainInputs.map((inp) => {
      const src = RECIPES.find((x) => x.output.id === inp.id);
      return src ? `${itemEmoji(src.output.id)} ${src.name}` : inp.id;
    }).join(", ");
    baglantiRows.push({ label: "Zincir", value: `<span style="color:#4890d0">${chainText}</span>` });
  }

  const usedIn = RECIPES.filter((other) => other.inputs.some((inp) => inp.id === recipe.output.id));
  if (usedIn.length > 0) {
    const usedInText = usedIn.map((other) => `${itemEmoji(other.output.id)} ${other.name}`).join(", ");
    baglantiRows.push({ label: "Kullanıldığı", value: usedInText });
  } else {
    baglantiRows.push({ label: "Kullanıldığı", value: "Doğrudan satış" });
  }

  if (baglantiRows.length > 0) {
    groups.push({ rows: baglantiRows });
  }

  return {
    icon: ds.ttIcon || itemEmoji(recipe.output.id),
    title: recipe.name,
    badge: null,
    badgeClass: "",
    groups,
    footer: recipe.learned ? "Öğrenildi — toplu üretim açık" : "İlk üretimde öğrenilir",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    15. HIZLI SATIŞ BÖLGESİ                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildQuickSellZone(ds) {
  const mode = quickSellMode;
  const weather = getWeather(getContext().state.weather);

  const groups = [];

  // GROUP 1 — Mod
  const modRows = [];
  if (mode === "single") {
    modRows.push({ label: "Mod", value: "Tekli satış" });
    modRows.push({ label: "", value: "Sürüklenen üründen 1 adet satar" });
  } else {
    modRows.push({ label: "Mod", value: "Toplu satış" });
    modRows.push({ label: "", value: "Sürüklenen ürünün tamamını satar" });
  }
  groups.push({ rows: modRows });

  // GROUP 2 — Risk (sıfır değilse)
  if (weather.tradeLossChance > 0) {
    groups.push({
      rows: [
        { label: "Risk", value: `<span class="tt-negative">%${Math.round(weather.tradeLossChance * 100)} ile ürün kaybolur</span>` },
      ],
    });
  }

  return { icon: ds.ttIcon || "💸", title: "Hızlı Satış", badge: null, badgeClass: "", groups, footer: null };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    16. BİNA KAPASİTESİ                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildBuildingCapacity(ds) {
  const ctx = getContext();
  const buildingType = ds.ttBuilding;
  if (!buildingType) return null;

  const def = BUILDING_TYPES[buildingType];
  const building = ctx.state.buildings[buildingType];
  if (!def || !building) return null;

  const capacity = capacityForLevel(buildingType, building.level);
  const groups = [];

  // GROUP 1 — Popülasyon
  const popRows = [];
  popRows.push({ label: "Popülasyon", value: `${building.population} / ${capacity}` });
  if (building.population >= capacity) {
    popRows.push({ label: "", value: `<span class="tt-negative">Kapasite dolu</span>` });
  }
  groups.push({ rows: popRows });

  // GROUP 2 — Üretim
  if (building.population > 0) {
    const uretimRows = [];
    uretimRows.push({ label: "Üretim", value: `${def.baseProductionDays} günde ${building.population} ${itemDisplayName(def.productId)}` });
    if (def.secondaryProductId) {
      uretimRows.push({ label: "Nadiren", value: `${itemEmoji(def.secondaryProductId)} ${itemDisplayName(def.secondaryProductId)}` });
    }
    groups.push({ rows: uretimRows });
  }

  // GROUP 3 — Bonuslar
  if (def.fieldBonusCropIds && def.fieldBonusCropIds.length > 0) {
    const bonusList = def.fieldBonusCropIds.map((id) => `${itemEmoji(id)}${itemDisplayName(id)}`).join(", ");
    groups.push({
      rows: [{ label: "Tarla bonusu", value: bonusList }],
    });
  }

  return { icon: ds.ttIcon || "🏠", title: def.name, badge: null, badgeClass: "", groups, footer: null };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    17. ENVANTER FİLTRESİ                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildInventoryFilter(ds) {
  const filterName = ds.ttFilter || "tümü";

  return {
    icon: ds.ttIcon || "🔍",
    title: "Filtre",
    badge: null,
    badgeClass: "",
    groups: [
      { rows: [{ label: "Aktif", value: filterName.charAt(0).toUpperCase() + filterName.slice(1) }] },
    ],
    footer: "Kategori filtresi",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    18. ENVANTER SIRALAMA                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildInventorySort(ds) {
  const sortMode = ds.ttSort || "isim";
  const isValue = sortMode === "deger";

  return {
    icon: ds.ttIcon || "↕️",
    title: "Sıralama",
    badge: null,
    badgeClass: "",
    groups: [
      { rows: [{ label: "Mod", value: isValue ? "Değere göre" : "İsme göre" }] },
    ],
    footer: "Karaktere tıklayarak değiştir",
  };
}
