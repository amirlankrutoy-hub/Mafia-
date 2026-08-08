// admin.js — роли: Admin | admin-setting | admin_support
// Вход ТОЛЬКО по паролю из футера (не по нику).

import { grantAdminEverything, credit, isAdminUnlocked } from "./wallet";
import { ADMIN_DECORATION, ADMIN_EMOJI } from "../data/shopData";

const ROLE_KEY = "mafia_admin_role_v1";
const BANS_KEY = "mafia_bans_v1";
const STATS_KEY = "mafia_site_stats_v1";
const ROLE_DISABLE_KEY = "mafia_role_disabled_v1";
const MAFIA_BOOST_KEY = "mafia_chance_boost_v1";

// Пароли (меняются только здесь)
const PASSWORDS = {
  Admin: "121314$admin",
  "admin-setting": "121314$setting",
  "admin_$_support": "121314$support"
};

export const ADMIN_ROLES = {
  Admin: {
    id: "Admin",
    label: "Admin",
    color: "#3b82f6",
    canBan: true,
    canUnban: true,
    canManageRoles: false,
    canSeeStats: false,
    canBoostMafia: true,
    protected: true
  },
  "admin-setting": {
    id: "admin-setting",
    label: "admin-setting",
    color: "#ef4444",
    canBan: true,
    canUnban: true,
    canManageRoles: true,
    canSeeStats: true,
    canBoostMafia: true,
    protected: true
  },
  "admin_$_support": {
    id: "admin_support",
    label: "admin-support",
    color: "#22c55e",
    canBan: true,
    canUnban: false,
    canManageRoles: false,
    canSeeStats: false,
    canBoostMafia: false,
    protected: false,
    grantCoins: 3000,
    telegram: "@Amir4k_Nurmatov"
  }
};

export function getAdminRole() {
  try {
    return localStorage.getItem(ROLE_KEY) || null;
  } catch {
    return null;
  }
}

export function getAdminRoleInfo() {
  const role = getAdminRole();
  if (!role) return null;
  return (
    Object.values(ADMIN_ROLES).find((r) => r.id === role || r.label === role) ||
    null
  );
}

export function isAnyAdmin() {
  return !!getAdminRole() || isAdminUnlocked();
}

export function isAdmin() {
  const role = getAdminRole();
  return role === "Admin" || role === "admin-setting" || isAdminUnlocked();
}

export function isProtectedAdminName(name) {
  if (!name) return false;
  const n = String(name).trim().toLowerCase();
  // защита по роли в сессии, не по нику
  return false;
}

export function setAdminRole(roleId) {
  if (!roleId) localStorage.removeItem(ROLE_KEY);
  else localStorage.setItem(ROLE_KEY, roleId);
  window.dispatchEvent(new CustomEvent("mafia-admin-changed"));
}

export function logoutAdmin() {
  setAdminRole(null);
}

/**
 * Вход по паролю из футера.
 * Возвращает { success, message, role? }
 */
export function tryUnlockAdmin(password) {
  const pwd = (password || "").trim();

  if (pwd === PASSWORDS.Admin) {
    setAdminRole("Admin");
    grantAdminEverything(ADMIN_DECORATION.id, ADMIN_EMOJI.id);
    return {
      success: true,
      role: ADMIN_ROLES.Admin,
      message: "Вход как Admin"
    };
  }

  if (pwd === PASSWORDS["admin-setting"]) {
    setAdminRole("admin-setting");
    grantAdminEverything(ADMIN_DECORATION.id, ADMIN_EMOJI.id);
    return {
      success: true,
      role: ADMIN_ROLES["admin-setting"],
      message: "Вход как admin-setting"
    };
  }

  if (pwd === PASSWORDS["admin_$_support"]) {
    setAdminRole("admin_support");
    credit(3000);
    return {
      success: true,
      role: ADMIN_ROLES["admin_$_support"],
      message: "Вход как admin-support. +3000 Мафио"
    };
  }

  return { success: false, message: "Неверный пароль" };
}

// ---------- Баны (по id игрока в лобби, не по свободному нику) ----------
function readBans() {
  try {
    const raw = localStorage.getItem(BANS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeBans(bans) {
  localStorage.setItem(BANS_KEY, JSON.stringify(bans));
  window.dispatchEvent(new CustomEvent("mafia-bans-changed"));
}

/**
 * Бан игрока из лобби.
 * target: { id, name }
 * duration: '1d' | '30d' | 'permanent'
 */
export function banLobbyPlayer({ target, duration, reason, bannedBy }) {
  if (!target?.id || !target?.name) {
    return { success: false, message: "Игрок не выбран" };
  }
  if (!reason?.trim()) {
    return { success: false, message: "Укажите причину бана" };
  }

  const myRole = getAdminRole();
  // support не может банить Admin / admin-setting (по их admin-роли в комнате)
  if (
    myRole === "admin_support" &&
    (target.adminRole === "Admin" || target.adminRole === "admin-setting")
  ) {
    const bans = readBans();
    bans[bannedBy || "self"] = {
      until: null,
      reason: "Попытка забанить админа",
      bannedBy: "system",
      duration: "permanent",
      at: Date.now(),
      name: bannedBy || "admin-support"
    };
    writeBans(bans);
    return {
      success: false,
      message:
        "Невозможно забанить админа. Вы получили бан до разбана администратором."
    };
  }

  let until = null;
  if (duration === "1d") until = Date.now() + 24 * 60 * 60 * 1000;
  else if (duration === "30d") until = Date.now() + 30 * 24 * 60 * 60 * 1000;

  const bans = readBans();
  // ключ — имя (для проверки при входе) + id
  const key = target.name.trim();
  bans[key] = {
    until,
    reason: reason.trim(),
    bannedBy: bannedBy || myRole || "Admin",
    duration,
    at: Date.now(),
    playerId: target.id,
    name: target.name
  };
  writeBans(bans);

  const text = encodeURIComponent(
    `🚨 Бан\nИгрок: ${target.name}\nСрок: ${duration}\nПричина: ${reason}\nКем: ${bannedBy || myRole}`
  );
  try {
    window.open(`https://t.me/Amir4k_Nurmatov?text=${text}`, "_blank");
  } catch (_) {}

  return { success: true, message: `«${target.name}» забанен (${duration})` };
}

export function unbanPlayer(targetName) {
  const bans = readBans();
  if (!bans[targetName]) return { success: false, message: "Игрок не в бане" };
  delete bans[targetName];
  writeBans(bans);
  return { success: true, message: `«${targetName}» разбанен` };
}

export function getBans() {
  const bans = readBans();
  const now = Date.now();
  let changed = false;
  for (const [name, info] of Object.entries(bans)) {
    if (info.until && info.until < now) {
      delete bans[name];
      changed = true;
    }
  }
  if (changed) writeBans(bans);
  return bans;
}

export function isBanned(name) {
  if (!name) return false;
  const bans = getBans();
  const info = bans[String(name).trim()];
  if (!info) return false;
  if (info.until && info.until < Date.now()) {
    unbanPlayer(name);
    return false;
  }
  return info;
}

// ---------- Статистика ----------
export function bumpSiteVisit() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
    s.visits = (s.visits || 0) + 1;
    s.lastVisit = Date.now();
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch (_) {}
}

export function getSiteStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
    return {
      visits: s.visits || 0,
      activePlayers: s.activePlayers || 0
    };
  } catch {
    return { visits: 0, activePlayers: 0 };
  }
}

/** Обновить число игроков в игре (вызывать из OnlinePlay/лобби) */
export function setActivePlayersCount(n) {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
    s.activePlayers = Math.max(0, Number(n) || 0);
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("mafia-stats-changed"));
  } catch (_) {}
}

// ---------- Отключение ролей (admin-setting) ----------
// { [roleId]: { until: number|null, duration: '1h'|'1d'|'permanent' } }
function readDisabledRoles() {
  try {
    return JSON.parse(localStorage.getItem(ROLE_DISABLE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeDisabledRoles(map) {
  localStorage.setItem(ROLE_DISABLE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("mafia-roles-disabled-changed"));
}

export function disableRole(roleId, duration) {
  const map = readDisabledRoles();
  let until = null;
  if (duration === "1h") until = Date.now() + 60 * 60 * 1000;
  else if (duration === "1d") until = Date.now() + 24 * 60 * 60 * 1000;
  // permanent → until = null
  map[roleId] = { until, duration, at: Date.now() };
  writeDisabledRoles(map);
  return { success: true };
}

export function enableRole(roleId) {
  const map = readDisabledRoles();
  delete map[roleId];
  writeDisabledRoles(map);
  return { success: true };
}

export function getDisabledRoles() {
  const map = readDisabledRoles();
  const now = Date.now();
  let changed = false;
  for (const [id, info] of Object.entries(map)) {
    if (info.until && info.until < now) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) writeDisabledRoles(map);
  return map;
}

/** Роль скрыта / недоступна прямо сейчас? */
export function isRoleDisabled(roleId) {
  const info = getDisabledRoles()[roleId];
  if (!info) return false;
  if (info.until && info.until < Date.now()) {
    enableRole(roleId);
    return false;
  }
  return info;
}

/** Текст для карточки: «откроется …» или «удалена навсегда» */
export function getRoleDisableLabel(roleId) {
  const info = isRoleDisabled(roleId);
  if (!info) return null;
  if (!info.until || info.duration === "permanent") {
    return "Роль удалена навсегда";
  }
  return `Откроется: ${new Date(info.until).toLocaleString("ru-RU")}`;
}

// ---------- Шанс на мафию (Admin + admin-setting) ----------
// { [playerId or playerName]: weight }  weight > 1 = выше шанс
function readMafiaBoosts() {
  try {
    return JSON.parse(localStorage.getItem(MAFIA_BOOST_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMafiaBoosts(map) {
  localStorage.setItem(MAFIA_BOOST_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("mafia-boost-changed"));
}

export function setMafiaBoost(playerKey, weight = 3) {
  const map = readMafiaBoosts();
  map[playerKey] = Math.max(1, Number(weight) || 3);
  writeMafiaBoosts(map);
  return { success: true };
}

export function clearMafiaBoost(playerKey) {
  const map = readMafiaBoosts();
  delete map[playerKey];
  writeMafiaBoosts(map);
  return { success: true };
}

export function getMafiaBoosts() {
  return readMafiaBoosts();
}

export function getMafiaBoost(playerKey) {
  return readMafiaBoosts()[playerKey] || 1;
}
