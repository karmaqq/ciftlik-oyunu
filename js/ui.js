// js/ui.js
// DOM render + olay (event) yönetimi. Tüm sistem fonksiyonlarını çağırıp
// state'i değiştirir, ardından render(state) ile ekranı günceller.

import { CROPS, getCrop } from "./data/crops.js";
import { TREES, getTree } from "./data/trees.js";
import { RECIPES } from "./data/recipes.js";
import { BUILDING_TYPES, capacityForLevel, MAX_BUILDING_LEVEL } from "./data/animals.js";
import { itemDisplayName, itemSellPrice, itemEmoji } from "./data/items.js";
import { currentSeason, MONTHS } from "./systems/time.js";
import { getWeather } from "./systems/weather.js";
import { getInventoryList, FILTERS } from "./systems/inventory.js";
import { plantSeed, harvestSlot, fieldUpgradeCost, unlockSlot, removePlant } from "./systems/field.js";
import { plantTree, harvestOrchardSlot, orchardUpgradeCost, removePlant as removePlantOrchard } from "./systems/orchard.js";
import { buildingUpgradeCost } from "./systems/buildings.js";
import { buyOneSeed, buyAllSeeds, sellItem, getBulkDiscountPercent, MARKET_REFRESH_SECONDS } from "./systems/market.js";
import { craftRecipe, canCraft } from "./systems/crafting.js";

import {
  upgradeFieldSlot,
  upgradeOrchardSlot,
  fieldSlotUnlockCost,
  orchardSlotUnlockCost,
  upgradeInventorySlots,
  upgradeFieldSlots,
  upgradeOrchardSlots,
  upgradeMarketSlots,
  upgradeBuildingFromPanel,
  inventorySlotCost,
  marketSlotCost,
  buyFeature,
  FEATURE_COSTS,
  FEATURE_NAMES,
  FEATURE_EMOJIS,
  FEATURE_DESCRIPTIONS,
} from "./systems/upgrades.js";
import {
  FIELD_LEVEL_SPEED_BONUS, MAX_FIELD_LEVEL,
  INVENTORY_TOTAL_SLOTS, FIELD_TOTAL_SLOTS, ORCHARD_TOTAL_SLOTS,
  MAX_MARKET_SLOTS_PER_CATEGORY,
  removeAnimalProduct, getAnimalProductCount,
} from "./state.js";
import { saveGame } from "./systems/save.js";
import { getCalendarTradeInfo } from "./systems/calendarTrade.js";

let ctx = null;
let inventoryFilter = "tümü";
let inventorySort = "isim";
let highlightedRecipes = new Set();
let onNewGame = null;
let hoveredMarketBtn = null;
let quickSellMode = localStorage.getItem("quickSellMode") || "single";

let _dragItemId = null;
let _hoverTimer = null;
let _hoverSlotEl = null;
let _plantedDuringDrag = false;

let _saveDirty = false;
let _saveTimer = null;

function scheduleSave() {
  _saveDirty = true;
  if (!_saveTimer) {
    _saveTimer = setTimeout(() => {
      if (_saveDirty) { saveGame(ctx.state); _saveDirty = false; }
      _saveTimer = null;
    }, 500);
  }
}

function flushSave() {
  if (_saveDirty) { saveGame(ctx.state); _saveDirty = false; }
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
}

function saveQuickSellMode(mode) {
  quickSellMode = mode;
  localStorage.setItem("quickSellMode", mode);
}

export function initUI(state, log, newGameCallback) {
  ctx = { state, log };
  onNewGame = newGameCallback || null;
  wireStaticEvents();

  window.addEventListener("beforeunload", () => flushSave());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });
}

function gold() { return Math.floor(ctx.state.player.gold); }
function deductGold(amount) { ctx.state.player.gold -= Math.floor(amount); }
function addGold(amount) { ctx.state.player.gold += Math.floor(amount); }



function reasonText(r) {
  const map = {
    yetersiz_altin: "Altın yetersiz",
    max_seviye: "Maksimum seviyeye ulaşıldı",
    kapasite_dolu: "Kapasite dolu",
    eksik_malzeme: "Eksik malzeme",
    tarif_yok: "Tarif bulunamadı",
    ekilemez: "Buraya ekilemez",
    hazir_degil: "Hasat için hazır değil",
    zaten_acik: "Bu özellik zaten satın alındı",
    tukendi: "Stok tükendi",
    gecersiz_liste: "Geçersiz ürün",
    yetersiz_urun: "Envanterde yeterli ürün yok",
    tamamlanmadi: "Görev henüz tamamlanmadı",
    gorev_yok: "Görev bulunamadı",
    yetersiz_miktar: "Yeterli miktar yok",
    hava_kaynakli_basarisizlik: "Hava koşulları başarısızlığa neden oldu",
    hava_kaynakli_ticaret_kaybi: "Hava koşulları ticaret kaybına neden oldu",
    envanter_dolu: "Envanter dolu! Slot boşalmasını bekle.",
    kilitli: "Bu tier henüz açılmadı",
    bina_yetersiz_seviye: "Bina seviyesi yetersiz",
    bina_kilitli: "Bu bina henüz satın alınmadı",
    gecersiz_ozellik: "Geçersiz özellik",
  };
  return map[r] || r;
}

function seasonEmoji(s) {
  const map = { ilkbahar: "🌸", yaz: "☀️", sonbahar: "🍂", kış: "❄️" };
  return map[s] || "";
}

function weatherEmoji(w) {
  const map = { normal: "🌤️", yagmurlu: "🌧️", kurak: "🔥", firtina: "⛈️", gokkusagi: "🌈" };
  return map[w.id] || "🌤️";
}

function highlightRecipes(itemId, highlight) {
  highlightedRecipes.clear();
  if (highlight && itemId) {
    RECIPES.forEach((r) => {
      if (r.inputs.some((inp) => inp.id === itemId)) {
        highlightedRecipes.add(r.id);
      }
    });
  }
  document.querySelectorAll(".recipe-card").forEach((card) => {
    const recipeId = card.dataset.recipeId;
    if (highlightedRecipes.has(recipeId)) {
      card.classList.add("highlight");
    } else {
      card.classList.remove("highlight");
    }
  });
}



// ---------------------------------------------------------------------------
// ANA RENDER
// ---------------------------------------------------------------------------
export function render() {
  renderHeader();
  renderInventory();
  syncFeatureTabs();
  const middleTab = ctx.state.ui.activeMiddleTab;
  document.getElementById("middle-content").innerHTML = middleTab === "field" ? fieldGridHTML() : orchardGridHTML();
  renderBuildingTab();
  const rightTab = ctx.state.ui.activeRightTab;
  const rightEl = document.getElementById("right-content");
  if (rightTab === "market") rightEl.innerHTML = marketHTML();
  else if (rightTab === "crafting") rightEl.innerHTML = craftingHTML();
  else if (rightTab === "upgrades") renderUpgrades();

  syncTabButtons();
  checkLabelOverflow();
  _lastRenderedMiddleTab = middleTab;
  _lastRenderedRightTab = rightTab;
}

let _lastRenderedMiddleTab = "";
let _lastRenderedRightTab = "";
let _prevMarketSeconds = -1;

/** Feature durumuna göre sekmeleri gizler/gösterir. */
function syncFeatureTabs() {
  const features = ctx.state.features || {};

  // Orta panel: Bahçe sekmesi
  const orchardBtn = document.querySelector('#middle-tabs button[data-tab="orchard"]');
  if (orchardBtn) {
    orchardBtn.style.display = features.orchard ? "" : "none";
    // Bahçe sekmesindeyken bahçe kapalıysa tarla'ya geç
    if (!features.orchard && ctx.state.ui.activeMiddleTab === "orchard") {
      ctx.state.ui.activeMiddleTab = "field";
    }
  }

  // Orta panel alt: Bina sekmeleri
  const hiveBtn = document.querySelector('#building-tabs button[data-tab="hive"]');
  const coopBtn = document.querySelector('#building-tabs button[data-tab="coop"]');
  const barnBtn = document.querySelector('#building-tabs button[data-tab="barn"]');
  if (hiveBtn) hiveBtn.style.display = features.hive ? "" : "none";
  if (coopBtn) coopBtn.style.display = features.coop ? "" : "none";
  if (barnBtn) barnBtn.style.display = features.barn ? "" : "none";

  // Aktif bina sekmesi gizliyse ilk görünür olana geç
  if (!features[ctx.state.ui.activeBuildingTab]) {
    if (features.hive) ctx.state.ui.activeBuildingTab = "hive";
    else if (features.coop) ctx.state.ui.activeBuildingTab = "coop";
    else if (features.barn) ctx.state.ui.activeBuildingTab = "barn";
  }

  // Tüm binalar gizliyken bina panelini de gizle
  const buildingSection = document.querySelector("#middle-panel .panel-bottom");
  const anyBuilding = features.hive || features.coop || features.barn;
  if (buildingSection) {
    buildingSection.style.display = anyBuilding ? "" : "none";
  }

  // Sol panel: Hızlı satış
  const quickSellZone = document.getElementById("quick-sell-zone");
  const sellTabs = document.getElementById("sell-tabs");
  if (quickSellZone) quickSellZone.style.display = features.quickSell ? "" : "none";
  if (sellTabs) sellTabs.style.display = features.quickSell ? "" : "none";

  // Sol panel boyutu: Hızlı satış yokken üst kısım tam alanı kaplasın
  const inventoryPanel = document.getElementById("inventory-panel");
  if (inventoryPanel) {
    inventoryPanel.classList.toggle("no-quick-sell", !features.quickSell);
  }

  // Orta panel boyutu: Bina yokken üst kısım tam alanı kaplasın
  const middlePanel = document.getElementById("middle-panel");
  if (middlePanel) {
    middlePanel.classList.toggle("no-buildings", !anyBuilding);
  }
}

export function tickUpdate() {
  const s = ctx.state;

  // Header: sadece dinamik değerleri güncelle
  updateHeaderTick();

  // Envanter: her tick'ta güncelle
  renderInventory();

  // Feature sekmelerini senkronize et (sekmeleri gizle/göster)
  syncFeatureTabs();

  // Orta panel slotlarını güncelle (progress bar, ready durumu)
  const middleTab = s.ui.activeMiddleTab;
  if (middleTab === "field" || middleTab === "orchard") {
    updateSlotsTick(middleTab);
  }

  // Bina sekmesi sadece aktifken güncellenmeli (üretim sayaçları yavaş değişir)
  renderBuildingTab();

  // Market yenilendiyse sağ paneli yeniden render et
  const rightTab = s.ui.activeRightTab;
  if (rightTab === "market") {
    const cur = s.market.secondsSinceRefresh;
    if (_prevMarketSeconds > cur) {
      document.getElementById("right-content").innerHTML = marketHTML();
      checkLabelOverflow();
    }
    _prevMarketSeconds = cur;
  }

  // Label overflow kontrolü (zaten rAF ile debounce edilmiş)
  checkLabelOverflow();
}

function updateHeaderTick() {
  const s = ctx.state;
  const hdrEl = document.getElementById("header");
  if (!hdrEl) return;

  // Kuyruk durumu değiştiyse header'ı tam yeniden render et
  const currentQueueCount = s.inventory.queue.length;
  const queueEl = hdrEl.querySelector(".hdr-queue-count");
  if ((currentQueueCount > 0 && !queueEl) || (currentQueueCount === 0 && queueEl)) {
    renderHeader();
    return;
  }

  // Altın
  const goldEl = hdrEl.querySelector(".hdr-gold-val");
  if (goldEl) goldEl.textContent = gold().toLocaleString("tr-TR");

  // Zaman bilgisi (sadece takvim açıksa)
  const calendarActive = s.features && s.features.calendar;
  const timeEl = hdrEl.querySelector(".hdr-time-info");
  if (timeEl && calendarActive) {
    const season = currentSeason(s.time);
    const monthName = MONTHS[s.time.month].name;
    const weather = getWeather(s.weather);
    const weatherEmojiStr = weatherEmoji(weather);
    timeEl.textContent = `Yıl ${s.time.year} · ${season.charAt(0).toUpperCase() + season.slice(1)} · ${s.time.day} ${monthName} ${weatherEmojiStr} ${weather.name}`;
  }

  // Market geri sayımı
  const marketEl = hdrEl.querySelector(".hdr-market-timer");
  if (marketEl) {
    const marketSeconds = Math.max(0, MARKET_REFRESH_SECONDS - Math.round(s.market.secondsSinceRefresh));
    marketEl.textContent = `🏪 Market: ${marketSeconds}s`;
  }

  // Kuyruk sayacı
  if (queueEl) {
    queueEl.textContent = `📦 ${currentQueueCount}`;
  }
}

function updateSlotsTick(kind) {
  const slots = kind === "field" ? ctx.state.field.slots : ctx.state.orchard.slots;
  const dataset = kind === "field" ? CROPS : TREES;
  const slotEls = document.querySelectorAll(`.slot[data-kind="${kind}"]`);

  slotEls.forEach((slotEl) => {
    const index = Number(slotEl.dataset.index);
    const slot = slots[index];
    if (!slot || !slot.planted) return;

    const pct = Math.min(100, Math.round((slot.planted.elapsedSeconds / slot.planted.requiredSeconds) * 100));
    const ready = slot.planted.ready;

    // Progress bar güncelle
    const progressFill = slotEl.querySelector(".progress-fill");
    if (progressFill) {
      progressFill.style.width = `${pct}%`;
    }

    // Progress bar görünürlüğü (hazır olunca gizle)
    const progressEl = slotEl.querySelector(".progress");
    if (progressEl) {
      progressEl.style.display = ready ? "none" : "";
    }

    // Ready durumu class güncellemesi
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

let _overflowRafId = 0;

function checkLabelOverflow() {
  if (_overflowRafId) cancelAnimationFrame(_overflowRafId);
  _overflowRafId = requestAnimationFrame(() => {
    _overflowRafId = 0;
    const els = document.querySelectorAll(".label, .slot-name");
    const measurements = [];
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const text = el.querySelector(".label-text");
      if (!text) continue;
      measurements.push({ el, text, scrollW: text.scrollWidth, clientW: el.clientWidth });
    }
    for (let i = 0; i < measurements.length; i++) {
      const { el, scrollW, clientW } = measurements[i];
      el.classList.remove("is-overflow");
      if (scrollW > clientW + 2) {
        el.classList.add("is-overflow");
        const dist = scrollW - clientW;
        const dur = Math.max(3, dist / 30);
        el.style.setProperty("--scroll-dist", `-${dist + 10}px`);
        el.style.setProperty("--scroll-dur", `${dur}s`);
      }
    }
  });
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
    ctx.log("Tohum satın aldın! Envanterden tarlaya sürükleyerek ekebilirsin.", "info");
  }

  if (hint(h, "first_sut") && items.sut) {
    ctx.log("Bu sütü peynire dönüştürebilirsin! Üretim sekmesine git.", "info");
  }

  if (hint(h, "first_maya") && items.maya) {
    ctx.log("Maya ekmek yapımında kullanılır. Buğday da lazım!", "info");
  }

  if (hint(h, "first_ekmek") && items.ekmek) {
    ctx.log("Ekmeği hamburgerde kullanabilirsin! İnek eti gerekli.", "info");
  }

  if (hint(h, "first_cikolata") && items.cikolata) {
    ctx.log("Çikolatayı fındık ezmesiyle birleştirerek fındık çikolatası yapabilirsin!", "info");
  }

  const season = currentSeason(s.time);
  if (season === "ilkbahar" && hint(h, "season_ilkbahar")) {
    ctx.log("İlkbahar başladı! Yeni ürünler: çilek, ahududu, nohut", "info");
  }
  if (season === "yaz" && hint(h, "season_yaz")) {
    ctx.log("Yaz başladı! Tropik meyveler ve domates için ideal zaman.", "info");
  }
  if (season === "sonbahar" && hint(h, "season_sonbahar")) {
    ctx.log("Sonbahar başladı! Nar, incir ve bal kabağı hasadı zamanı.", "info");
  }
  if (season === "kış" && hint(h, "season_kis")) {
    ctx.log("Kış başladı! Narenciye ve serada yetişen ürünler öne çıkıyor.", "info");
  }

  if (s.unlockedTiers.length >= 2 && hint(h, "tier2_open")) {
    ctx.log("Tier 2 tarifleri açıldı! Yeni tarifler Üretim sekmesinde.", "info");
  }
  if (s.unlockedTiers.length >= 3 && hint(h, "tier3_open")) {
    ctx.log("Tier 3 tarifleri açıldı! Güveç, mantı ve daha fazlası!", "info");
  }
  if (s.unlockedTiers.length >= 4 && hint(h, "tier4_open")) {
    ctx.log("Tier 4 tarifleri açıldı! Şef'in Özel Menüsü ve Tatlı Tabağı!", "info");
  }
}

// ---------------------------------------------------------------------------
// HEADER
// ---------------------------------------------------------------------------
function renderHeader() {
  const weather = getWeather(ctx.state.weather);
  const season = currentSeason(ctx.state.time);
  const seasonEmojiStr = seasonEmoji(season);
  const weatherEmojiStr = weatherEmoji(weather);
  const monthName = MONTHS[ctx.state.time.month].name;
  const calendarActive = ctx.state.features && ctx.state.features.calendar;

  // Takvim ticaret bilgisi
  const calendarInfo = getCalendarTradeInfo(ctx.state);

  const seasonEffect = {
    ilkbahar: "Çilek, ahududu, nohut gibi ürünler yetişir.",
    yaz: "Tropik meyveler ve domates için uygun mevsim.",
    sonbahar: "Nar, incir, bal kabağı hasat zamanı.",
    kış: "Narenciye ve serada yetişen ürünler öne çıkar.",
  };

  const marketSeconds = Math.max(0, MARKET_REFRESH_SECONDS - Math.round(ctx.state.market.secondsSinceRefresh));

  const queueCount = ctx.state.inventory.queue.length;

  // Takvim gizliyken zaman bilgisini gösterme
  const timeInfoHtml = calendarActive
    ? `<div class="hdr-item"><span class="hdr-time-info">Yıl ${ctx.state.time.year} · ${season.charAt(0).toUpperCase() + season.slice(1)} · ${ctx.state.time.day} ${monthName} ${weatherEmojiStr} ${weather.name}</span></div>`
    : "";

  document.getElementById("header").innerHTML = `
    <div class="hdr-item">🪙 <b class="hdr-gold-val">${gold().toLocaleString("tr-TR")}</b></div>
    ${timeInfoHtml}
    <div class="hdr-item" style="margin-left:auto"><span class="hdr-market-timer">🏪 Market: ${marketSeconds}s</span></div>
    ${queueCount > 0 ? `<div class="hdr-item hdr-queue"><span class="hdr-queue-count">📦 ${queueCount}</span></div>` : ""}
    <div class="hdr-item"><button class="new-game-btn" id="new-game-btn">🔄 Yeni Oyun</button></div>
  `;

  const ngBtn = document.getElementById("new-game-btn");
  if (ngBtn) {
    ngBtn.addEventListener("click", () => {
      if (onNewGame) onNewGame();
    });
  }
}

// ---------------------------------------------------------------------------
// ENVANTER
// ---------------------------------------------------------------------------
function renderInventory() {
  const filtersEl = document.getElementById("inventory-filters");
  const isActive = inventorySort === "deger";
  filtersEl.innerHTML =
    `<button class="hamburger-btn${isActive ? " active" : ""}" data-action="sortByValue"><span></span><span></span><span></span></button>` +
    FILTERS.map((f) => `<button data-filter="${f}">${f.charAt(0).toUpperCase() + f.slice(1)}</button>`).join("");

  const list = getInventoryList(ctx.state, { filter: inventoryFilter, sortBy: inventorySort });
  const grid = document.getElementById("inventory-grid");
  const cells = [];
  const maxSlots = ctx.state.inventory.maxSlots;
  for (let i = 0; i < maxSlots; i++) {
    const entry = list[i];
    if (!entry) { cells.push(`<div class="cell empty"></div>`); continue; }
    const name = itemDisplayName(entry.itemId);

    cells.push(`
      <div class="cell item ${entry.category}" draggable="true" data-item-id="${entry.itemId}">
        <span class="cell-emoji">${itemEmoji(entry.itemId)}</span>
        <span class="qty">${entry.quantity}</span>
        <span class="label"><span class="label-text">${name}</span></span>
      </div>
    `);
  }
  grid.innerHTML = cells.join("");

  // Hızlı satış sadece feature açıkken çalışır
  const quickSellZone = document.getElementById("quick-sell-zone");
  if (quickSellZone && ctx.state.features && ctx.state.features.quickSell) {
    quickSellZone.innerHTML = `<div class="quick-sell-content"><small>Sürükle, bırak ve sat</small></div>`;
  }

  document.querySelectorAll("#sell-tabs button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sellMode === quickSellMode);
  });
}

function abbreviate(name) {
  return name.length > 10 ? name.slice(0, 9) + "…" : name;
}

function affordClass(cost, maxed) {
  if (maxed) return "";
  return gold() < cost ? " insufficient-gold" : "";
}

function renderUpgradeRow({ emoji, label, current, max, cost, maxed, action }) {
  return `
    <div class="upgrade-row">
      <div class="upgrade-info">
        <span class="upgrade-label">${emoji} ${label}</span>
        <span class="upgrade-status">${current}/${max}</span>
      </div>
      <button class="upgrade-btn${affordClass(cost, maxed)}" data-action="${action}" ${maxed ? "disabled" : ""}>
        ${maxed ? "Max" : `${cost}🪙`}
      </button>
    </div>
  `;
}

function renderFeatureRow(featureId, cost) {
  const name = FEATURE_NAMES[featureId] || featureId;
  const emoji = FEATURE_EMOJIS[featureId] || "🔓";
  const desc = FEATURE_DESCRIPTIONS[featureId] || "";

  return `
    <div class="upgrade-row feature-row">
      <div class="upgrade-info">
        <span class="upgrade-label">${emoji} ${name}</span>
        <span class="upgrade-status">${desc}</span>
      </div>
      <button class="upgrade-btn${affordClass(cost, false)}" data-action="buyFeature" data-feature="${featureId}">
        ${cost}🪙
      </button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// GELİŞTİRME PANELİ
// ---------------------------------------------------------------------------
function renderUpgrades() {
  const state = ctx.state;
  const fieldUnlocked = state.field.slots.filter((s) => s.unlocked).length;
  const orchardUnlocked = state.orchard.slots.filter((s) => s.unlocked).length;
  const features = state.features || {};

  const sections = [];

  // Özellikler (Satın Alınmamışlar)
  const featureRows = [];
  for (const [featureId, cost] of Object.entries(FEATURE_COSTS)) {
    if (!features[featureId]) {
      featureRows.push(renderFeatureRow(featureId, cost));
    }
  }
  if (featureRows.length > 0) {
    sections.push(`
      <div class="upgrade-section">
        <h4>🔓 Özellikler</h4>
        ${featureRows.join("")}
      </div>
    `);
  }

  // Slot Geliştirmeleri
  sections.push(`
    <div class="upgrade-section">
      <h4>📦 Slot Geliştirmeleri</h4>
      ${renderUpgradeRow({ emoji: "📦", label: "Envanter Slotu", current: state.inventory.maxSlots, max: INVENTORY_TOTAL_SLOTS, cost: inventorySlotCost(state.inventory.maxSlots), maxed: state.inventory.maxSlots >= INVENTORY_TOTAL_SLOTS, action: "upgradeInventory" })}
      ${renderUpgradeRow({ emoji: "🌾", label: "Tarla Slotu", current: fieldUnlocked, max: FIELD_TOTAL_SLOTS, cost: fieldSlotUnlockCost(fieldUnlocked), maxed: fieldUnlocked >= FIELD_TOTAL_SLOTS, action: "upgradeField" })}
      ${features.orchard ? renderUpgradeRow({ emoji: "🌳", label: "Bahçe Slotu", current: orchardUnlocked, max: ORCHARD_TOTAL_SLOTS, cost: orchardSlotUnlockCost(orchardUnlocked), maxed: orchardUnlocked >= ORCHARD_TOTAL_SLOTS, action: "upgradeOrchard" }) : ""}
    </div>
  `);

  // Market Slotları
  const seedMaxed = state.market.seedSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;
  const saplingMaxed = state.market.saplingSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;
  const animalMaxed = state.market.animalSlots >= MAX_MARKET_SLOTS_PER_CATEGORY;

  sections.push(`
    <div class="upgrade-section">
      <h4>🏪 Market Slotları</h4>
      ${renderUpgradeRow({ emoji: "🌱", label: "Tohum Slotları", current: state.market.seedSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY, cost: marketSlotCost("seed", state.market.seedSlots), maxed: seedMaxed, action: "upgradeMarketSeed" })}
      ${features.orchard ? renderUpgradeRow({ emoji: "🌿", label: "Fidan Slotları", current: state.market.saplingSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY, cost: marketSlotCost("sapling", state.market.saplingSlots), maxed: saplingMaxed, action: "upgradeMarketSapling" }) : ""}
      ${renderUpgradeRow({ emoji: "🐄", label: "Hayvan Slotları", current: state.market.animalSlots, max: MAX_MARKET_SLOTS_PER_CATEGORY, cost: marketSlotCost("animal", state.market.animalSlots), maxed: animalMaxed, action: "upgradeMarketAnimal" })}
    </div>
  `);

  // Binalar (sadece satın alınmış olanlar)
  const buildingRows = [];
  if (features.hive) buildingRows.push(renderBuildingUpgradeRow("hive"));
  if (features.coop) buildingRows.push(renderBuildingUpgradeRow("coop"));
  if (features.barn) buildingRows.push(renderBuildingUpgradeRow("barn"));
  if (buildingRows.length > 0) {
    sections.push(`
      <div class="upgrade-section">
        <h4>🏗️ Binalar</h4>
        ${buildingRows.join("")}
      </div>
    `);
  }

  const rightEl = document.getElementById("right-content");
  rightEl.innerHTML = `<div class="upgrades-grid">${sections.join("")}</div>`;
}

function renderBuildingUpgradeRow(type) {
  const def = BUILDING_TYPES[type];
  const building = ctx.state.buildings[type];
  const capacity = capacityForLevel(type, building.level);
  const maxed = building.level >= MAX_BUILDING_LEVEL;
  const upgradeCostVal = buildingUpgradeCost(building.level, type);

  return `
    <div class="building-upgrade-row">
      <div class="upgrade-info">
        <span class="upgrade-label">${def.name}</span>
        <span class="upgrade-status">${def.animalName}: ${building.population}/${capacity}</span>
      </div>
      <div class="building-upgrade-actions">
        <button class="upgrade-btn${gold() < upgradeCostVal && !maxed ? " insufficient-gold" : ""}" data-action="upgradeBuildingUpgrade" data-building="${type}" ${maxed ? "disabled" : ""}>
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
    return `<div class="slot locked" data-kind="${kind}" data-index="${index}" data-action="unlock">
      <div class="slot-inner">🔒</div>
      <div class="slot-name">${cost}🪙</div>
    </div>`;
  }

  if (!slot.planted) {
    return `<div class="slot empty-plantable" data-kind="${kind}" data-index="${index}">
      ${upgradeButtonsHTML(slot, index, kind)}
      <div class="slot-inner">＋</div>
    </div>`;
  }

  const def = dataset.find((d) => d.id === slot.planted.cropId);
  const pct = Math.min(100, Math.round((slot.planted.elapsedSeconds / slot.planted.requiredSeconds) * 100));
  const ready = slot.planted.ready;
  const baseEmoji = itemEmoji(def ? def.id : slot.planted.cropId);

  return `<div class="slot ${ready ? "ready" : "growing"}" data-kind="${kind}" data-index="${index}" data-action="${ready ? "harvest" : ""}">
    ${upgradeButtonsHTML(slot, index, kind)}
    <div class="slot-inner">${baseEmoji}</div>
    ${ready ? "" : `<div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>`}
    <button class="remove-btn" data-kind="${kind}" data-index="${index}" data-action="removePlant" title="Sök">🗑️</button>
  </div>`;
}

function upgradeButtonsHTML(slot, index, kind) {
  const lvlMaxed = slot.level >= MAX_FIELD_LEVEL;
  const speedCost = kind === "field" ? fieldUpgradeCost(slot.level) : orchardUpgradeCost(slot.level);

  return `<div class="slot-upgrades">
    <button class="mini-btn${gold() < speedCost && !lvlMaxed ? " insufficient-gold" : ""}" data-kind="${kind}" data-index="${index}" data-action="upgradeLevel" ${lvlMaxed ? "disabled" : ""}><svg class="upgrade-icon" viewBox="0 0 12 12" width="18" height="18"><path d="M6 2 L10 7 L8 7 L8 10 L4 10 L4 7 L2 7 Z" fill="currentColor"/></svg>${slot.level}</button>
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

  const storedProducts = [];
  for (const [productId, qty] of Object.entries(building.stored)) {
    if (qty > 0) {
      const name = itemDisplayName(productId);
      storedProducts.push(
        `<div class="building-product-cell" draggable="true" data-product-id="${productId}" data-source="building">
          <span class="building-product-emoji">${itemEmoji(productId)}</span>
          <span class="building-product-qty">${qty}</span>
        </div>`
      );
    }
  }

  document.getElementById("building-content").innerHTML = `
    <div class="building-panel">
      <div class="building-panel-info">
        <h3>Seviye ${building.level}</h3>
        <p>${def.animalName}: ${building.population} / ${capacity}</p>
        <p>${building.population > 0 ? `${def.baseProductionDays} günde ${building.population} ${itemDisplayName(def.productId)}` : "Hayvan yok"}</p>
      </div>
      <div class="building-panel-products">
        ${storedProducts.length > 0 ? storedProducts.join("") : '<span class="building-product-empty">Henüz ürün yok</span>'}
      </div>
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

      const calendarActive = ctx.state.features && ctx.state.features.calendar;

      // Tüm kategoriler için fiyat farkı renkli gösterimi
      let priceTag = "";
      let diffTag = "";
      if (calendarActive && listing.basePrice > 0) {
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
      } else if (listing.basePrice > 0) {
        priceTag = `<span class="mr-price-tag" style="color:var(--text-secondary)">${unitPrice}🪙</span>`;
      } else {
        priceTag = `<span class="mr-price-tag" style="color:#e6c520">0🪙</span>`;
      }

      const diff = unitPrice - listing.basePrice;

      const soldOutClass = soldOut ? " sold-out" : "";
      const icon = isAnimal ? listing.emoji : itemEmoji(listing.seedId);

      let categoryHeader = "";
      if (listing.category !== lastCategory) {
        lastCategory = listing.category;
        categoryHeader = `<div class="market-category-header">${typeLabel}</div>`;
      }

      const buyDisabled = gold() < unitPrice || capacityFull;
      const bulkCost = isAnimal ? 0 : Math.round(unitPrice * listing.remaining * (1 - discountPct / 100));

      function btnClass(idx, action, cost) {
        let cls = hoveredMarketBtn === `${idx}-${action}` ? "mr-btn show-price" : "mr-btn";
        if (gold() < cost || capacityFull) cls += " insufficient-gold";
        return cls;
      }

      // Hayvanlar: sadece 1x butonu
      if (isAnimal) {
        return `${categoryHeader}<div class="market-row${soldOutClass}">
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
                <button class="${btnClass(i, "buyOne", unitPrice)}" data-action="buyOne" data-index="${i}" ${buyDisabled ? "disabled" : ""}><span class="btn-label">1x</span><span class="btn-price">${unitPrice}</span></button>
              </div>`
          }
        </div>`;
      }

      // Tohum/Fidan: 1x + toplu alım
      return `${categoryHeader}<div class="market-row${soldOutClass}">
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
              <button class="${btnClass(i, "buyOne", unitPrice)}" data-action="buyOne" data-index="${i}" ${buyDisabled ? "disabled" : ""}><span class="btn-label">1x</span><span class="btn-price">${unitPrice}</span></button>
              <button class="${btnClass(i, "buyAll", bulkCost)}" data-action="buyAll" data-index="${i}" ${buyDisabled ? "disabled" : ""}><span class="btn-label">${listing.remaining}x</span><span class="btn-price">${bulkCost}</span></button>
            </div>`
        }
      </div>`;
    })
    .join("");

  return `
    <div class="market-list">${rows || "<p>Yükleniyor…</p>"}</div>
    <div class="market-info">Toplu alımda %${discountPct} indirim Uygulanır..</div>
  `;
}

// ---------------------------------------------------------------------------
// ÜRETİM (CRAFTING)
// ---------------------------------------------------------------------------
function craftingHTML() {
  const tiers = [1, 2, 3, 4];
  const tierNames = { 1: "Basit", 2: "Orta", 3: "İleri", 4: "Uzman" };

  let html = '<div class="panel-header">Üretim</div><div class="recipe-grid">';

  tiers.forEach((tier) => {
    const tierRecipes = RECIPES.filter((r) => r.tier === tier);
    if (tierRecipes.length === 0) return;

    html += `<div class="recipe-tier-header">Tier ${tier} — ${tierNames[tier]}</div>`;

    tierRecipes.forEach((r) => {
      const learned = ctx.state.recipes[r.id].learned;
      const craftable = canCraft(ctx.state, r.id, 1);

      let maxQty = 0;
      while (canCraft(ctx.state, r.id, maxQty + 1)) maxQty++;

      const outputPrice = itemSellPrice(r.output.id, {});
      const profit = outputPrice - r.inputs.reduce((sum, inp) => sum + itemSellPrice(inp.id, {}) * inp.qty, 0);

      const profitStr = profit >= 0 ? `+${profit}` : `${profit}`;

      const tierClass = `recipe-tier-${r.tier}`;

      html += `<div class="recipe-card ${craftable ? "" : "faded"} ${tierClass}" data-recipe-id="${r.id}">
        <div class="recipe-title">${itemEmoji(r.output.id)} ${r.name} ${learned ? "⭐" : ""}</div>
        <div class="recipe-actions">
          <button data-action="craft" data-recipe="${r.id}" data-times="1" ${craftable ? "" : "disabled"}>Üret</button>
          ${learned && maxQty > 1 ? `<button data-action="craft" data-recipe="${r.id}" data-times="${maxQty}" ${maxQty > 0 ? "" : "disabled"}>${maxQty}x</button>` : ""}
        </div>
      </div>`;
    });
  });

  html += '</div>';
  return html;
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
  });

  document.getElementById("inventory-grid").addEventListener("mouseover", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    const itemId = cell.dataset.itemId;
    if (!itemId) return;
    const baseId = itemId.replace(/_tohum$/, "").replace(/_fidan$/, "");
    highlightRecipes(baseId, true);
  });

  document.getElementById("inventory-grid").addEventListener("mouseout", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    highlightRecipes(null, false);
  });

  document.getElementById("inventory-grid").addEventListener("dragstart", (e) => {
    const cell = e.target.closest(".cell.item");
    if (!cell) return;
    _dragItemId = cell.dataset.itemId;
    _plantedDuringDrag = false;
    e.dataTransfer.setData("text/plain", cell.dataset.itemId);
    e.dataTransfer.setData("application/x-source", "inventory");
  });

  document.getElementById("building-content").addEventListener("dragstart", (e) => {
    const cell = e.target.closest(".building-product-cell");
    if (!cell) return;
    _dragItemId = cell.dataset.productId;
    _plantedDuringDrag = false;
    e.dataTransfer.setData("text/plain", cell.dataset.productId);
    e.dataTransfer.setData("application/x-source", "building");
  });

  const middleContent = document.getElementById("middle-content");
  middleContent.addEventListener("click", (e) => handlePlotClick(e));
  middleContent.addEventListener("dragover", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) {
      e.preventDefault();
      slot.classList.add("drag-over");
    }
    if (!_dragItemId) return;
    if (!slot) return;
    const kind = slot.dataset.kind;
    const valid = (kind === "field" && _dragItemId.endsWith("_tohum")) ||
                  (kind === "orchard" && _dragItemId.endsWith("_fidan"));
    if (!valid) return;
    if (slot === _hoverSlotEl && _hoverTimer) return;
    clearTimeout(_hoverTimer);
    _hoverTimer = null;
    _hoverSlotEl = slot;
    _hoverTimer = setTimeout(() => {
      _hoverTimer = null;
      _hoverSlotEl = null;
      if (plantOnSlot(slot, _dragItemId)) {
        _plantedDuringDrag = true;
        scheduleSave();
        render();
      }
    }, 200);
  });
  middleContent.addEventListener("dragleave", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) slot.classList.remove("drag-over");
    if (slot && slot === _hoverSlotEl) {
      clearTimeout(_hoverTimer);
      _hoverTimer = null;
      _hoverSlotEl = null;
    }
  });
  middleContent.addEventListener("drop", (e) => {
    const slot = e.target.closest(".slot");
    if (slot) slot.classList.remove("drag-over");
    handlePlotDrop(e);
  });

  document.addEventListener("dragend", () => {
    _dragItemId = null;
    _plantedDuringDrag = false;
    clearTimeout(_hoverTimer);
    _hoverTimer = null;
    _hoverSlotEl = null;
  });

  document.getElementById("right-panel").addEventListener("click", (e) => handleRightPanelAction(e));

  document.getElementById("right-panel").addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".mr-btn[data-action]");
    if (!btn) return;
    const idx = btn.dataset.index;
    const act = btn.dataset.action;
    hoveredMarketBtn = `${idx}-${act}`;
  });

  document.getElementById("right-panel").addEventListener("mouseout", (e) => {
    const btn = e.target.closest(".mr-btn[data-action]");
    if (!btn) return;
    const related = e.relatedTarget;
    if (!related || !btn.contains(related)) {
      hoveredMarketBtn = null;
    }
  });

  document.getElementById("sell-tabs").addEventListener("click", (e) => {
    const modeBtn = e.target.closest("[data-sell-mode]");
    if (modeBtn) {
      saveQuickSellMode(modeBtn.dataset.sellMode);
      render();
    }
  });

  const quickSellZone = document.getElementById("quick-sell-zone");
  if (quickSellZone && ctx.state.features && ctx.state.features.quickSell) {
    quickSellZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      quickSellZone.classList.add("drag-over");
    });
    quickSellZone.addEventListener("dragleave", () => {
      quickSellZone.classList.remove("drag-over");
    });
    quickSellZone.addEventListener("drop", (e) => {
      e.preventDefault();
      quickSellZone.classList.remove("drag-over");
      const itemId = e.dataTransfer.getData("text/plain");
      if (!itemId) return;
      const source = e.dataTransfer.getData("application/x-source") || "inventory";

      if (source === "building") {
        const available = getAnimalProductCount(ctx.state, itemId);
        if (available <= 0) return;
        const qty = quickSellMode === "bulk" ? available : 1;
        const price = itemSellPrice(itemId);
        removeAnimalProduct(ctx.state, itemId, qty);
        const total = price * qty;
        addGold(total);
        ctx.log(`${itemEmoji(itemId)} ${qty} adet ${itemDisplayName(itemId)} satıldı, +${total}🪙`, "trade");
      } else {
        const itemEntry = ctx.state.inventory.items[itemId];
        if (!itemEntry) return;
        const itemMeta = itemEntry.meta || {};
        const fullQty = itemEntry.quantity;
        const qty = quickSellMode === "bulk" ? fullQty : 1;
        const price = itemSellPrice(itemId, itemMeta);
        const result = sellItem(ctx.state, itemId, qty, price, addGold, itemMeta);
        if (result.success) {
          ctx.log(`${itemEmoji(itemId)} ${qty} adet ${itemDisplayName(itemId)} satıldı, +${result.total}🪙`, "trade");
        } else {
          ctx.log(`Satış başarısız: ${reasonText(result.reason)}`, "error");
        }
      }
      scheduleSave();
      render();
    });
  }
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
      ctx.log(`Hasat: ${itemEmoji(cropId)} ${itemDisplayName(cropId)}${result.rarity !== "normal" ? ` (${result.rarity}!)` : ""}`, "success");
    }
  } else if (action === "unlock") {
    const unlockedCount = unlockedCountFn(kind);
    const cost = kind === "field" ? fieldSlotUnlockCost(unlockedCount) : orchardSlotUnlockCost(unlockedCount);
    const result = unlockSlot(ctx.state, index, cost, gold, deductGold);
    ctx.log(result.success ? `Slot kilidi açıldı, ${cost}🪙` : `Kilidi açılamadı: ${reasonText(result.reason)}`, result.success ? "build" : "error");
  } else if (action === "upgradeLevel") {
    const result = kind === "field" ? upgradeFieldSlot(ctx.state, index, deductGold, gold()) : upgradeOrchardSlot(ctx.state, index, deductGold, gold());
    ctx.log(result.success ? `Hız geliştirildi → Lv${result.newLevel}` : `Geliştirme başarısız: ${reasonText(result.reason)}`, result.success ? "build" : "error");
  } else if (action === "removePlant") {
    const result = kind === "field" ? removePlant(ctx.state, index) : removePlantOrchard(ctx.state, index);
    ctx.log(result.success ? "Bitki söküldü" : `Sökülemedi: ${reasonText(result.reason)}`, result.success ? "info" : "error");
  }
  scheduleSave();
  render();
}

function plantOnSlot(slotEl, itemId) {
  const kind = slotEl.dataset.kind;
  const index = Number(slotEl.dataset.index);

  if (kind === "field" && itemId.endsWith("_tohum")) {
    const cropId = itemId.replace(/_tohum$/, "");
    const result = plantSeed(ctx.state, index, cropId);
    const mergeKey = result.success ? `plant-${cropId}` : null;
    ctx.log(result.success ? `Ekildi: ${itemEmoji(cropId)} ${itemDisplayName(cropId)} 1 adet` : `Ekilemedi: ${reasonText(result.reason)}`, result.success ? "success" : "error", mergeKey);
    return result.success;
  } else if (kind === "orchard" && itemId.endsWith("_fidan")) {
    const treeId = itemId.replace(/_fidan$/, "");
    const result = plantTree(ctx.state, index, treeId);
    const mergeKey = result.success ? `plant-${treeId}` : null;
    ctx.log(result.success ? `Dikildi: ${itemEmoji(treeId)} ${itemDisplayName(treeId)} 1 adet` : `Dikilemedi: ${reasonText(result.reason)}`, result.success ? "success" : "error", mergeKey);
    return result.success;
  }
  return false;
}

function handlePlotDrop(e) {
  if (_plantedDuringDrag) return;
  const slotEl = e.target.closest(".slot");
  if (!slotEl) return;
  e.preventDefault();
  const itemId = e.dataTransfer.getData("text/plain");
  plantOnSlot(slotEl, itemId);
  scheduleSave();
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
      ctx.log(`${icon} Satın alındı: ${label} 1 adet, ${result.cost}🪙`, "trade");
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
      ctx.log(`${icon} Toplu alım: ${label} ${result.qty} adet, ${result.cost}🪙 (-${getBulkDiscountPercent()}%)`, "trade");
    } else {
      ctx.log(`Alınamadı: ${reasonText(result.reason)}`, "error");
    }
  } else if (action === "craft") {
    const recipeId = btn.dataset.recipe;
    const times = Number(btn.dataset.times);
    const result = craftRecipe(ctx.state, recipeId, times);
    if (result.success) {
      ctx.log(`${itemEmoji(result.outputId)} Üretildi: ${itemDisplayName(result.outputId)} ${result.outputQty} adet${result.firstCraft ? " (tarif öğrenildi)" : ""}`, "trade");
      if (result.tierUnlocked) {
        ctx.log(`Tier ${result.unlockedTier} tarifleri açıldı! Yeni tarifler Üretim sekmesinde`, "success");
      }
    } else {
      ctx.log(`Üretilemedi: ${reasonText(result.reason)}`, "error");
    }
  } else {
    handleUpgradeAction(e);
  }
  scheduleSave();
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
      if (result.success) ctx.log(`Envanter slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeField":
      result = upgradeFieldSlots(ctx.state, deductGold, gold());
      if (result.success) ctx.log(`Tarla slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeOrchard":
      result = upgradeOrchardSlots(ctx.state, deductGold, gold());
      if (result.success) ctx.log(`Bahçe slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketSeed":
      result = upgradeMarketSlots(ctx.state, "seed", deductGold, gold());
      if (result.success) ctx.log(`Tohum slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketSapling":
      result = upgradeMarketSlots(ctx.state, "sapling", deductGold, gold());
      if (result.success) ctx.log(`Fidan slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeMarketAnimal":
      result = upgradeMarketSlots(ctx.state, "animal", deductGold, gold());
      if (result.success) ctx.log(`Hayvan slotu artırıldı → ${result.newMax}`, "build");
      else ctx.log(`Başarısız: ${reasonText(result.reason)}`, "error");
      break;
    case "upgradeBuildingUpgrade":
      result = upgradeBuildingFromPanel(ctx.state, btn.dataset.building, deductGold, gold());
      if (result.success) {
        const bDef = BUILDING_TYPES[btn.dataset.building];
        ctx.log(`${bDef.name} geliştirildi, Seviye ${result.newLevel}`, "build");
      } else {
        ctx.log(`Geliştirilemedi: ${reasonText(result.reason)}`, "error");
      }
      break;
    case "buyFeature":
      const featureId = btn.dataset.feature;
      const featureResult = buyFeature(ctx.state, featureId, deductGold, gold());
      if (featureResult.success) {
        const fName = FEATURE_NAMES[featureId] || featureId;
        ctx.log(`${fName} satın alındı! ${featureResult.cost}🪙`, "success");
        render();
        return;
      } else {
        ctx.log(`Satın alınamadı: ${reasonText(featureResult.reason)}`, "error");
      }
      break;
  }
}
