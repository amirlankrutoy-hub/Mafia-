// chests.js — сундуки магазина. Роли больше не продаются напрямую:
// они выпадают из сундуков вместе с Токенами, Тенями и эмодзи.

export const RARITIES = {
  common: { label: "Обычная", color: "#a1a1aa", glow: "rgba(161,161,170,0.55)" },
  rare: { label: "Редкая", color: "#3b82f6", glow: "rgba(59,130,246,0.65)" },
  epic: { label: "Эпическая", color: "#a855f7", glow: "rgba(168,85,247,0.7)" },
  mythic: { label: "Мифическая", color: "#f59e0b", glow: "rgba(245,158,11,0.8)" }
};

export const RARITY_ORDER = ["common", "rare", "epic", "mythic"];

// Редкость роли — по силе способности.
export const ROLE_RARITY = {
  obivatel: "common",
  mafia: "common",
  doctor: "common",
  sherif: "common",
  krasotka: "rare",
  vor: "rare",
  poklon: "rare",
  sveshennik: "epic",
  stukach: "epic",
  otez: "epic",
  manyak: "mythic",
  potroshitel: "mythic"
};

// Базовые роли есть у всех бесплатно: в коллекции показываются, но из сундуков не выпадают
export const BASE_ROLES = ["obivatel", "mafia"];

// Если роль уже есть — компенсация Токенами (не больше 70% цены сундука, см. services/chests.js)
export const DUPLICATE_TOKENS = { common: 100, rare: 200, epic: 500, mythic: 1200 };

// Любая награда Токенами меньше цены сундука — сундук нельзя "окупить" одними Токенами
export const MAX_TOKEN_SHARE = 0.7;

export const CHESTS = [
  {
    id: "rare",
    name: "Редкий сундук",
    price: 400,
    rarity: "rare",
    colors: { body: "#1e3a8a", trim: "#93c5fd", glow: "rgba(59,130,246,0.7)" },
    // Что выпадает (веса в процентах)
    drops: { tokens: 40, teni: 25, emoji: 20, role: 15 },
    // Какой редкости роль, если выпала роль
    roleRarity: { common: 75, rare: 22, epic: 3, mythic: 0 },
    tokens: [80, 280],
    teni: [2, 5]
  },
  {
    id: "epic",
    name: "Эпический сундук",
    price: 1200,
    rarity: "epic",
    colors: { body: "#4c1d95", trim: "#d8b4fe", glow: "rgba(168,85,247,0.75)" },
    drops: { tokens: 30, teni: 25, emoji: 15, role: 30 },
    roleRarity: { common: 35, rare: 40, epic: 20, mythic: 5 },
    tokens: [250, 840],
    teni: [5, 12]
  },
  {
    id: "mythic",
    name: "Мифический сундук",
    price: 3000,
    rarity: "mythic",
    colors: { body: "#7c2d12", trim: "#fcd34d", glow: "rgba(245,158,11,0.85)" },
    drops: { tokens: 20, teni: 20, emoji: 10, role: 50 },
    roleRarity: { common: 10, rare: 30, epic: 40, mythic: 20 },
    tokens: [600, 2100],
    teni: [12, 30]
  }
];

/** Итоговый шанс выбить роль данной редкости из сундука, % */
export function roleChance(chest, rarity) {
  return (chest.drops.role * (chest.roleRarity[rarity] || 0)) / 100;
}
