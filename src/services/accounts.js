// accounts.js — учётные записи игроков: уникальное имя (закреплено навсегда) + случайный ID.
// Хранится локально (localStorage). Имена уникальны в рамках устройства-клиента,
// а также синхронизируются с сервером/Firebase позже при необходимости.

import { setAdminRole } from "./admin";
import { grantAdminEverything, credit } from "./wallet";
import { ADMIN_DECORATION, ADMIN_EMOJI } from "../data/shopData";

const ACCOUNT_KEY = "mafia_account_v1"; // мой аккаунт на этом устройстве
const REGISTRY_KEY = "mafia_names_registry_v1"; // все занятые имена -> { id, isAdmin }

// Специальные имена и их фиксированные ID
const SPECIAL_ACCOUNTS = {
  admin: { id: "777777", adminRole: "Admin" },
  admin2: { id: "1111111", adminRole: "admin-setting" }
};

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

  let id;
  let isAdmin = false;
  let adminRole = null;

  const special = SPECIAL_ACCOUNTS[key];
  if (special) {
    id = special.id;
    isAdmin = true;
    adminRole = special.adminRole;
  } else {
    id = generateRandomId(registry);
  }

  const account = { name, id, isAdmin, createdAt: Date.now() };

  registry[key] = { id, isAdmin };
  writeRegistry(registry);
  saveMyAccount(account);

  if (isAdmin && adminRole) {
    setAdminRole(adminRole);
    grantAdminEverything(ADMIN_DECORATION.id, ADMIN_EMOJI.id);
    credit(0); // синхронизировать событие кошелька, баланс не трогаем
  }

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
