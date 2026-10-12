// admin.js — единая админ-панель. Вход и ВСЕ действия проверяет сервер:
// пароль больше не хранится в коде сайта (раньше его мог прочитать любой
// в исходниках страницы), баны и отключение ролей действуют на всех игроков.
import { socket } from "../socket";
import { grantAdminEverything } from "./wallet";
import { ADMIN_DECORATION, ADMIN_EMOJI } from "../data/shopData";

const TOKEN_KEY = "mafia_admin_token_v2";
const EVENT = "mafia-admin-changed";

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
  window.dispatchEvent(new CustomEvent(EVENT));
}

function call(event, payload) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve({ success: false, message: "Сервер не отвечает" });
      }
    }, 8000);
    const cb = (res) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(res || { success: false });
    };
    if (payload === undefined) socket.emit(event, cb);
    else socket.emit(event, payload, cb);
  });
}

/** Есть сохранённый вход админа на этом устройстве */
export function isAdmin() {
  return !!readToken();
}

export function onAdminChanged(cb) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export async function loginAdmin(password) {
  const res = await call("admin:login", password);
  if (res.success && res.token) {
    writeToken(res.token);
    grantAdminEverything(ADMIN_DECORATION.id, ADMIN_EMOJI.id);
  }
  return res;
}

/** Восстановить сессию админа после переподключения сокета */
export async function resumeAdmin() {
  const token = readToken();
  if (!token) return false;
  const res = await call("admin:resume", token);
  if (!res.success) writeToken(null);
  return !!res.success;
}

export function logoutAdmin() {
  const token = readToken();
  if (token) socket.emit("admin:logout", token);
  writeToken(null);
}

// Обёртка: если сервер забыл сессию (перезапуск) — пробуем восстановить и повторить
async function adminCall(event, payload) {
  let res = await call(event, payload);
  if (!res.success && res.message === "Нет доступа" && (await resumeAdmin())) {
    res = await call(event, payload);
  }
  return res;
}

export const adminOverview = () => adminCall("admin:overview");
export const adminSearch = (query) => adminCall("admin:search", query);
export const adminPlayer = (accountId) => adminCall("admin:player", accountId);
export const adminBan = (accountId, duration, reason) => adminCall("admin:ban", { accountId, duration, reason });
export const adminUnban = (accountId) => adminCall("admin:unban", accountId);
export const adminBans = () => adminCall("admin:bans");
export const adminGive = (accountId, amount) => adminCall("admin:give", { accountId, amount });
export const adminCloseRoom = (code) => adminCall("admin:close-room", code);
export const adminDisableRole = (roleId, duration) => adminCall("admin:disable-role", { roleId, duration });
export const adminEnableRole = (roleId) => adminCall("admin:enable-role", roleId);
export const adminAnnounce = (text) => adminCall("admin:announce", text);

// ---------- Отключённые роли (кэш для галереи/настройки партии) ----------
let disabledCache = {};

export function setDisabledRolesCache(map) {
  disabledCache = map || {};
  window.dispatchEvent(new CustomEvent("mafia-roles-disabled-changed"));
}

export function getDisabledRoles() {
  return disabledCache;
}

export function isRoleDisabled(roleId) {
  const info = disabledCache[roleId];
  if (!info) return false;
  if (info.until && info.until < Date.now()) return false;
  return info;
}

export function getRoleDisableLabel(roleId) {
  const info = isRoleDisabled(roleId);
  if (!info) return null;
  if (!info.until) return "Роль отключена";
  return `Откроется: ${new Date(info.until).toLocaleString("ru-RU")}`;
}

// ---------- Совместимость со старыми вызовами ----------
export const isAnyAdmin = isAdmin;
export function getAdminRoleInfo() {
  return isAdmin() ? { id: "admin", label: "Администратор", color: "#d4af37" } : null;
}
export function bumpSiteVisit() {}
export function isBanned() {
  return false;
}

// ---------- Саппорты и их сообщения ----------
export const adminSetSupport = (accountId, support) => adminCall("admin:set-support", { accountId, support });
export const adminSupports = () => adminCall("admin:supports");
export const adminReports = () => adminCall("admin:reports");
export const adminReportDone = (id, done) => adminCall("admin:report-done", { id, done });
