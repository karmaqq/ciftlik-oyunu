/* ═══════════════════════════════════════════════════════════════════════════ */
/*                         Rehber ipucu sistemi                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/hints.js
// Rehber ipucu sistemi.

import { currentSeason } from "../systems/time.js";
import { getContext } from "./shared.js";

function hint(shown, key) {
  if (shown[key]) return false;
  shown[key] = true;
  return true;
}

/* ─────────────────── İpuçlarını kontrol et ─────────────────── */
export function checkHints() {
  const ctx = getContext();
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
