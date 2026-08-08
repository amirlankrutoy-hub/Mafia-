// shopData.js — каталог магазина: роли, эмодзи, украшения, пакеты валюты.

export const ROLE_PRICES = {
  obivatel: 0, // базовая роль — бесплатна
  mafia: 0, // обычная мафия — бесплатна с начала
  doctor: 700,
  sherif: 700,
  krasotka: 1100,
  sveshennik: 1300,
  poklon: 1000,
  stukach: 1000,
  otez: 1500,
  manyak: 1600,
  potroshitel: 1400
};

// ---------- Эмодзи ----------
// Отправляются в лобби/игре и всплывают над карточкой игрока на 3 секунды.
export const EMOJIS = [
  { id: "e_laugh", symbol: "😂", price: 50 },
  { id: "e_heart", symbol: "❤️", price: 50 },
  { id: "e_fire", symbol: "🔥", price: 60 },
  { id: "e_skull", symbol: "💀", price: 60 },
  { id: "e_clap", symbol: "👏", price: 40 },
  { id: "e_think", symbol: "🤔", price: 40 },
  { id: "e_gun", symbol: "🔫", price: 90 },
  { id: "e_knife", symbol: "🔪", price: 90 },
  { id: "e_mask", symbol: "🎭", price: 80 },
  { id: "e_eyes", symbol: "👀", price: 40 },
  { id: "e_cry", symbol: "😭", price: 40 },
  { id: "e_angry", symbol: "😡", price: 50 },
  { id: "e_moon", symbol: "🌙", price: 60 },
  { id: "e_ghost", symbol: "👻", price: 70 },
  { id: "e_devil", symbol: "😈", price: 80 },
  { id: "e_star", symbol: "⭐", price: 50 },
  { id: "e_crown", symbol: "👑", price: 120 },
  { id: "e_100", symbol: "💯", price: 50 },
  { id: "e_shush", symbol: "🤫", price: 60 },
  { id: "e_lock", symbol: "🔒", price: 60 },
  { id: "e_candle", symbol: "🕯️", price: 70 },
  { id: "e_bomb", symbol: "💣", price: 90 },
  { id: "e_handcuffs", symbol: "⛓️", price: 90 },
  { id: "e_wine", symbol: "🍷", price: 70 }
];

// Эксклюзивный эмодзи — выдаётся только через админ-панель, не продаётся
export const ADMIN_EMOJI = { id: "e_admin", symbol: "👑💫", price: null };

// ---------- Украшения на карточку в лобби ----------
// 10 базовых "форм" x 4 цветовые палитры = 40 украшений.
const DECORATION_KINDS = [
  "cap",
  "tophat",
  "crown",
  "headband",
  "halo",
  "horns",
  "flower",
  "bandana",
  "beanie",
  "partyhat"
];

const DECORATION_PALETTES = [
  { id: "gold", main: "#d4af37", accent: "#f3e5ab", dark: "#8b6b12" },
  { id: "red", main: "#8b0000", accent: "#ff4d4d", dark: "#4a0000" },
  { id: "blue", main: "#1e3a8a", accent: "#60a5fa", dark: "#0b1a4a" },
  { id: "purple", main: "#6b21a8", accent: "#c084fc", dark: "#3b0764" }
];

const KIND_NAMES = {
  cap: "Кепка",
  tophat: "Цилиндр",
  crown: "Корона",
  headband: "Повязка",
  halo: "Нимб",
  horns: "Рожки",
  flower: "Цветок",
  bandana: "Бандана",
  beanie: "Шапка",
  partyhat: "Колпак"
};

const PALETTE_NAMES = {
  gold: "золотой",
  red: "алый",
  blue: "синий",
  purple: "фиолетовый"
};

const BASE_PRICES = {
  cap: 150,
  tophat: 300,
  crown: 500,
  headband: 120,
  halo: 350,
  horns: 250,
  flower: 100,
  bandana: 140,
  beanie: 130,
  partyhat: 160
};

export const DECORATIONS = DECORATION_KINDS.flatMap((kind) =>
  DECORATION_PALETTES.map((palette) => ({
    id: `${kind}_${palette.id}`,
    kind,
    palette: palette.id,
    colors: palette,
    name: `${KIND_NAMES[kind]} (${PALETTE_NAMES[palette.id]})`,
    price: BASE_PRICES[kind]
  }))
);

// Эксклюзивное украшение админа — золотая корона с надписью ADMIN
export const ADMIN_DECORATION = {
  id: "crown_admin",
  kind: "admin_crown",
  palette: "admin",
  colors: { main: "#ffd700", accent: "#fff3c4", dark: "#7a5c00" },
  name: "Корона «ADMIN»",
  price: null
};

// ---------- Пакеты валюты ----------
export const DISCOUNT_UNTIL = new Date("2026-12-01T00:00:00");
export const DISCOUNT_PERCENT = 15;

export const COIN_PACKAGES = [
  { id: "coins_999", amount: 999, basePrice: 7 },
  { id: "coins_3000", amount: 3000, basePrice: 50 },
  { id: "coins_7000", amount: 7000, basePrice: 80 },
  { id: "coins_10000", amount: 10000, basePrice: 100 }
];

export function isDiscountActive() {
  return new Date() < DISCOUNT_UNTIL;
}

export function getPackagePrice(pkg) {
  if (!isDiscountActive()) return pkg.basePrice;
  return +(pkg.basePrice * (1 - DISCOUNT_PERCENT / 100)).toFixed(2);
}

// ---------- Промокоды ----------
// Каждый код можно активировать один раз на устройство (см. wallet.js).
export const PROMO_CODES = {
  start: { type: "coins", amount: 500 },
  release: { type: "coins", amount: 1000 },
  sheriff: { type: "role", roleId: "sherif" }
};

// ---------- Награды за победу ----------
// category берётся из src/data/roles.js (civilians / mafia / neutrals)
export const WIN_REWARDS = {
  town: { categories: ["civilians"], amount: 100 },
  mafia: { categories: ["mafia"], amount: 150 },
  manyak: {
    categories: ["neutrals"],
    amount: 150,
    exceptions: { poklon: 100, stukach: 100 }
  },
  potroshitel: {
    categories: ["neutrals"],
    amount: 150,
    exceptions: { poklon: 100, stukach: 100 }
  }
};
