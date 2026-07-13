// js/systems/buildings.js
import { BUILDING_TYPES, MAX_BUILDING_LEVEL, capacityForLevel, speedMultiplierForLevel } from "../data/animals.js";
import { daysToSeconds } from "./time.js";
import { getWeather } from "./weather.js";
import { addItem } from "../state.js";

/** Her tick'te binaların üretim sayaçlarını ilerletir; hazır olan üretimleri otomatik envantere ekler. */
export function tickBuildings(state, dtSeconds) {
  for (const type of Object.keys(BUILDING_TYPES)) {
    const def = BUILDING_TYPES[type];
    const building = state.buildings[type];
    if (building.population <= 0) continue;

    const speedMult = speedMultiplierForLevel(building.level) * getWeather(state.weather).growthSpeedMultiplier;
    building.sinceLastProduction += dtSeconds * speedMult;

    const intervalSeconds = daysToSeconds(def.baseProductionDays);
    if (building.sinceLastProduction >= intervalSeconds) {
      building.sinceLastProduction -= intervalSeconds;
      const producedQty = Math.max(1, Math.round(building.population / 4));
      addItem(state, def.productId, producedQty);

      if (def.secondaryProductId && Math.random() < def.secondaryChance) {
        addItem(state, def.secondaryProductId, 1);
      }
    }
  }
}

export function buyAnimal(state, buildingType, deductGold, playerGold) {
  const def = BUILDING_TYPES[buildingType];
  const building = state.buildings[buildingType];
  const capacity = capacityForLevel(buildingType, building.level);

  if (building.population >= capacity) return { success: false, reason: "kapasite_dolu" };
  if (playerGold < def.animalBuyPrice) return { success: false, reason: "yetersiz_altin" };

  deductGold(def.animalBuyPrice);
  building.population += 1;
  return { success: true };
}

export const BUILDING_UPGRADE_BASE_COST = 150;
export function buildingUpgradeCost(currentLevel) {
  return Math.round(BUILDING_UPGRADE_BASE_COST * Math.pow(1.5, currentLevel));
}

export function upgradeBuilding(state, buildingType, deductGold, playerGold) {
  const building = state.buildings[buildingType];
  if (building.level >= MAX_BUILDING_LEVEL) return { success: false, reason: "max_seviye" };

  const cost = buildingUpgradeCost(building.level);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };

  deductGold(cost);
  building.level += 1;
  return { success: true, cost };
}
