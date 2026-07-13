// js/ui.js
// DOM render + olay (event) yönetimi. Tüm sistem fonksiyonlarını çağırıp
// state'i değiştirir, ardından render(state) ile ekranı günceller.

import { CROPS, getCrop } from "./data/crops.js";
import { TREES, getTree } from "./data/trees.js";
import { RECIPES } from "./data/recipes.js";
import { BUILDING_TYPES, capacityForLevel, MAX_BUILDING_LEVEL } from "./data/animals.js";
import { itemDisplayName, itemSellPrice, itemEmoji } from "./data/items.js";
import { formatTime, currentSeason } from "./systems/time.js";
import { getWeather } from "./systems/weather.js";
import { getInventoryList, FILTERS } from "./systems/inventory.js";
import { plantSeed, harvestSlot, fieldUpgradeCost, unlockSlot } from "./systems/field.js";
import { plantTree, harvestOrchardSlot, orchardUpgradeCost } from "./systems/orchard.js";
import { buildingUpgradeCost } from "./systems/buildings.js";
import { buyOneSeed, buyAllSeeds, sellItem, getBulkDiscountPercent } from "./systems/market.js";
import { craftRecipe, canCraft } from "./systems/crafting.js";
import { ensureQuestPool, claimQuest, registerProgress } from "./systems/quests.js";
import {
  upgradeFieldSlot,
  upgradeFieldSeedSave,
  upgradeOrchardSlot,
  upgradeOrchardSeedSave,
  fieldSlotUnlockCost,
  orchardSlotUnlockCost,
  seedSaveUpgradeCost,
  upgradeInventorySlots,
  upgradeFieldSlots,
  upgradeOrchardSlots,
  upgradeMarketSlots,
  upgradeBuildingFromPanel,
  inventorySlotCost,
  marketSlotCost,
} from "./systems/upgrades.js";
import {
  FIELD_LEVEL_SPEED_BONUS, SEED_SAVE_CHANCE_PER_LEVEL, MAX_FIELD_LEVEL, MAX_SEED_SAVE_LEVEL,
  INVENTORY_TOTAL_SLOTS, FIELD_TOTAL_SLOTS, ORCHARD_TOTAL_SLOTS,
  MAX_MARKET_SLOTS_PER_CATEGORY,
} from "./state.js";

let ctx = null; // { state, log(msg) }
let inventoryFilter = "tümü";
let inventorySort = "isim";

export function initUI(state, log) {
  ctx = { state, log };
  wireStaticEvents();
}

function gold() { return ctx.state.player.gold; }
function deductGold(amount) { ctx.state.player.gold -= amount; }
function addGold(amount) { ctx.state.player.gold += amount; }

function setTooltip(html) {
  const id = window._ttNextId();
  window._ttStore.set(id, html);
  return id;
}

function reasonText(r) {
  const map = {
    yetersiz_altin: "Altın yetersiz",
    max_seviye: "Maksimum seviyeye ulaşıldı",
    kapasite_dolu: "Kapasite dolu",
    eksik_malzeme: "Eksik malzeme",
    tarif_yok: "Tarif bulunamadı",
    ekilemez: "Buraya ekilemez",
    hazir_degil: "Hasat için hazır değil",
    zaten_acik: "Zaten açık",
    tukendi: "Stok tükendi",
    gecersiz_liste: "Geçersiz ürün",
    yetersiz_urun: "Envanterde yeterli ürün yok",
    tamamlanmadi: "Görev henüz tamamlanmadı",
    gorev_yok: "Görev bulunamadı",
    yetersiz_miktar: "Yeterli miktar yok",
    hava_kaynakli_basarisizlik: "Hava koşulları başarısızlığa neden oldu",
    hava_kaynakli_ticaret_kaybi: "Hava koşulları ticaret kaybına neden oldu",
  };
  return map[r] || r;
}

function seasonEmoji(s) {
  const map = { ilkbahar: "🌸", yaz: "☀️", sonbahar: "🍂", kış: "❄️" };
  return map[s] || "";
}

function ttTitle(text) { return `<div class="tt-title">${text}</div>`; }
function ttRow(icon, label, value, colorClass) {
  const cls = colorClass ? ` ${colorClass}` : "";
  return `<div class="tt-row">${icon ? icon + " " : ""}<span class="tt-label">${label}</span> <span class="tt-value${cls}">${value}</span></div>`;
}
function ttDivider() { return `<hr class="tt-divider">`; }
function ttHint(text) { return `<div class="tt-hint">${text}</div>`; }

function weatherTooltip(w) {
  const lines = [ttTitle(`${w.name}`)];
  const speed = w.growthSpeedMultiplier;
  const speedColor = speed > 1 ? "green" : speed < 1 ? "red" : "";
  lines.push(ttRow("🌱", "Büyüme:", `x${speed}`, speedColor));
  if (w.rarityChance && Object.keys(w.rarityChance).length > 0) {
    const rarities = Object.entries(w.rarityChance)
      .map(([r, ch]) => `${r}: %${Math.round(ch * 100)}`)
      .join(" · ");
    lines.push(ttRow("💎", "", rarities, "blue"));
  }
  if (w.tradeLossChance > 0) lines.push(ttRow("⚠️", "Ticaret riski:", `%${Math.round(w.tradeLossChance * 100)}`, "red"));
  if (w.mergeFailChance > 0) lines.push(ttRow("⚠️", "Birleştirme riski:", `%${Math.round(w.mergeFailChance * 100)}`, "red"));
  return lines.join("");
}

function cropTooltip(cropId) {
  const c = getCrop(cropId);
  if (!c) return cropId;
  const emoji = itemEmoji(cropId);
  const seasons = c.seasons.map((s) => `${seasonEmoji(s)}${s}`).join(" ");
  const harvestText = c.harvestCycle === "recurring" ? `Her ${c.recurringIntervalDays} günde bir` : "Tek hasat";
  return [
    ttTitle(`${emoji} ${c.name}`),
    ttRow("📅", "Mevsim:", seasons),
    ttRow("⏱️", "Büyüme:", `${c.growthDays} gün`),
    ttRow("🔄", "", harvestText),
    ttDivider(),
    ttRow("🪙", "Alış:", `${c.buyPrice}`, "gold"),
    ttRow("💰", "Satış:", `${c.sellPrice}`, "green"),
  ].join("");
}

function treeTooltip(treeId) {
  const t = getTree(treeId);
  if (!t) return treeId;
  const emoji = itemEmoji(treeId);
  const seasons = t.seasons.map((s) => `${seasonEmoji(s)}${s}`).join(" ");
  return [
    ttTitle(`${emoji} ${t.name}`),
    ttRow("📅", "Mevsim:", seasons),
    ttRow("⏱️", "Büyüme:", `${t.growthDays} gün`),
    ttDivider(),
    ttRow("🪙", "Alış:", `${t.buyPrice}`, "gold"),
    ttRow("💰", "Satış:", `${t.sellPrice}`, "green"),
  ].join("");
}

// ---------------------------------------------------------------------------
// ANA RENDER
// ---------------------------------------------------------------------------
export function render() {
  window._ttStore.clear();
  renderHeader();
  renderInventory();
  const middleTab = ctx.state.ui.activeMiddleTab;
  document.getElementById("middle-content").innerHTML = middleTab === "field" ? fieldGridHTML() : orchardGridHTML();
  renderBuildingTab();
  const rightTab = ctx.state.ui.activeRightTab;
  const rightEl = document.getElementById("right-content");
  if (rightTab === "market") rightEl.innerHTML = marketHTML();
  else if (rightTab === "crafting") rightEl.innerHTML = craftingHTML();
  else if (rightTab === "quests") rightEl.innerHTML = questsHTML();
  else if (rightTab === "upgrades") renderUpgrades();

  syncTabButtons();
}

function syncTabButtons() {
  document.querySelectorAll("#middle-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeMiddleTab));
  document.querySelectorAll("#building-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeBuildingTab));
  document.querySelectorAll("#right-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ctx.state.ui.activeRightTab));
  document.querySelectorAll("#inventory-filters button").forEach((b) => b.classList.toggle("active", b.dataset.filter === inventoryFilter));
}

// ---------------------------------------------------------------------------
// REHBER İPUÇLARI
// ---------------------------------------------------------------------------
function hint(shown, key) {
  if (shown[key]) return false;
  shown[key] = true;
  return true;
}

export function checkHints() {
  const s = ctx.state;
  const h = s.hintsShown;
  const items = s.inventory.items;

  if (hint(h, "first_seed") && Object.keys(items).some((id) => id.endsWith("_tohum"))) {
    ctx.log("💡 Tohum satın aldın! Envanterden tarlaya sürükleerek ekebilirsin.", "info");
  }

  if (hint(h, "first_sut") && items.sut) {
    ctx.log("💡 Bu sütü peynire dönüştürebilirsin! Üretim sekmesine git.", "info");
  }

  if (hint(h, "first_maya") && items.maya) {
    ctx.log("💡 Maya ekmek yapımında kullanılır. Buğday da lazım!", "info");
  }

  if (hint(h, "first_ekmek") && items.ekmek) {
    ctx.log("💡 Ekmeği hamburgerde kullanabilirsin! İnek eti gerekli.", "info");
  }

  if (hint(h, "first_cikolata") && items.cikolata) {
    ctx.log("💡 Çikolatayı fındık ezmesiyle birleştirerek fındık çikolatası yapabilirsin!", "info");
  }

  const season = currentSeason(s.time);
  if (season === "ilkbahar" && hint(h, "season_ilkbahar")) {
    ctx.log("🌸 İlkbahar başladı! Yeni ürünler: çilek, ahududu, nohut", "info");
  }
  if (season === "yaz" && hint(h, "season_yaz")) {
    ctx.log("☀️ Yaz başladı! Tropik meyveler ve domates için ideal zaman.", "info");
  }
  if (season === "sonbahar" && hint(h, "season_sonbahar")) {
    ctx.log("🍂 Sonbahar başladı! Nar, incir ve bal kabağı hasadı zamanı.", "info");
  }
  if (season === "kış" && hint(h, "season_kis")) {
    ctx.log("❄️ Kış başladı! Narenciye ve serada yetişen ürünler öne çıkıyor.", "info");
  }

  if (s.unlockedTiers.length >= 2 && hint(h, "tier2_open")) {
    ctx.log("🎉 Tier 2 tarifleri açıldı! Yeni tarifler Üretim sekmesinde.", "info");
  }
  if (s.unlockedTiers.length >= 3 && hint(h, "tier3_open")) {
    ctx.log("🎉 Tier 3 tarifleri açıldı! Güveç, mantı ve daha fazlası!", "info");
  }
  if (s.unlockedTiers.length >= 4 && hint(h, "tier4_open")) {
    ctx.log("🎉 Tier 4 tarifleri açıldı! Şef'in Özel Menüsü ve Tatlı Tabağı!", "info");
  }
}

// ---------------------------------------------------------------------------
// HEADER
// ---------------------------------------------------------------------------
function renderHeader() {
  const weather = getWeather(ctx.state.weather);
  const season = currentSeason(ctx.state.time);
  const seasonEmojiStr = seasonEmoji(season);
  const timeTooltip = [
    ttTitle("⏰ Zaman"),
    ttRow("📅", "Yıl:", `${ctx.state.time.year}`),
    ttRow(seasonEmojiStr, "Mevsim:", season),
    ttRow("📆", "Gün:", `${ctx.state.time.day}/10`),
  ].join("");
  const goldTooltip = [
    ttTitle("🪙 Altın"),
    ttRow("", "Toplam:", `${gold()}`, "gold"),
    ttDivider(),
    ttHint("Envanterdeki eşyaları tıklayarak sat"),
  ].join("");

  const marketSeconds = Math.max(0, 120 - Math.round(ctx.state.market.secondsSinceRefresh));
  const marketTooltip = [
    ttTitle("🔄 Pazar Yenileme"),
    ttRow("⏱️", "Kalan:", `${marketSeconds} saniye`),
    ttHint("Yeni ürünler gelecek"),
  ].join("");

  document.getElementById("header").innerHTML = `
    <div class="hdr-item" data-tooltip="${setTooltip(goldTooltip)}">🪙 <b>${gold()}</b></div>
    <div class="hdr-item" data-tooltip="${setTooltip(timeTooltip)}">🕐 ${formatTime(ctx.state.time)}</div>
    <div class="hdr-item" data-tooltip="${setTooltip(weatherTooltip(weather))}">🌤️ ${weather.name}</div>
    <div class="hdr-item" data-tooltip="${setTooltip(marketTooltip)}" style="margin-left:auto">🏪 Market: ${marketSeconds}s</div>
  `;
}

// ---------------------------------------------------------------------------
// ENVANTER
// ---------------------------------------------------------------------------
function renderInventory() {
  const filtersEl = document.getElementById("inventory-filters");
  const isActive = inventorySort === "deger";
  filtersEl.innerHTML =
    `<button class="hamburger-btn${isActive ? " active" : ""}" data-action="sortByValue"><span></span><span></span><span></span></button>` +
    FILTERS.map((f) => `<button data-filter="${f}">${f}</button>`).join("");

  const list = getInventoryList(ctx.state, { filter: inventoryFilter, sortBy: inventorySort });
  const grid = document.getElementById("inventory-grid");
  const cells = [];
  const maxSlots = ctx.state.inventory.maxSlots;
  for (let i = 0; i < maxSlots; i++) {
    const entry = list[i];
    if (!entry) { cells.push(`<div class="cell empty"></div>`); continue; }
    const name = itemDisplayName(entry.itemId);
    const price = itemSellPrice(entry.itemId, entry.meta);
    const isSeedLike = entry.category === "tohum" || entry.category === "fidan";
    const isKaliteli = entry.category === "kaliteli";

    let tooltip = ttTitle(`${itemEmoji(entry.itemId)} ${name}`);
    tooltip += ttRow("📦", "Miktar:", `${entry.quantity}`);
    tooltip += ttRow("💰", "Satış:", `${price}🪙`, "gold");
    if (isSeedLike) {
      const baseId = entry.itemId.replace(/_tohum$/, "").replace(/_fidan$/, "");
      const crop = getCrop(baseId);
      const tree = getTree(baseId);
      if (crop) tooltip += ttDivider() + cropTooltip(baseId);
      else if (tree) tooltip += ttDivider() + treeTooltip(baseId);
      tooltip += ttDivider() + ttHint("Sürükle ve ek");
    } else if (isKaliteli) {
      tooltip += ttDivider() + ttHint("4x fiyatına satılır");
    }

    cells.push(`
      <div class="cell item ${entry.category}" draggable="true" data-item-id="${entry.itemId}" data-tooltip="${setTooltip(tooltip)}">
        <span class="cell-emoji">${itemEmoji(entry.itemId)}</span>
        <span class="qty">${entry.quantity}</span>
        <span class="label">${name}</span>
      </div>
    `);
  }
  grid.innerHTML = cells.join("");
}

function abbreviate(name) {
  return name.length > 10 ? name.slice(0, 9) + "…" : name;
}

// ---------------------------------------------------------------------------
// GELİŞTİRME PANELİ
// ---------------------------------------------------------------------------
function renderUpgrades() {
  const state = ctx.state;
  const fieldUnlocked = state.field.slots.filter((s) => s.unlocked).length;
  const orchardUnlocked = state.orchard.slots.filter((s) => s.unlocked).length;

  const sections = [];

  // Slot Geliştirmeleri
  const invMaxed = state.inventory.maxSlots >= INVENTORY_TOTAL_SLOTS;
  const fieldMaxed = fieldUnlocked >= FIELD_TOTAL_SLOTS;
  const orchardMaxed = orchardUnlocked >= ORCHARD_TOTAL_SLOTS;
  const invCost = inventorySlotCost(state.inventory.maxSlots);
  const fieldCost = fieldSlotUnlockCost(fieldUnlocked);
  const orchardCost = orchardSlotUnlockCost(orchardUnlocked);

  const invTooltip = invMaxed
    ? ttTitle("📦 Envanter Slotu") + ttRow("✅", "", "Maksimum", "green")
    : ttTitle("📦 Envanter Slotu") + ttRow("📊", "Durum:", `${state.inventory.maxSlots}/${INVENTORY_TOTAL_SLOTS}`) + ttDivider() + ttRow("🪙", "Maliyet:", `${invCost}🪙`, "gold") + ttDivider() + ttHint("Envanter kapasitesini +1 artırır");

  const fieldTooltip = fieldMaxed
    ? ttTitle("🌾 Tarla Slotu") + ttRow("✅", "", "Maksimum", "green")
    : ttTitle("🌾 Tarla Slotu") + ttRow("📊", "Durum:", `${fieldUnlocked}/${FIELD_TOTAL_SLOTS}`) + ttDivider() + ttRow("🪙", "Maliyet:", `${fieldCost}🪙`, "gold") + ttDivider() + ttHint("Tarla slot kapasitesini +1 artırır");

  const orchardTooltip = orchardMaxed
    ? ttTitle("🌳 Bahçe Slotu") + ttRow("✅", "", "Maksimum", "green")
    : ttTitle("🌳 Bahçe Slotu") + ttRow("📊", "Durum:", `${orchardUnlocked}/${ORCHARD_TOTAL_SLOTS}`) + ttDivider() + ttRow("🪙", "Maliyet:", `${orchardCost}🪙`, "gold") + ttDivider() + ttHint("Bahçe slot kapasitesini +1 artırır");

  sections.push(`
    <div class="upgrade-section">
      <h4>📦 Slot Geliştirmeleri</h4>
      <div class="upgrade-row" data-tooltip="${setTooltip(invTooltip)}">
        <div class="upgrade-info">
          <span class="upgrade-label">Envanter Slotu</span>
          <span class="upgrade-status">${state.inventory.maxSlots}/${INVENTORY_TOTAL_SLOTS}</span>
        </div>
        <button class="upgrade-btn" data-action="upgradeInventory" ${invMaxed ? "disabled" : ""}>
          ${invMaxed ? "Max" : `${invCost}🪙`}
        </button>
      </div>
      <div class="upgrade-row" data-tooltip="${setTooltip(fieldTooltip)}">
        <div class="upgrade-info">
          <span class="upgrade-label">Tarla Slotu</span>
          <span class="upgrade-status">${fieldUnlocked}/${FIELD_TOTAL_SLOTS}</span>
        </div>
        <button class="upgrade-btn" data-action="upgradeField" ${fieldMaxed ? "disabled" : ""}>
          ${fieldMaxed ? "Max" : `${fieldCost}🪙`}
        </button>
      </div>
      <div class="upgrade-row" data-tooltip="${setTooltip(orchardTooltip)}">
        <div class="upgrade-info">
          <span class="upgrade-label">Bahçe Slotu</span>
          <span class="upgrade-status">${orchardUnlocked}/${ORCHARD_TOTAL_SLOTS}</span>
        </div>
        <button class="upgrade-btn" data-action="upgradeOrchard" ${orchardMaxed ? "disabled" : ""}>
          ${orchardMaxed ? "Max" : `${orchardCost}🪙`}
        </button>
      </div>
    </div>
  `);

  // Market Slotları
  const seedMaxed = state.market.seedSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;
  const saplingMaxed = state.market.saplingSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;
  const animalMaxed = state.market.animalSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;
  const seedCost = marketSlotCost("seed", state.market.seedSlots);
  const saplingCost = marketSlotCost("sapling", state.market.saplingSlots);
  const animalCost = marketSlotCost("animal", state.market.animalSlots);

  const seedSlotTooltip = seedMaxed
    ? ttTitle("🌱 Tohum Slotları") + ttRow("✅", "", "Maksimum", "green")
    : ttTitle("🌱 Tohum Slotları") + ttRow("📊", "Durum:", `${state.market.seedSlots}/${MAX_MARKET_SLOTS_PER_CATEGORY}`) + ttDivider() + ttRow("🪙", "Maliyet:", `${seedCost}🪙`, "gold") + ttDivider() + ttHint("Pazarda tohum slotu +1 artırır");

  const saplingSlotTooltip = saplingMaxed
    ? ttTitle("🌿 Fidan Slotları") + ttRow("✅", "", "Maksimum", "green")
    : ttTitle("🌿 Fidan Slotları") + ttRow("📊", "Durum:", `${state.market.saplingSlots}/${MAX_MARKET_SLOTS_PER_CATEGORY}`) + ttDivider() + ttRow("🪙", "Maliyet:", `${saplingCost}🪙`, "gold") + ttDivider() + ttHint("Pazarda fidan slotu +1 artırır");

  const animalSlotTooltip = animalMaxed
    ? ttTitle("🐄 Hayvan Slotları") + ttRow("✅", "", "Maksimum", "green")
    : ttTitle("🐄 Hayvan Slotları") + ttRow("📊", "Durum:", `${state.market.animalSlots}/${MAX_MARKET_SLOTS_PER_CATEGORY}`) + ttDivider() + ttRow("🪙", "Maliyet:", `${animalCost}🪙`, "gold") + ttDivider() + ttHint("Pazarda hayvan ürünü slotu +1 artırır");

  sections.push(`
    <div class="upgrade-section">
      <h4>🏪 Market Slotları</h4>
      <div class="upgrade-row" data-tooltip="${setTooltip(seedSlotTooltip)}">
        <div class="upgrade-info">
          <span class="upgrade-label">🌱 Tohum Slotları</span>
          <span class="upgrade-status">${state.market.seedSlots}/${MAX_MARKET_SLOTS_PER_CATEGORY}</span>
        </div>
        <button class="upgrade-btn" data-action="upgradeMarketSeed" ${seedMaxed ? "disabled" : ""}>
          ${seedMaxed ? "Max" : `${seedCost}🪙`}
        </button>
      </div>
      <div class="upgrade-row" data-tooltip="${setTooltip(saplingSlotTooltip)}">
        <div class="upgrade-info">
          <span class="upgrade-label">🌿 Fidan Slotları</span>
          <span class="upgrade-status">${state.market.saplingSlots}/${MAX_MARKET_SLOTS_PER_CATEGORY}</span>
        </div>
        <button class="upgrade-btn" data-action="upgradeMarketSapling" ${saplingMaxed ? "disabled" : ""}>
          ${saplingMaxed ? "Max" : `${saplingCost}🪙`}
        </button>
      </div>
      <div class="upgrade-row" data-tooltip="${setTooltip(animalSlotTooltip)}">
        <div class="upgrade-info">
          <span class="upgrade-label">🐄 Hayvan Slotları</span>
          <span class="upgrade-status">${state.market.animalSlots}/${MAX_MARKET_SLOTS_PER_CATEGORY}</span>
        </div>
        <button class="upgrade-btn" data-action="upgradeMarketAnimal" ${animalMaxed ? "disabled" : ""}>
          ${animalMaxed ? "Max" : `${animalCost}🪙`}
        </button>
      </div>
    </div>
  `);

  // Binalar
  sections.push(`
    <div class="upgrade-section">
      <h4>🏗️ Binalar</h4>
      ${renderBuildingUpgradeRow("hive")}
      ${renderBuildingUpgradeRow("coop")}
      ${renderBuildingUpgradeRow("barn")}
    </div>
  `);

  const rightEl = document.getElementById("right-content");
  rightEl.innerHTML = `<div class="upgrades-grid">${sections.join("")}</div>`;
}

function renderBuildingUpgradeRow(type) {
  const def = BUILDING_TYPES[type];
  const building = ctx.state.buildings[type];
  const capacity = capacityForLevel(type, building.level);
  const maxed = building.level >= MAX_BUILDING_LEVEL;
  const upgradeCostVal = buildingUpgradeCost(building.level);

  const tooltip = [
    ttTitle(`${def.name}`),
    ttRow("🐾", "Hayvan:", `${def.animalName}`),
    ttRow("📊", "Popülasyon:", `${building.population}/${capacity}`),
    ttRow("📦", "Seviye:", `${building.level}/${MAX_BUILDING_LEVEL}`),
    ttDivider(),
    !maxed ? ttRow("🪙", "Geliştirme:", `${upgradeCostVal}🪙`, "gold") : ttHint("Maksimum seviye"),
    ttDivider(),
    ttHint("Hayvan almak için Market sekmesini kullan"),
  ].join("");

  return `
    <div class="building-upgrade-row" data-tooltip="${setTooltip(tooltip)}">
      <div class="upgrade-info">
        <span class="upgrade-label">${def.name}</span>
        <span class="upgrade-status">${def.animalName}: ${building.population}/${capacity}</span>
      </div>
      <div class="building-upgrade-actions">
        <button class="upgrade-btn" data-action="upgradeBuildingUpgrade" data-building="${type}" ${maxed ? "disabled" : ""}>
          ${maxed ? "Max" : `${upgradeCostVal}🪙 Geliştir`}
        </button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// TARLA
// ---------------------------------------------------------------------------
function fieldGridHTML() {
  const slots = ctx.state.field.slots
    .filter((slot) => slot.unlocked)
    .map((slot, i) => slotHTML(slot, i, "field"))
    .join("");
  return `<div class="plot-grid field-grid">${slots}</div>`;
}

function orchardGridHTML() {
  const slots = ctx.state.orchard.slots
    .filter((slot) => slot.unlocked)
    .map((slot, i) => slotHTML(slot, i, "orchard"))
    .join("");
  return `<div class="plot-grid orchard-grid">${slots}</div>`;
}

function slotHTML(slot, index, kind) {
  const dataset = getData(kind);
  const kindName = kind === "field" ? "Tarla" : "Bahçe";
  const unlockedCount = unlockedCountFn(kind);

  if (!slot.unlocked) {
    const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount) : orchardSlotUnlockCost(unlockedCount);
    const tooltip = [
      ttTitle("🔒 Kilitli Slot"),
      ttRow("🪙", "Maliyet:", `${cost}🪙`, "gold"),
      ttRow("🔓", "Açık slot:", `${unlockedCount}`),
    ].join("");
    return `<div class="slot locked" data-kind="${kind}" data-index="${index}" data-action="unlock" data-tooltip="${setTooltip(tooltip)}">
      <div class="slot-inner">🔒</div>
      <div class="slot-name">${cost}🪙</div>
    </div>`;
  }

  if (!slot.planted) {
    const speedPct = Math.round(FIELD_LEVEL_SPEED_BONUS * 100 * slot.level);
    const seedSavePct = Math.round(SEED_SAVE_CHANCE_PER_LEVEL * 100 * slot.seedSaveLevel);
    const tooltip = [
      ttTitle(`${kindName} Slot #${index + 1}`),
      ttRow("➕", "Durum:", "Boş"),
      ttDivider(),
      ttRow("⚡", "Hız:", `${slot.level}/${MAX_FIELD_LEVEL} (+${speedPct}%)`),
      ttRow("🛡️", "Koruma:", `${slot.seedSaveLevel}/${MAX_SEED_SAVE_LEVEL} (+${seedSavePct}%)`),
      ttDivider(),
      ttHint("Tohum veya fidan sürükle"),
    ].join("");
    return `<div class="slot empty-plantable" data-kind="${kind}" data-index="${index}" data-tooltip="${setTooltip(tooltip)}">
      <div class="slot-inner">＋</div>
      ${upgradeButtonsHTML(slot, index, kind)}
    </div>`;
  }

  const def = dataset.find((d) => d.id === slot.planted.cropId);
  const pct = Math.min(100, Math.round((slot.planted.elapsedSeconds / slot.planted.requiredSeconds) * 100));
  const ready = slot.planted.ready;
  const cropName = def ? def.name : slot.planted.cropId;
  const speedPct = Math.round(FIELD_LEVEL_SPEED_BONUS * 100 * slot.level);
  const seedSavePct = Math.round(SEED_SAVE_CHANCE_PER_LEVEL * 100 * slot.seedSaveLevel);
  const remainingSec = Math.max(0, Math.round(slot.planted.requiredSeconds - slot.planted.elapsedSeconds));
  const remainingMin = Math.floor(remainingSec / 60);
  const remainSec = remainingSec % 60;

  let tooltip;
  if (ready) {
    tooltip = [
      ttTitle(`${cropName}`),
      ttRow("✅", "Durum:", "Hasat hazır!", "green"),
      ttDivider(),
      ttRow("⚡", "Hız:", `Lv${slot.level}/${MAX_FIELD_LEVEL}`),
      ttRow("🛡️", "Koruma:", `Lv${slot.seedSaveLevel}/${MAX_SEED_SAVE_LEVEL}`),
      ttDivider(),
      ttHint("Tıklayarak hasat et"),
    ].join("");
  } else {
    const growInfo = getCrop(slot.planted.cropId)
      ? `${getCrop(slot.planted.cropId).harvestCycle === "recurring" ? "Tekrarlı" : "Tek hasat"}`
      : getTree(slot.planted.cropId) ? "Tekrarlı" : "";
    tooltip = [
      ttTitle(`${cropName}`),
      ttRow("📊", "Büyüme:", `%${pct}`),
      ttRow("⏱️", "Kalan:", `${remainingMin}dk ${remainSec}sn`),
      ttDivider(),
      ttRow("⚡", "Hız:", `+%${speedPct}`),
      ttRow("🛡️", "Koruma:", `+%${seedSavePct}`),
      growInfo ? ttRow("🔄", "", growInfo) : "",
    ].join("");
  }

  const baseEmoji = itemEmoji(def ? def.id : slot.planted.cropId);

  return `<div class="slot ${ready ? "ready" : "growing"}" data-kind="${kind}" data-index="${index}" data-action="${ready ? "harvest" : ""}" data-tooltip="${setTooltip(tooltip)}">
    <div class="slot-inner">${baseEmoji}</div>
    <div class="slot-name">${def ? abbreviate(def.name) : ""}</div>
    ${ready ? "" : `<div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>`}
    ${upgradeButtonsHTML(slot, index, kind)}
  </div>`;
}

function upgradeButtonsHTML(slot, index, kind) {
  const lvlMaxed = slot.level >= MAX_FIELD_LEVEL;
  const seedMaxed = slot.seedSaveLevel >= MAX_SEED_SAVE_LEVEL;
  const nextSpeedPct = Math.round(FIELD_LEVEL_SPEED_BONUS * 100 * (slot.level + 1));
  const nextSeedPct = Math.round(SEED_SAVE_CHANCE_PER_LEVEL * 100 * (slot.seedSaveLevel + 1));
  const speedCost = kind === "field" ? fieldUpgradeCost(slot.level) : orchardUpgradeCost(slot.level);
  const seedCost = seedSaveUpgradeCost(slot.seedSaveLevel);

  const lvlTooltip = lvlMaxed
    ? ttTitle("⚡ Hız") + ttRow("✅", "", "Maksimum", "green")
    : ttTitle("⚡ Hız Geliştir") + ttRow("➡️", "Sonraki:", `+%${nextSpeedPct}`, "green") + ttDivider() + ttRow("🪙", "Maliyet:", `${speedCost}🪙`, "gold");
  const seedTooltip = seedMaxed
    ? ttTitle("🛡️ Koruma") + ttRow("✅", "", "Maksimum", "green")
    : ttTitle("🛡️ Koruma Geliştir") + ttRow("➡️", "Sonraki:", `+%${nextSeedPct}`, "green") + ttDivider() + ttRow("🪙", "Maliyet:", `${seedCost}🪙`, "gold");

  return `<div class="slot-upgrades">
    <button class="mini-btn" data-kind="${kind}" data-index="${index}" data-action="upgradeLevel" ${lvlMaxed ? "disabled" : ""} data-tooltip="${setTooltip(lvlTooltip)}">⬆${slot.level}</button>
    <button class="mini-btn" data-kind="${kind}" data-index="${index}" data-action="upgradeSeed" ${seedMaxed ? "disabled" : ""} data-tooltip="${setTooltip(seedTooltip)}">🛡️${slot.seedSaveLevel}</button>
  </div>`;
}

function getData(kind) { return kind === "field" ? CROPS : TREES; }
function unlockedCountFn(kind) {
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  return slots.filter((s) => s.unlocked).length;
}

// ---------------------------------------------------------------------------
// BİNALAR (Kovan / Kümes / Ahır)
// ---------------------------------------------------------------------------
function renderBuildingTab() {
  const type = ctx.state.ui.activeBuildingTab;
  const def = BUILDING_TYPES[type];
  const building = ctx.state.buildings[type];
  const capacity = capacityForLevel(type, building.level);

  const panelTooltip = [
    ttTitle(`${def.name}`),
    ttRow("🐾", "Hayvan:", `${def.animalName}`),
    ttRow("📊", "Popülasyon:", `${building.population}/${capacity}`),
    ttRow("⏱️", "Üretim:", `her ${def.baseProductionDays} günde bir`),
    ttDivider(),
    ttRow("📦", "Ürün:", itemDisplayName(def.productId)),
    def.secondaryProductId ? ttRow("✨", "Nadiren:", itemDisplayName(def.secondaryProductId)) : "",
    def.fieldBonusCropIds ? ttDivider() + ttRow("🌾", "Bonus:", def.fieldBonusCropIds.map((id) => itemDisplayName(id)).join(", ")) : "",
    ttDivider(),
    ttHint("Hayvan al ve bina geliştirme: Geliştirme sekmesinden"),
  ].join("");

  document.getElementById("building-content").innerHTML = `
    <div class="building-panel" data-tooltip="${setTooltip(panelTooltip)}">
      <h3>${def.name} — Seviye ${building.level}</h3>
      <p>${def.animalName}: ${building.population} / ${capacity}</p>
      <p>Üretim: ${itemDisplayName(def.productId)}${def.secondaryProductId ? ` (+ nadiren ${itemDisplayName(def.secondaryProductId)})` : ""}</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// MARKET
// ---------------------------------------------------------------------------
function marketHTML() {
  const discountPct = getBulkDiscountPercent();

  const categoryLabels = { seed: "🌱 Tohum", sapling: "🌿 Fidan", animal: "🐄 Hayvan" };
  let lastCategory = null;

  const rows = ctx.state.market.listings
    .map((listing, i) => {
      const isAnimal = listing.category === "animal";
      const name = isAnimal ? listing.label : itemDisplayName(listing.seedId);
      const unitPrice = listing.pricePerUnit;
      const soldOut = listing.remaining <= 0;
      const typeLabel = categoryLabels[listing.category] || listing.category;

      let cropDetail = "";
      if (listing.category === "seed") {
        const crop = getCrop(listing.itemId);
        if (crop) cropDetail = `Tier ${crop.tier} · ${crop.seasons.join(" ")}`;
      } else if (listing.category === "sapling") {
        const tree = getTree(listing.itemId);
        if (tree) cropDetail = `Tier ${tree.tier} · ${tree.seasons.join(" ")}`;
      } else if (isAnimal) {
        const building = ctx.state.buildings[listing.buildingType];
        const cap = capacityForLevel(listing.buildingType, building.level);
        cropDetail = `${BUILDING_TYPES[listing.buildingType].name}: ${building.population}/${cap}`;
      }

      let capacityFull = false;
      if (isAnimal) {
        const building = ctx.state.buildings[listing.buildingType];
        const cap = capacityForLevel(listing.buildingType, building.level);
        capacityFull = building.population >= cap;
      }

      // Tüm kategoriler için fiyat farkı renkli gösterimi
      let priceTag = "";
      let diffTag = "";
      if (listing.basePrice > 0) {
        const diffPct = Math.round(((unitPrice - listing.basePrice) / listing.basePrice) * 100);
        priceTag = `<span class="mr-price-tag" style="color:var(--text-secondary)">${unitPrice}🪙</span>`;
        if (diffPct === -100) {
          diffTag = `<span class="mr-price-tag" style="color:#ffffff">Bedava</span>`;
        } else if (diffPct === 100) {
          diffTag = `<span class="mr-price-tag mr-price-black">Çok Pahalı</span>`;
        } else if (diffPct === 0) {
          diffTag = `<span class="mr-price-tag" style="color:#e6c520">İdeal</span>`;
        } else if (diffPct < 0) {
          diffTag = `<span class="mr-price-tag" style="color:#2ecc71">%${Math.abs(diffPct)} Ucuz</span>`;
        } else {
          diffTag = `<span class="mr-price-tag" style="color:#e74c3c">%${diffPct} Pahalı</span>`;
        }
      } else {
        priceTag = `<span class="mr-price-tag" style="color:#e6c520">0🪙</span>`;
        diffTag = `<span class="mr-price-tag" style="color:#ffffff">Bedava</span>`;
      }

      const diff = unitPrice - listing.basePrice;
      const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;

      const tooltip = soldOut
        ? [
          ttTitle(`${name}`),
          ttRow("", "Tür:", typeLabel),
          ttDivider(),
          ttHint("Tükendi — bu döngüde gelmeyecek"),
        ].join("")
        : [
          ttTitle(`${name}`),
          ttRow("", "Tür:", typeLabel),
          cropDetail ? ttRow("📅", "", cropDetail) : "",
          ttDivider(),
          ttRow("📊", "Taban:", `${listing.basePrice}🪙`, "gold"),
          ttRow("💰", "Fiyat:", `${unitPrice}🪙`, "gold"),
          diff < 0 ? ttRow("📈", "Kar:", `+${Math.abs(diff)}🪙`, "green") : diff > 0 ? ttRow("📉", "Zarar:", `-${diff}🪙`, "red") : ttRow("", "", "Fiyat aynı"),
          capacityFull ? ttDivider() + ttHint("⚠️ Kapasite dolu!") : "",
        ].join("");

      const soldOutClass = soldOut ? " sold-out" : "";
      const icon = isAnimal ? listing.emoji : itemEmoji(listing.seedId);

      let categoryHeader = "";
      if (listing.category !== lastCategory) {
        lastCategory = listing.category;
        categoryHeader = `<div class="market-category-header">${typeLabel}</div>`;
      }

      const buyDisabled = gold() < unitPrice || capacityFull;

      // Hayvanlar: sadece 1x butonu
      if (isAnimal) {
        return `${categoryHeader}<div class="market-row${soldOutClass}" data-tooltip="${setTooltip(tooltip)}">
          <div class="mr-left">
            <span class="mr-icon">${icon}</span>
            <div class="mr-info">
              <span class="mr-name">${name}</span>
              <span class="mr-price-row">${priceTag} ${diffTag}</span>
            </div>
          </div>
          ${soldOut
            ? `<span class="mr-soldout">Tükendi</span>`
            : `<div class="mr-right">
                <button class="mr-btn" data-action="buyOne" data-index="${i}" ${buyDisabled ? "disabled" : ""}>1x</button>
              </div>`
          }
        </div>`;
      }

      // Tohum/Fidan: 1x + toplu alım
      const bulkCost = Math.round(unitPrice * listing.remaining * (1 - discountPct / 100));
      return `${categoryHeader}<div class="market-row${soldOutClass}" data-tooltip="${setTooltip(tooltip)}">
        <div class="mr-left">
          <span class="mr-icon">${icon}</span>
          <div class="mr-info">
            <span class="mr-name">${name}</span>
            <span class="mr-price-row">${priceTag} ${diffTag}</span>
          </div>
        </div>
        ${soldOut
          ? `<span class="mr-soldout">Tükendi</span>`
          : `<div class="mr-right">
              <button class="mr-btn" data-action="buyOne" data-index="${i}" ${buyDisabled ? "disabled" : ""}>1x</button>
              <button class="mr-btn" data-action="buyAll" data-index="${i}" ${buyDisabled ? "disabled" : ""}>${listing.remaining}x</button>
            </div>`
        }
      </div>`;
    })
    .join("");

  return `
    <div class="market-list">${rows || "<p>Yükleniyor…</p>"}</div>
    <div class="market-info">Toplu alımda (%${discountPct} indirim): Tümünü Al butonu ile kalan stokun tamamını indirimli alın.</div>
  `;
}

// ---------------------------------------------------------------------------
// ÜRETİM (CRAFTING)
// ---------------------------------------------------------------------------
function craftingHTML() {
  const maxUnlockedTier = Math.max(...ctx.state.unlockedTiers);

  const cards = RECIPES.map((r) => {
    const unlocked = ctx.state.unlockedTiers.includes(r.tier);
    const learned = ctx.state.recipes[r.id].learned;
    const craftable = unlocked && canCraft(ctx.state, r.id, 1);

    let maxQty = 0;
    while (canCraft(ctx.state, r.id, maxQty + 1)) maxQty++;

    const outputPrice = itemSellPrice(r.output.id, {});
    const profit = outputPrice - r.inputs.reduce((sum, inp) => sum + itemSellPrice(inp.id, {}) * inp.qty, 0);

    const inputsDetail = r.inputs.map((inp) => {
      const have = ctx.state.inventory.items[inp.id]?.quantity || 0;
      const status = have >= inp.qty ? "green" : "red";
      return ttRow(itemEmoji(inp.id), `${inp.qty}x ${itemDisplayName(inp.id)}:`, `${have}/${inp.qty}`, status);
    }).join("");

    const profitStr = profit >= 0 ? `+${profit}` : `${profit}`;

    // Bu tarif hangi tariflerde kullanılıyor?
    const usedIn = RECIPES.filter((other) => other.inputs.some((inp) => inp.id === r.output.id));
    const usedInText = usedIn.length > 0
      ? usedIn.map((other) => `${itemEmoji(other.output.id)} ${other.name}`).join(", ")
      : null;

    // Zincirli girdiler: bu tarifin girdilerinden hangileri başka bir tarifin çıktısı?
    const chainInputs = r.inputs.filter((inp) => RECIPES.some((x) => x.output.id === inp.id));
    const chainText = chainInputs.length > 0
      ? chainInputs.map((inp) => {
          const src = RECIPES.find((x) => x.output.id === inp.id);
          return src ? `${itemEmoji(src.output.id)} ${src.name}` : inp.id;
        }).join(", ")
      : null;

    if (!unlocked) {
      const lockTooltip = [
        ttTitle(`🔒 ${r.name}`),
        ttRow("🚫", "Durum:", "Kilitli"),
        ttDivider(),
        ttHint(`Tier ${r.tier} tariflerini açmak için Tier ${r.tier - 1} tarifi üret`),
      ].join("");
      return `<div class="recipe-card locked ${`recipe-tier-${r.tier}`}" data-tooltip="${setTooltip(lockTooltip)}">
        <div class="recipe-title">🔒 ${r.name}</div>
        <div class="recipe-actions">
          <button disabled>Kilitli</button>
        </div>
      </div>`;
    }

    const tooltip = [
      ttTitle(`${itemEmoji(r.output.id)} ${r.name}`),
      ttDivider(),
      inputsDetail,
      chainText ? ttDivider() + ttRow("🔗", "Zincir:", chainText, "blue") : "",
      ttDivider(),
      usedInText ? ttRow("📦", "Kullanıldığı:", usedInText) : ttRow("📦", "Kullanıldığı:", "Doğrudan satış"),
      ttDivider(),
      ttRow("💰", "Satış:", `${outputPrice}🪙`, "gold"),
      ttRow("📊", "Kâr:", `${profitStr}🪙`, profit >= 0 ? "green" : "red"),
      ttDivider(),
      ttHint(learned ? "Öğrenildi — toplu üretim açık" : "İlk üretimde öğrenilir"),
    ].join("");

    const tierClass = `recipe-tier-${r.tier}`;

    return `<div class="recipe-card ${craftable ? "" : "faded"} ${tierClass}" data-tooltip="${setTooltip(tooltip)}">
      <div class="recipe-title">${itemEmoji(r.output.id)} ${r.name} ${learned ? "⭐" : ""}</div>
      <div class="recipe-actions">
        <button data-action="craft" data-recipe="${r.id}" data-times="1" ${craftable ? "" : "disabled"}>Üret</button>
        ${learned && maxQty > 1 ? `<button data-action="craft" data-recipe="${r.id}" data-times="${maxQty}" ${maxQty > 0 ? "" : "disabled"}>${maxQty}x</button>` : ""}
      </div>
    </div>`;
  }).join("");

  return `<div class="panel-header">Üretim</div><div class="recipe-grid">${cards}</div>`;
}

// ---------------------------------------------------------------------------
// GÖREVLER
// ---------------------------------------------------------------------------
function questsHTML() {
  ensureQuestPool(ctx.state);

  const questEmoji = { produce: "🏭", sell: "💰" };
  const questLabel = { produce: "Üret", sell: "Sat" };

  const cards = ctx.state.quests.map((q) => {
    const pct = Math.min(100, Math.round((q.progress / q.requiredQty) * 100));
    const done = q.progress >= q.requiredQty;
    const itemName = itemDisplayName(q.itemId);
    const itemIcon = itemEmoji(q.itemId);

    const tooltip = [
      ttTitle(`${questEmoji[q.type] || "🎯"} Görev`),
      ttRow("", "Tür:", `${questLabel[q.type] || q.type}`),
      ttRow(itemIcon, "Ürün:", itemName),
      ttRow("📊", "İlerleme:", `${q.progress}/${q.requiredQty}`, done ? "green" : ""),
      ttDivider(),
      ttRow("🪙", "Ödül:", `${q.reward.gold}🪙`, "gold"),
    ].join("");

    return `
      <div class="quest-card${done ? " ready" : ""}" data-tooltip="${setTooltip(tooltip)}">
        <div class="quest-header">
          <span class="quest-icon">${questEmoji[q.type] || "🎯"}</span>
          <span class="quest-title">${q.requiredQty}x ${itemName} ${questLabel[q.type] || ""}</span>
        </div>
        <div class="quest-progress">
          <div class="quest-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="quest-footer">
          <span class="quest-count">${q.progress}/${q.requiredQty}</span>
          <span class="quest-reward">🪙 ${q.reward.gold}</span>
          ${done
            ? `<button class="quest-claim-btn" data-action="claimQuest" data-quest="${q.questId}">Ödülü Al</button>`
            : ""}
        </div>
      </div>`;
  }).join("");

  return `<div class="panel-header">Görevler</div><div class="quest-grid">${cards || '<div class="quest-empty">Aktif görev yok</div>'}</div>`;
}

// ---------------------------------------------------------------------------
// OLAY YÖNETİMİ
// ---------------------------------------------------------------------------
function wireStaticEvents() {
  document.getElementById("middle-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    ctx.state.ui.activeMiddleTab = btn.dataset.tab;
    render();
  });

  document.getElementById("building-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    ctx.state.ui.activeBuildingTab = btn.dataset.tab;
    render();
  });

  document.getElementById("right-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    ctx.state.ui.activeRightTab = btn.dataset.tab;
    render();
  });

  document.getElementById("inventory-filters").addEventListener("click", (e) => {
    const hamburger = e.target.closest(".hamburger-btn");
    if (hamburger) {
      inventorySort = inventorySort === "deger" ? "isim" : "deger";
      render();
      return;
    }
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    inventoryFilter = btn.dataset.filter;
    render();
  });

  document.getElementById("inventory-grid").addEventListener("click", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    const itemId = cell.dataset.itemId;
    if (itemId.endsWith("_tohum") || itemId.endsWith("_fidan")) {
      ctx.log("Bu eşya tohum/fidan olarak ekilemez. Sadece tohum ve fidanları sürükle.", "info");
      return;
    }
    const itemEntry = Object.entries(ctx.state.inventory.items).find(([id]) => id === itemId);
    const itemMeta = itemEntry ? itemEntry[1].meta : {};
    const price = itemSellPrice(itemId, itemMeta);
    const result = sellItem(ctx.state, itemId, 1, price, addGold, itemMeta);
    if (result.success) {
      registerProgress(ctx.state, "sell", itemId, 1);
      ctx.log(`Satıldı: ${itemEmoji(itemId)} ${itemDisplayName(itemId)} → +${result.total}🪙`, "trade");
    } else {
      ctx.log(`Satış başarısız: ${reasonText(result.reason)}`, "error");
    }
    render();
  });

  document.getElementById("inventory-grid").addEventListener("dragstart", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    e.dataTransfer.setData("text/plain", cell.dataset.itemId);
  });

  const middleContent = document.getElementById("middle-content");
  middleContent.addEventListener("click", (e) => handlePlotClick(e));
  middleContent.addEventListener("dragover", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) {
      e.preventDefault();
      slot.classList.add("drag-over");
    }
  });
  middleContent.addEventListener("dragleave", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) slot.classList.remove("drag-over");
  });
  middleContent.addEventListener("drop", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) slot.classList.remove("drag-over");
    handlePlotDrop(e);
  });

  document.getElementById("right-panel").addEventListener("click", (e) => handleRightPanelAction(e));
}

function handlePlotClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const kind = btn.dataset.kind;
  const index = Number(btn.dataset.index);
  const action = btn.dataset.action;

  if (action === "harvest") {
    const result = kind === "field" ? harvestSlot(ctx.state, index) : harvestOrchardSlot(ctx.state, index);
    if (result.success) {
      const cropId = result.cropId || result.treeId;
      registerProgress(ctx.state, "sell", cropId, 1);
      ctx.log(`Hasat: ${itemEmoji(cropId)} ${itemDisplayName(cropId)} ${result.rarity !== "normal" ? `(${result.rarity}!)` : ""}`, "success");
    }
  } else if (action === "unlock") {
    const unlockedCount = unlockedCountFn(kind);
    const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount) : orchardSlotUnlockCost(unlockedCount);
    const result = unlockSlot(ctx.state, index, cost, gold, deductGold);
    ctx.log(result.success ? `Slot kilidi açıldı 🔓 ${cost}🪙` : `Kilidi açılamadı: ${reasonText(result.reason)}`, result.success ? "build" : "error");
  } else if (action === "upgradeLevel") {
    const result = kind === "field" ? upgradeFieldSlot(ctx.state, index, deductGold, gold()) : upgradeOrchardSlot(ctx.state, index, deductGold, gold());
    ctx.log(result.success ? `Hız geliştirildi → Lv${result.newLevel} ⚡` : `Geliştirme başarısız: ${reasonText(result.reason)}`, result.success ? "build" : "error");
  } else if (action === "upgradeSeed") {
    const result = kind === "field" ? upgradeFieldSeedSave(ctx.state, index, deductGold, gold()) : upgradeOrchardSeedSave(ctx.state, index, deductGold, gold());
    ctx.log(result.success ? `Tohum koruma geliştirildi → Lv${result.newLevel} 🛡️` : `Geliştirme başarısız: ${reasonText(result.reason)}`, result.success ? "build" : "error");
  }
  render();
}

function handlePlotDrop(e) {
  const slotEl = e.target.closest(".slot");
  if (!slotEl) return;
  e.preventDefault();
  const itemId = e.dataTransfer.getData("text/plain");
  const kind = slotEl.dataset.kind;
  const index = Number(slotEl.dataset.index);

  if (kind === "field" && itemId.endsWith("_tohum")) {
    const cropId = itemId.replace(/_tohum$/, "");
    const result = plantSeed(ctx.state, index, cropId);
    ctx.log(result.success ? `Ekildi: ${itemEmoji(cropId)} ${itemDisplayName(cropId)}` : `Ekilemedi: ${reasonText(result.reason)}`, result.success ? "success" : "error");
  } else if (kind === "orchard" && itemId.endsWith("_fidan")) {
    const treeId = itemId.replace(/_fidan$/, "");
    const result = plantTree(ctx.state, index, treeId);
    ctx.log(result.success ? `Dikildi: ${itemEmoji(treeId)} ${itemDisplayName(treeId)}` : `Dikilemedi: ${reasonText(result.reason)}`, result.success ? "success" : "error");
  } else {
    ctx.log("Bu eşya buraya ekilemez.", "error");
  }
  render();
}

function handleRightPanelAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "buyOne") {
    const index = Number(btn.dataset.index);
    const listing = ctx.state.market.listings[index];
    const isAnimal = listing && listing.category === "animal";
    const result = buyOneSeed(ctx.state, index, deductGold, gold());
    if (result.success) {
      const icon = isAnimal ? listing.emoji : itemEmoji(listing.seedId);
      const label = isAnimal ? listing.label : itemDisplayName(listing.seedId);
      ctx.log(`${icon} Satın alındı: ${label} x1, ${result.cost}🪙`, "trade");
    } else {
      ctx.log(`Alınamadı: ${reasonText(result.reason)}`, "error");
    }
  } else if (action === "buyAll") {
    const index = Number(btn.dataset.index);
    const listing = ctx.state.market.listings[index];
    const isAnimal = listing && listing.category === "animal";
    const result = buyAllSeeds(ctx.state, index, deductGold, gold());
    if (result.success) {
      const icon = isAnimal ? listing.emoji : itemEmoji(listing.seedId);
      const label = isAnimal ? listing.label : itemDisplayName(listing.seedId);
      ctx.log(`${icon} Toplu alım: ${label} x${result.qty}, ${result.cost}🪙 (-${getBulkDiscountPercent()}%)`, "trade");
    } else {
      ctx.log(`Alınamadı: ${reasonText(result.reason)}`, "error");
    }
  } else if (action === "craft") {
    const recipeId = btn.dataset.recipe;
    const times = Number(btn.dataset.times);
    const result = craftRecipe(ctx.state, recipeId, times);
    if (result.success) {
      registerProgress(ctx.state, "produce", result.outputId, result.outputQty);
      ctx.log(`${itemEmoji(result.outputId)} Üretildi: ${itemDisplayName(result.outputId)} x${result.outputQty}${result.firstCraft ? " (tarif öğrenildi ⭐)" : ""}`, "trade");
      if (result.tierUnlocked) {
        ctx.log(`🎉 Tier ${result.unlockedTier} tarifleri açıldı! Yeni tarifler Üretim sekmesinde`, "success");
      }
    } else {
      ctx.log(`Üretilemedi: ${reasonText(result.reason)}`, "error");
    }
  } else if (action === "claimQuest") {
    const questId = btn.dataset.quest;
    const result = claimQuest(ctx.state, questId, addGold);
    if (result.success) {
      ctx.log(`🎯 Görev tamamlandı! +${result.reward.gold}🪙`, "success");
    } else {
      ctx.log(`Görev alınamadı: ${reasonText(result.reason)}`, "error");
    }
  } else {
    handleUpgradeAction(e);
  }
  render();
}

function handleUpgradeAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  let result;

  switch (action) {
    case "upgradeInventory":
      result = upgradeInventorySlots(ctx.state, deductGold, gold());
      if (result.success) ctx.log(`Envanter slotu artırıldı → ${result.newMax} 📦`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeField":
      result = upgradeFieldSlots(ctx.state, deductGold, gold());
      if (result.success) ctx.log(`Tarla slotu artırıldı → ${result.newMax} 🌾`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeOrchard":
      result = upgradeOrchardSlots(ctx.state, deductGold, gold());
      if (result.success) ctx.log(`Bahçe slotu artırıldı → ${result.newMax} 🌳`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketSeed":
      result = upgradeMarketSlots(ctx.state, "seed", deductGold, gold());
      if (result.success) ctx.log(`Tohum slotu artırıldı → ${result.newMax} 🌱`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketSapling":
      result = upgradeMarketSlots(ctx.state, "sapling", deductGold, gold());
      if (result.success) ctx.log(`Fidan slotu artırıldı → ${result.newMax} 🌿`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketAnimal":
      result = upgradeMarketSlots(ctx.state, "animal", deductGold, gold());
      if (result.success) ctx.log(`Hayvan slotu artırıldı → ${result.newMax} 🐄`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeBuildingUpgrade":
      result = upgradeBuildingFromPanel(ctx.state, btn.dataset.building, deductGold, gold());
      if (result.success) ctx.log("Bina geliştirildi 🏗️", "build");
      else ctx.log(`Geliştirilemedi: ${reasonText(result.reason)}`, "error");
      break;
  }
}
