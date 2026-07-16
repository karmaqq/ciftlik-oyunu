// js/systems/buildings.js
import { BUILDING_TYPES, MAX_BUILDING_LEVEL, capacityForLevel, speedMultiplierForLevel } from "../data/animals.js";
import { daysToSeconds } from "./time.js";
import { getWeather } from "./weather.js";

/** Her tick'te binaların üretim sayaçlarını ilerletir; hazır olan ürünleri building.stored'a ekler. */
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
      const producedQty = building.population;
      building.stored[def.productId] = (building.stored[def.productId] || 0) + producedQty;

      if (def.secondaryProductId && Math.random() < def.secondaryChance) {
        building.stored[def.secondaryProductId] = (building.stored[def.secondaryProductId] || 0) + 1;
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

const UPGRADE_COST = {
  hive: { base: 50,  mult: 1.4 },
  coop: { base: 80,  mult: 1.4 },
  barn: { base: 120, mult: 1.4 },
};

export function buildingUpgradeCost(currentLevel, buildingType) {
  const cfg = UPGRADE_COST[buildingType] || UPGRADE_COST.hive;
  return Math.round(cfg.base * Math.pow(cfg.mult, currentLevel));
}

export function upgradeBuilding(state, buildingType, deductGold, playerGold) {
  const building = state.buildings[buildingType];
  if (building.level >= MAX_BUILDING_LEVEL) return { success: false, reason: "max_seviye" };

  const cost = buildingUpgradeCost(building.level, buildingType);
  if (playerGold < cost) return { success: false, reason: "yetersiz_altin" };

  deductGold(cost);
  building.level += 1;
  return { success: true, cost, newLevel: building.level };
}
