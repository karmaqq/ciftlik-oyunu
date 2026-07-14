// js/systems/quests.js
import { CROPS } from "../data/crops.js";
import { RECIPES } from "../data/recipes.js";

let questCounter = 0;

/**
 * Görev zorluğu tarifin/ürünün karmaşıklığıyla ters orantılı miktar ister:
 * basit ürünler (tier 1, direkt satış) yüksek adet, karmaşık tarifler (4+ malzeme) düşük adet.
 */
export function generateQuest() {
  questCounter += 1;
  const useRecipe = Math.random() < 0.4;

  if (useRecipe) {
    const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
    const qty = recipe.inputs.length >= 4 ? randomInt(2, 4) : recipe.inputs.length === 3 ? randomInt(4, 8) : randomInt(10, 25);
    return {
      questId: `quest_${questCounter}`,
      type: "produce",
      itemId: recipe.output.id,
      requiredQty: qty,
      progress: 0,
      reward: { gold: Math.round(qty * 8 * recipe.tier) },
    };
  }

  const crop = CROPS[Math.floor(Math.random() * CROPS.length)];
  const qty = crop.tier >= 3 ? randomInt(3, 8) : randomInt(5, 15);
  return {
    questId: `quest_${questCounter}`,
    type: "sell",
    itemId: crop.id,
    requiredQty: qty,
    progress: 0,
    reward: { gold: Math.round(qty * crop.sellPrice * 1.5) },
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function ensureQuestPool(state, minCount = 3) {
  const beforeCount = state.quests.length;
  while (state.quests.length < minCount) {
    state.quests.push(generateQuest());
  }
  if (state.quests.length > beforeCount && window._gameLog) {
    window._gameLog("Yeni görevler mevcut!", "info");
  }
}

/** Satış/üretim gerçekleştiğinde görev ilerlemesini günceller (main.js tarafından tetiklenir). */
export function registerProgress(state, type, itemId, qty) {
  for (const quest of state.quests) {
    if (quest.type === type && quest.itemId === itemId && quest.progress < quest.requiredQty) {
      quest.progress = Math.min(quest.requiredQty, quest.progress + qty);
    }
  }
}

export function claimQuest(state, questId, addGold) {
  const quest = state.quests.find((q) => q.questId === questId);
  if (!quest) return { success: false, reason: "gorev_yok" };
  if (quest.progress < quest.requiredQty) return { success: false, reason: "tamamlanmadi" };

  addGold(quest.reward.gold);
  state.quests = state.quests.filter((q) => q.questId !== questId);
  ensureQuestPool(state);
  return { success: true, reward: quest.reward };
}
