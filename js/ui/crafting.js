/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    Üretim (crafting) paneli                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
// js/ui/crafting.js
// Üretim (crafting) paneli render fonksiyonu.

import { RECIPES } from "../data/recipes.js";
import { itemDisplayName, itemSellPrice, itemEmoji } from "../data/items.js";
import { canCraft } from "../systems/crafting.js";
import { getContext } from "./shared.js";

/* ─────────────────── Crafting HTML içeriği ─────────────────── */
export function craftingHTML() {
  const ctx = getContext();
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
