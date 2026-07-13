// js/data/animals.js
// 3 tarla dışı bina: kovan (hive), kümes (coop), ahır (barn).
// Her bina seviye başına: kapasite +%20, üretim hızı +%10 (max 5 seviye).

export const BUILDING_TYPES = {
  hive: {
    id: "hive",
    name: "Kovan",
    animalName: "Arı",
    baseCapacity: 40,
    productId: "bal",
    animalBuyPrice: 6,
    baseProductionDays: 3, // her arı grubu bu sürede 1 üretim tetikler
    // arılar ayrıca tarladaki çiçek açan bitkilerden (ay_cicegi, cilek, vb.) bonus üretim alır
    fieldBonusCropIds: ["ay_cicegi", "cilek", "ahududu"],
  },
  coop: {
    id: "coop",
    name: "Kümes",
    animalName: "Tavuk",
    baseCapacity: 12,
    productId: "yumurta",
    animalBuyPrice: 10,
    baseProductionDays: 1,
    secondaryProductId: "tavuk_eti",
    secondaryChance: 0.15,
  },
  barn: {
    id: "barn",
    name: "Ahır",
    animalName: "İnek",
    baseCapacity: 5,
    productId: "sut",
    animalBuyPrice: 40,
    baseProductionDays: 2,
    // ineklerden düşük ihtimalle "inek eti" de elde edilir (özel ürün, hamburger tarifi için)
    secondaryProductId: "inek_eti",
    secondaryChance: 0.15,
  },
};

export const MAX_BUILDING_LEVEL = 5;
export const BUILDING_CAPACITY_PER_LEVEL = 0.2; // +%20 / seviye
export const BUILDING_SPEED_PER_LEVEL = 0.1; // +%10 / seviye

export function capacityForLevel(buildingType, level) {
  const base = BUILDING_TYPES[buildingType].baseCapacity;
  return Math.round(base * (1 + BUILDING_CAPACITY_PER_LEVEL * level));
}

export function speedMultiplierForLevel(level) {
  return 1 + BUILDING_SPEED_PER_LEVEL * level;
}
