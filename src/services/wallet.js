// wallet.js
// Локальный "кошелёк" игрока — валюта Токены (T) и то, что на неё куплено.
//
// ВАЖНО: в проекте пока нет системы аккаунтов/базы данных — только
// комнаты в памяти сервера (RoomManager). Поэтому баланс и покупки
// хранятся в localStorage, то есть привязаны к конкретному браузеру/
// устройству, а не к игроку "навсегда". Как только появятся настоящие
// аккаунты с логином, этот файл нужно будет переключить на запросы
// к серверу/БД — структура данных ниже уже готова к этому переезду.

import { PROMO_CODES, ROLE_PRICES, EMOJIS, DECORATIONS } from "../data/shopData";

const STORAGE_KEY = "mafia_wallet_v1";
const FREE_ROLES = ["obivatel", "mafia"]; // базовые роли — есть у всех бесплатно

// Ключ аккаунта хранится в accounts.js под этим же именем — берём его
// напрямую по ключу (а не через import), чтобы не создавать циклическую
// зависимость между accounts.js и wallet.js (accounts.js уже импортирует
// функции из wallet.js).
const ACCOUNT_KEY = "mafia_account_v1";

function getCurrentAccountId() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.id || null;
  } catch {
    return null;
  }
}

// Кошелёк привязан к конкретному ID аккаунта — раньше был один общий ключ
// на весь браузер, из-за чего все аккаунты на одном устройстве делили один
// баланс и один admin-флаг. Если для этого аккаунта своих данных ещё нет,
// но есть старые общие данные (до этого исправления) — переносим их один
// раз как стартовое состояние, чтобы никто не потерял прогресс.
function walletKey() {
  const id = getCurrentAccountId();
  if (!id) return STORAGE_KEY; // на экране выбора имени аккаунта ещё нет

  const perAccountKey = `${STORAGE_KEY}_${id}`;
  try {
    if (!localStorage.getItem(perAccountKey)) {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) localStorage.setItem(perAccountKey, legacy);
    }
  } catch {
    // ignore
  }
  return perAccountKey;
}

function readRaw() {
  try {
    const raw = localStorage.getItem(walletKey());
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
  localStorage.setItem(walletKey(), JSON.stringify(state));
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
  const value = Math.max(0, Math.floor(amount) || 0);
  state.balance += value;
  const result = writeState(state);
  if (value > 0) {
    import("./achievementsService").then((m) =>
      m.recordEvent("mafio_earned", { amount: value })
    ).catch(() => {});
  }
  return result;
}

export function ownsRole(roleId) {
  return readState().ownedRoles.includes(roleId);
}

// Списание валюты (для обмена Токенов на кристаллы теней и т.п.). Возвращает { success, balance }.
export function debit(amount) {
  const value = Math.max(0, Math.floor(amount) || 0);
  const state = readState();
  if (!value || value > state.balance) {
    return { success: false, balance: state.balance };
  }
  state.balance -= value;
  writeState(state);
  return { success: true, balance: state.balance };
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
    return { success: false, message: "Недостаточно Токенов" };
  }

  state.balance -= price;
  state[listKey] = [...state[listKey], id];
  writeState(state);
  return { success: true };
}

/** Выдать предмет бесплатно (награда из сундука). Возвращает false, если уже есть. */
export function grantItem(kind, id) {
  const state = readState();
  const listKey = kind === "role" ? "ownedRoles" : kind === "emoji" ? "ownedEmojis" : "ownedDecorations";
  if (state[listKey].includes(id)) return false;
  state[listKey] = [...state[listKey], id];
  writeState(state);
  return true;
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
        ? `Начислено ${def.amount} Токенов`
        : "Роль открыта бесплатно"
  };
}

export function isAdminUnlocked() {
  return readState().isAdmin;
}

// Разовая выдача администратору: все роли, все эмодзи, все украшения,
// 100 000 Токенов и эксклюзивные предметы (передаются отдельно, см. admin.js).
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