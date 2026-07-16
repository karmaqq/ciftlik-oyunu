// js/data/animals.js
// 3 tarla dışı bina: kovan (hive), kümes (coop), ahır (barn).

export const BUILDING_TYPES = {
  hive: {
    id: "hive",
    name: "Kovan",
    animalName: "Arı",
    baseCapacity: 10,
    capacityPerLevel: 10,
    productId: "bal",
    animalBuyPrice: 10,
    baseProductionDays: 7,
    fieldBonusCropIds: ["ay_cicegi", "cilek", "ahududu"],
  },
  coop: {
    id: "coop",
    name: "Kümes",
    animalName: "Tavuk",
    baseCapacity: 12,
    capacityPerLevel: 2,
    productId: "yumurta",
    animalBuyPrice: 20,
    baseProductionDays: 1,
    secondaryProductId: "tavuk_eti",
    secondaryChance: 0.15,
  },
  barn: {
    id: "barn",
    name: "Ahır",
    animalName: "İnek",
    baseCapacity: 3,
    capacityPerLevel: 1,
    productId: "sut",
    animalBuyPrice: 60,
    baseProductionDays: 2,
    secondaryProductId: "inek_eti",
    secondaryChance: 0.15,
  },
};

export const MAX_BUILDING_LEVEL = 5;
export const BUILDING_SPEED_PER_LEVEL = 0.1;

export function capacityForLevel(buildingType, level) {
  const def = BUILDING_TYPES[buildingType];
  return def.baseCapacity + def.capacityPerLevel * level;
}

export function speedMultiplierForLevel(level) {
  return 1 + BUILDING_SPEED_PER_LEVEL * level;
}
