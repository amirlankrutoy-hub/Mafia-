// admin.js — роли: Admin | admin-setting | admin_support
// Хранение в localStorage (клиентский уровень, как и wallet).

import { grantAdminEverything, credit, isAdminUnlocked } from "./wallet";
import { ADMIN_DECORATION, ADMIN_EMOJI } from "../data/shopData";

const ROLE_KEY = "mafia_admin_role_v1";
const BANS_KEY = "mafia_bans_v1";
const STATS_KEY = "mafia_site_stats_v1";

// Специальные ники, которые дают роль при входе
export const ADMIN_ROLES = {
  Admin: {
    id: "Admin",
    label: "Admin",
    color: "#3b82f6", // blue
    canBan: true,
    canUnban: true,
    canManageRoles: false,
    canSeeStats: false,
    protected: true
  },
  "admin-setting": {
    id: "admin-setting",
    label: "admin-setting",
    color: "#ef4444", // red
    canBan: true,
    canUnban: true,
    canManageRoles: true,
    canSeeStats: true,
    protected: true
  },
  "admin_$_support": {
    id: "admin_support",
    label: "admin-support",
    color: "#22c55e", // green
    canBan: true,
    canUnban: false,
    canManageRoles: false,
    canSeeStats: false,
    protected: false,
    grantCoins: 3000,
    telegram: "@Amir4k_Nurmatov"
  }
};

const ADMIN_PASSWORD = "121314$admin";

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
  return Object.values(ADMIN_ROLES).find((r) => r.id === role || r.label === role) || null;
}

export function isAnyAdmin() {
  return !!getAdminRole() || isAdminUnlocked();
}

export function isProtectedAdmin(name) {
  if (!name) return false;
  const n = name.trim();
  return n === "Admin" || n === "admin-setting";
}

export function setAdminRole(roleId) {
  if (!roleId) {
    localStorage.removeItem(ROLE_KEY);
  } else {
    localStorage.setItem(ROLE_KEY, roleId);
  }
  window.dispatchEvent(new CustomEvent("mafia-admin-changed"));
}

export function logoutAdmin() {
  setAdminRole(null);
}

/** Вызывается при сохранении ника */
export function tryLoginAsAdminByName(name) {
  const n = (name || "").trim();

  if (n === "Admin") {
    setAdminRole("Admin");
    grantAdminEverything(ADMIN_DECORATION.id, ADMIN_EMOJI.id);
    return { success: true, role: ADMIN_ROLES.Admin, message: "Вход как Admin" };
  }

  if (n === "admin-setting") {
    setAdminRole("admin-setting");
    grantAdminEverything(ADMIN_DECORATION.id, ADMIN_EMOJI.id);
    return { success: true, role: ADMIN_ROLES["admin-setting"], message: "Вход как admin-setting" };
  }

  if (n === "admin_$_support") {
    setAdminRole("admin_support");
    credit(3000);
    return {
      success: true,
      role: ADMIN_ROLES["admin_$_support"],
      message: "Вход как admin-support. +3000 Мафио. Telegram: @Amir4k_Nurmatov"
    };
  }

  return { success: false };
}

export function tryUnlockAdmin(password) {
  if (password !== ADMIN_PASSWORD) {
    return { success: false, message: "Неверный пароль" };
  }
  setAdminRole("Admin");
  grantAdminEverything(ADMIN_DECORATION.id, ADMIN_EMOJI.id);
  return { success: true, message: "Доступ открыт: Admin" };
}

export function isAdmin() {
  const role = getAdminRole();
  return role === "Admin" || role === "admin-setting" || isAdminUnlocked();
}

// ---------- Баны ----------
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
 * duration: '1d' | '30d' | 'permanent'
 * reason обязателен
 */
export function banPlayer({ targetName, duration, reason, bannedBy }) {
  if (!targetName || !reason?.trim()) {
    return { success: false, message: "Укажите игрока и причину бана" };
  }

  if (isProtectedAdmin(targetName)) {
    // support tries to ban Admin / admin-setting → self-ban
    const byRole = getAdminRole();
    if (byRole === "admin_support") {
      const until = null; // permanent until unban by admin
      const bans = readBans();
      bans[bannedBy || "admin_support"] = {
        until,
        reason: "Попытка забанить админа",
        bannedBy: "system",
        duration: "permanent",
        at: Date.now()
      };
      writeBans(bans);
      return {
        success: false,
        message: "Невозможно забанить админа. Вы получили бан до разбана администратором."
      };
    }
    return { success: false, message: "Невозможно забанить админа" };
  }

  let until = null;
  if (duration === "1d") until = Date.now() + 24 * 60 * 60 * 1000;
  else if (duration === "30d") until = Date.now() + 30 * 24 * 60 * 60 * 1000;
  // permanent → until = null

  const bans = readBans();
  bans[targetName.trim()] = {
    until,
    reason: reason.trim(),
    bannedBy: bannedBy || getAdminRole() || "Admin",
    duration,
    at: Date.now()
  };
  writeBans(bans);

  // «отправить причину» — открываем Telegram с текстом
  const text = encodeURIComponent(
    `🚨 Бан\nИгрок: ${targetName}\nСрок: ${duration}\nПричина: ${reason}\nКем: ${bannedBy || getAdminRole()}`
  );
  try {
    window.open(`https://t.me/Amir4k_Nurmatov?text=${text}`, "_blank");
  } catch (_) {}

  return { success: true, message: `Игрок «${targetName}» забанен (${duration})` };
}

export function unbanPlayer(targetName) {
  const bans = readBans();
  if (!bans[targetName]) return { success: false, message: "Игрок не в бане" };
  delete bans[targetName];
  writeBans(bans);
  return { success: true, message: `Игрок «${targetName}» разбанен` };
}

export function getBans() {
  const bans = readBans();
  const now = Date.now();
  // авто-очистка истёкших
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
  const info = bans[name.trim()];
  if (!info) return false;
  if (info.until && info.until < Date.now()) {
    unbanPlayer(name);
    return false;
  }
  return info;
}

// ---------- Статистика (локальная + эвристика) ----------
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
      // «сколько игроков играют» — без серверной метрики показываем локальный счётчик
      activeHint: "Смотрите комнаты на сервере / онлайн-лобби"
    };
  } catch {
    return { visits: 0, activeHint: "—" };
  }
}

export function setPlayerRoleOverride(/* name, roleId */) {
  // заглушка под будущее серверное управление ролями
  return { success: true };
}
