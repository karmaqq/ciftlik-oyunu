/* ═══════════════════════════════════════════════════════════════════════════ */
/*               Paylaşılan UI yardımcıları ve durum                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/shared.js
// Tüm UI panelleri tarafından paylaşılan ortak state ve yardımcı fonksiyonlar.

import { saveGame } from "../systems/save.js";

let ctx = null;

/* ─────────────────── Bağlam ayarla ─────────────────── */
export function setContext(state, log) {
  ctx = { state, log };
}

/* ─────────────────── Bağlam al ─────────────────── */
export function getContext() {
  return ctx;
}

// --- Altın yardımcıları ---

/* ─────────────────── Altın miktarı ─────────────────── */
export function gold() { return Math.floor(ctx.state.player.gold); }
/* ─────────────────── Altın düşür ─────────────────── */
export function deductGold(amount) { ctx.state.player.gold -= Math.floor(amount); }
/* ─────────────────── Altın ekle ─────────────────── */
export function addGold(amount) { ctx.state.player.gold += Math.floor(amount); }

// --- Mesaj haritası ---

/* ─────────────────── Sebep metni ─────────────────── */
export function reasonText(r) {
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

// --- Emoji yardımcıları ---

/* ─────────────────── Mevsim emojisine göre ─────────────────── */
export function seasonEmoji(s) {
  const map = { ilkbahar: "🌸", yaz: "☀️", sonbahar: "🍂", kış: "❄️" };
  return map[s] || "";
}

/* ─────────────────── Hava durumuna göre ─────────────────── */
export function weatherEmoji(w) {
  const map = { normal: "🌤️", yagmurlu: "🌧️", kurak: "🔥", firtina: "⛈️", gokkusagi: "🌈" };
  return map[w.id] || "🌤️";
}

// --- UI durum değişkenleri ---

/* ─────────────────── Hızlı satış modu ─────────────────── */
export let quickSellMode = localStorage.getItem("quickSellMode") || "single";
/* ─────────────────── Envanter filtresi ─────────────────── */
export let inventoryFilter = "tümü";
/* ─────────────────── Envanter sıralaması ─────────────────── */
export let inventorySort = "isim";
/* ─────────────────── Üzerine gelinen market butonu ─────────────────── */
export let hoveredMarketBtn = null;

/* ─────────────────── Envanter filtresini ayarla ─────────────────── */
export function setInventoryFilter(f) { inventoryFilter = f; }
/* ─────────────────── Envanter sıralamasını ayarla ─────────────────── */
export function setInventorySort(s) { inventorySort = s; }
/* ─────────────────── Market butonu seçimini ayarla ─────────────────── */
export function setHoveredMarketBtn(v) { hoveredMarketBtn = v; }

/* ─────────────────── Hızlı satış modunu kaydet ─────────────────── */
export function saveQuickSellMode(mode) {
  quickSellMode = mode;
  localStorage.setItem("quickSellMode", mode);
}

// --- Kaydetme yardımcıları ---

let _saveDirty = false;
let _saveTimer = null;

/* ─────────────────── Kayıt zamanla ─────────────────── */
export function scheduleSave() {
  _saveDirty = true;
  if (!_saveTimer) {
    _saveTimer = setTimeout(() => {
      if (_saveDirty) { saveGame(ctx.state); _saveDirty = false; }
      _saveTimer = null;
    }, 500);
  }
}

/* ─────────────────── Kaydı uygula ─────────────────── */
export function flushSave() {
  if (_saveDirty) { saveGame(ctx.state); _saveDirty = false; }
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
}

// --- Ortak HTML helper'ları ---

/* ─────────────────── Satın alma durumuna göre ─────────────────── */
export function affordClass(cost, maxed) {
  if (maxed) return "";
  return gold() < cost ? " insufficient-gold" : "";
}
