/* ═══════════════════════════════════════════════════════════════════════════ */
/*                     Market paneli render fonksiyonu                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/market.js
// Market paneli render fonksiyonu.

import { getCrop } from "../data/crops.js";
import { getTree } from "../data/trees.js";
import { BUILDING_TYPES, capacityForLevel } from "../data/animals.js";
import { itemDisplayName, itemEmoji } from "../data/items.js";
import { getBulkDiscountPercent } from "../systems/market.js";
import { getContext, gold } from "./shared.js";

/* ─────────────────── Market HTML içeriği ─────────────────── */
export function marketHTML() {
  const ctx = getContext();
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

      let priceTag = "";
      let diffTag = "";
      if (calendarActive && listing.basePrice > 0) {
        const diffPct = Math.round(((unitPrice - listing.basePrice) / listing.basePrice) * 100);
        priceTag = `<span class="mr-price-tag mr-tag-secondary">${unitPrice}🪙</span>`;
        if (diffPct === -100) {
          diffTag = `<span class="mr-price-tag mr-tag-free">Bedava</span>`;
        } else if (diffPct === 100) {
          diffTag = `<span class="mr-price-tag mr-price-black">Çok Pahalı</span>`;
        } else if (diffPct === 0) {
          diffTag = `<span class="mr-price-tag mr-tag-ideal">İdeal</span>`;
        } else if (diffPct < 0) {
          diffTag = `<span class="mr-price-tag mr-tag-cheap">%${Math.abs(diffPct)} Ucuz</span>`;
        } else {
          diffTag = `<span class="mr-price-tag mr-tag-expensive">%${diffPct} Pahalı</span>`;
        }
      } else if (listing.basePrice > 0) {
        priceTag = `<span class="mr-price-tag mr-tag-secondary">${unitPrice}🪙</span>`;
      } else {
        priceTag = `<span class="mr-price-tag mr-tag-ideal">0🪙</span>`;
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
        let cls = "mr-btn";
        if (gold() < cost || capacityFull) cls += " insufficient-gold";
        return cls;
      }

      if (isAnimal) {
        return `${categoryHeader}<div class="market-row${soldOutClass}">
          <div class="mr-left" data-tt="marketInfo" data-tt-index="${i}">
            <span class="mr-icon">${icon}</span>
            <div class="mr-info">
              <span class="mr-name">${name}</span>
              <span class="mr-price-row">${priceTag} ${diffTag}</span>
            </div>
          </div>
          ${soldOut
            ? `<span class="mr-soldout" data-tt="soldOut">Tükendi</span>`
            : `<div class="mr-right">
                <button class="${btnClass(i, "buyOne", unitPrice)}" data-action="buyOne" data-index="${i}" data-tt="marketBuy" data-tt-index="${i}" data-tt-mode="single" ${buyDisabled ? "disabled" : ""}><span class="btn-label">1x</span><span class="btn-price">${unitPrice}</span></button>
              </div>`
          }
        </div>`;
      }

      return `${categoryHeader}<div class="market-row${soldOutClass}">
        <div class="mr-left" data-tt="marketInfo" data-tt-index="${i}">
          <span class="mr-icon">${icon}</span>
          <div class="mr-info">
            <span class="mr-name">${name}</span>
            <span class="mr-price-row">${priceTag} ${diffTag}</span>
          </div>
        </div>
        ${soldOut
          ? `<span class="mr-soldout" data-tt="soldOut">Tükendi</span>`
          : `<div class="mr-right">
              <button class="${btnClass(i, "buyOne", unitPrice)}" data-action="buyOne" data-index="${i}" data-tt="marketBuy" data-tt-index="${i}" data-tt-mode="single" ${buyDisabled ? "disabled" : ""}><span class="btn-label">1x</span><span class="btn-price">${unitPrice}</span></button>
              <button class="${btnClass(i, "buyAll", bulkCost)}" data-action="buyAll" data-index="${i}" data-tt="marketBuy" data-tt-index="${i}" data-tt-mode="bulk" ${buyDisabled ? "disabled" : ""}><span class="btn-label">${listing.remaining}x</span><span class="btn-price">${bulkCost}</span></button>
            </div>`
        }
      </div>`;
    })
    .join("");

  return `
    <div class="market-list">${rows || "<p>Yükleniyor…</p>"}</div>
    <div class="market-info" data-tt="bulkDiscount">Toplu alımda %${discountPct} indirim Uygulanır..</div>
  `;
}
