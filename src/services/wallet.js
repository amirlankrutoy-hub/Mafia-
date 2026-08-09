// wallet.js
// Локальный "кошелёк" игрока — валюта Мафио (M) и то, что на неё куплено.
//
// ВАЖНО: в проекте пока нет системы аккаунтов/базы данных — только
// комнаты в памяти сервера (RoomManager). Поэтому баланс и покупки
// хранятся в localStorage, то есть привязаны к конкретному браузеру/
// устройству, а не к игроку "навсегда". Как только появятся настоящие
// аккаунты с логином, этот файл нужно будет переключить на запросы
// к серверу/БД — структура данных ниже уже готова к этому переезду.

import { PROMO_CODES, ROLE_PRICES, EMOJIS, DECORATIONS } from "../data/shopData";

const STORAGE_KEY = "mafia_wallet_v1";
const FREE_ROLES = ["obivatel"]; // Обыватель — базовая роль, всегда доступна

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function defaultState() {
  return {
    balance: 0,
    ownedRoles: [...FREE_ROLES],
    ownedEmojis: [],
    ownedDecorations: [],
    equippedDecoration: null,
    redeemedCodes: [],
    isAdmin: false
  };
}

function readState() {
  const saved = readRaw();
  if (!saved) return defaultState();
  return {
    ...defaultState(),
    ...saved,
    ownedRoles: Array.from(
      new Set([...(saved.ownedRoles || []), ...FREE_ROLES])
    )
  };
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("mafia-wallet-changed"));
  return state;
}

export function getWallet() {
  return readState();
}

export function getBalance() {
  return readState().balance;
}

// Начисление валюты (после подтверждённого пополнения)
export function credit(amount) {
  const state = readState();
  state.balance += Math.max(0, Math.floor(amount) || 0);
  return writeState(state);
}

export function ownsRole(roleId) {
  return readState().ownedRoles.includes(roleId);
}

export function ownsEmoji(emojiId) {
  return readState().ownedEmojis.includes(emojiId);
}

export function ownsDecoration(decorationId) {
  return readState().ownedDecorations.includes(decorationId);
}

// Универсальная покупка: списывает валюту и добавляет id в нужный список.
// Возвращает { success, message }.
export function purchase({ kind, id, price }) {
  const state = readState();
  const listKey =
    kind === "role"
      ? "ownedRoles"
      : kind === "emoji"
      ? "ownedEmojis"
      : "ownedDecorations";

  if (state[listKey].includes(id)) {
    return { success: false, message: "Уже куплено" };
  }
  if (state.balance < price) {
    return { success: false, message: "Недостаточно Мафио" };
  }

  state.balance -= price;
  state[listKey] = [...state[listKey], id];
  writeState(state);
  return { success: true };
}

export function setEquippedDecoration(decorationId) {
  const state = readState();
  if (decorationId && !state.ownedDecorations.includes(decorationId)) {
    return state;
  }
  state.equippedDecoration = decorationId || null;
  return writeState(state);
}

export function getEquippedDecoration() {
  return readState().equippedDecoration;
}

// Промокод можно активировать один раз (на это устройство).
// Возвращает { success, message }.
export function redeemPromoCode(rawCode) {
  const code = (rawCode || "").trim().toLowerCase();
  const def = PROMO_CODES[code];
  if (!def) return { success: false, message: "Такого промокода не существует" };

  const state = readState();
  if (state.redeemedCodes.includes(code)) {
    return { success: false, message: "Этот промокод уже был использован" };
  }

  if (def.type === "coins") {
    state.balance += def.amount;
  } else if (def.type === "role") {
    if (!state.ownedRoles.includes(def.roleId)) {
      state.ownedRoles = [...state.ownedRoles, def.roleId];
    }
  }

  state.redeemedCodes = [...state.redeemedCodes, code];
  writeState(state);

  return {
    success: true,
    message:
      def.type === "coins"
        ? `Начислено ${def.amount} Мафио`
        : "Роль открыта бесплатно"
  };
}

export function isAdminUnlocked() {
  return readState().isAdmin;
}

// Разовая выдача администратору: все роли, все эмодзи, все украшения,
// 100 000 Мафио и эксклюзивные предметы (передаются отдельно, см. admin.js).
// Срабатывает только один раз — при повторном входе баланс и покупки
// остаются ровно такими, какими были в прошлый раз, ничего не выдаётся
// и не сбрасывается заново.
export function grantAdminEverything(exclusiveDecorationId, exclusiveEmojiId) {
  const state = readState();

  const alreadyGranted = state.isAdmin;

  state.isAdmin = true;
  if (!alreadyGranted) {
    state.balance += 100000;
  }
  state.ownedRoles = Array.from(
    new Set([...state.ownedRoles, ...Object.keys(ROLE_PRICES)])
  );
  state.ownedEmojis = Array.from(
    new Set([...state.ownedEmojis, ...EMOJIS.map((e) => e.id), exclusiveEmojiId])
  );
  state.ownedDecorations = Array.from(
    new Set([
      ...state.ownedDecorations,
      ...DECORATIONS.map((d) => d.id),
      exclusiveDecorationId
    ])
  );
  return writeState(state);
}
