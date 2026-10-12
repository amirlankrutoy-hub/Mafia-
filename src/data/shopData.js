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
  vor: 1050, // на 30% дешевле Крёстного отца
  manyak: 1600,
  potroshitel: 1400
};

// ---------- Метка "NEW" на карточке роли ----------
// Показывается только до указанной даты.
export const NEW_ROLE_IDS = ["vor"];
export const NEW_ROLE_UNTIL = new Date("2026-09-10T23:59:59");

export function isNewRole(roleId) {
  return NEW_ROLE_IDS.includes(roleId) && new Date() < NEW_ROLE_UNTIL;
}

// ---------- Эмодзи ----------
// Отправляются в лобби/игре и всплывают над карточкой игрока на 3 секунды.
export const EMOJIS = [
  { id: "e_laugh", symbol: "😂", price: 100 },
  { id: "e_heart", symbol: "❤️", price: 100 },
  { id: "e_fire", symbol: "🔥", price: 120 },
  { id: "e_skull", symbol: "💀", price: 120 },
  { id: "e_clap", symbol: "👏", price: 80 },
  { id: "e_think", symbol: "🤔", price: 80 },
  { id: "e_gun", symbol: "🔫", price: 180 },
  { id: "e_knife", symbol: "🔪", price: 90 },
  { id: "e_mask", symbol: "🎭", price: 80 },
  { id: "e_eyes", symbol: "👀", price: 40 },
  { id: "e_cry", symbol: "😭", price: 40 },
  { id: "e_angry", symbol: "😡", price: 50 },
  { id: "e_moon", symbol: "🌙", price: 60 },
  { id: "e_ghost", symbol: "👻", price: 70 },
  { id: "e_devil", symbol: "😈", price: 80 },
  { id: "e_star", symbol: "⭐", price: 50 },
  { id: "e_crown", symbol: "👑", price: 999 },
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
// 10 форм x 4 "драгоценные" палитры = 40 украшений.
const DECORATION_KINDS = ["fedora", "tophat", "crown", "laurel", "halo", "horns", "rose", "bowler", "beret", "tiara"];

const DECORATION_PALETTES = [
  { id: "gold", main: "#d4af37", accent: "#fff1b8", dark: "#6b4f08", gem: "#c0151f" },
  { id: "red", main: "#b3121b", accent: "#ff8a8a", dark: "#420005", gem: "#ffd166" },
  { id: "blue", main: "#1d4ed8", accent: "#a5c8ff", dark: "#0b1a4a", gem: "#f3d27a" },
  { id: "purple", main: "#7e22ce", accent: "#ead5ff", dark: "#33065a", gem: "#2dd4bf" }
];

const KIND_NAMES = {
  fedora: "Федора",
  tophat: "Цилиндр",
  crown: "Корона",
  laurel: "Лавровый венок",
  halo: "Нимб",
  horns: "Рога",
  rose: "Роза",
  bowler: "Котелок",
  beret: "Берет",
  tiara: "Тиара"
};

const PALETTE_NAMES = {
  gold: "золотой",
  red: "рубиновый",
  blue: "сапфировый",
  purple: "аметистовый"
};

const BASE_PRICES = {
  fedora: 150,
  tophat: 300,
  crown: 500,
  laurel: 220,
  halo: 350,
  horns: 250,
  rose: 100,
  bowler: 140,
  beret: 130,
  tiara: 400
};

// Старые украшения -> новые (купленное у игроков переносится автоматически)
export const LEGACY_DECORATION_KINDS = {
  cap: "fedora",
  headband: "laurel",
  flower: "rose",
  bandana: "bowler",
  beanie: "beret",
  partyhat: "tiara"
};

export function migrateDecorationId(id) {
  if (!id) return id;
  const [kind, palette] = String(id).split("_");
  return LEGACY_DECORATION_KINDS[kind] ? `${LEGACY_DECORATION_KINDS[kind]}_${palette}` : id;
}

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
  colors: { main: "#ffd700", accent: "#fff6cc", dark: "#7a5c00", gem: "#ff2d55" },
  name: "Корона «ADMIN»",
  price: null
};

// ---------- Пакеты валюты ----------
export const DISCOUNT_UNTIL = new Date("2026-12-01T00:00:00");
export const DISCOUNT_PERCENT = 15;

// Пакеты Токенов за звёзды Telegram. Настоящие цены задаёт сервер
// (server/telegram.js) — здесь они только для показа.
export const COIN_PACKAGES = [
  { id: "coins_999", amount: 999, stars: 50, basePrice: 1 },
  { id: "coins_3000", amount: 3000, stars: 100, basePrice: 2 },
  { id: "coins_7000", amount: 7000, stars: 200, basePrice: 4 },
  { id: "coins_10000", amount: 10000, stars: 350, basePrice: 7 }
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
