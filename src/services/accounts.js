// accounts.js — учётные записи игроков: уникальное имя (закреплено навсегда) + случайный ID.
// Хранится локально (localStorage). Имена уникальны в рамках устройства-клиента,
// а также синхронизируются с сервером/Firebase позже при необходимости.


const ACCOUNT_KEY = "mafia_account_v1"; // мой аккаунт на этом устройстве
const REGISTRY_KEY = "mafia_names_registry_v1"; // все занятые имена -> { id, isAdmin }

// Админ-доступ больше НЕ выдаётся по нику (раньше любой, кто вводил имя
// "admin", становился администратором) — только по паролю через сервер.

function readRegistry() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeRegistry(map) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("mafia-registry-changed"));
}

function normalize(name) {
  return String(name || "").trim().toLowerCase();
}

function generateRandomId(registry) {
  let id;
  do {
    id = String(Math.floor(100000 + Math.random() * 900000)); // 6 случайных цифр
  } while (Object.values(registry).some((acc) => acc.id === id));
  return id;
}

/** Мой сохранённый аккаунт на этом устройстве (или null) */
export function getMyAccount() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveMyAccount(account) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  window.dispatchEvent(new CustomEvent("mafia-account-changed"));
  return account;
}

/** Занято ли имя кем-то другим (не мной) */
export function isNameTaken(name) {
  const key = normalize(name);
  if (!key) return false;
  const registry = readRegistry();
  const mine = getMyAccount();
  if (mine && normalize(mine.name) === key) return false;
  return Boolean(registry[key]);
}

/**
 * Регистрация / вход по имени.
 * Имя, один раз выбранное, закрепляется за этим устройством навсегда.
 * Возвращает { success, message, account? }
 */
export function registerOrLoginByName(rawName) {
  const name = String(rawName || "").trim();
  if (!name) return { success: false, message: "Введите имя" };

  const key = normalize(name);
  const mine = getMyAccount();

  // Уже есть аккаунт на этом устройстве — имя менять нельзя
  if (mine) {
    return { success: true, account: mine };
  }

  const registry = readRegistry();

  if (registry[key]) {
    return {
      success: false,
      message: "Это имя уже занято другим игроком. Выберите другое."
    };
  }

  const id = generateRandomId(registry);
  const account = { name, id, createdAt: Date.now() };

  registry[key] = { id };
  writeRegistry(registry);
  saveMyAccount(account);

  return { success: true, account };
}

/** Полный сброс аккаунта устройства (для отладки / админ-панели) */
export function resetMyAccount() {
  const mine = getMyAccount();
  if (mine) {
    const registry = readRegistry();
    delete registry[normalize(mine.name)];
    writeRegistry(registry);
  }
  localStorage.removeItem(ACCOUNT_KEY);
  window.dispatchEvent(new CustomEvent("mafia-account-changed"));
}