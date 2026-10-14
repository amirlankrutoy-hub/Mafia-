// auth.js — вход через Google / почту и облачное сохранение прогресса.
// Прогресс (Токены, тени, покупки, достижения, аватарка, настройки) хранится
// в браузере и копируется на сервер. При входе на новом устройстве или после
// очистки данных сайта он восстанавливается.
import { socket } from "../socket";

const AUTH_KEY = "mafia_auth_v1"; // { token, method, links }
const ACCOUNT_KEY = "mafia_account_v1";
const SYNC_PREFIXES = [
  "mafia_wallet_v1",
  "mafia_teni_v1",
  "mafia_achievements_v1",
  "mafia_abilities_owned_v1",
  "mafia_selected_avatar_v1",
  "mafia_favorite_role_v1",
  "mafia_recent_players_v1",
  "mafia_recent_emojis_v1",
  "mafia_topups_done_v1",
  "mafia_settings_v1",
  "mafia_event_court_v1",
  "mafia_language",
  "mafia_menu_muted",
  "mafia_lobby_muted"
];
const ACK_TIMEOUT_MS = 15000;

function request(event, payload) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    const t = setTimeout(() => resolve({ success: false, message: "Сервер не отвечает. Попробуйте ещё раз." }), ACK_TIMEOUT_MS);
    const cb = (res) => {
      clearTimeout(t);
      resolve(res || { success: false });
    };
    if (payload === undefined) socket.emit(event, cb);
    else socket.emit(event, payload, cb);
  });
}

// ---------- локальное состояние ----------
export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return getAuth()?.token || null;
}

function setAuth(auth) {
  try {
    if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    else localStorage.removeItem(AUTH_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent("mafia-auth-changed"));
}

const isSyncKey = (k) => SYNC_PREFIXES.some((p) => k === p || k.startsWith(p + "_"));

export function collectSave() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isSyncKey(k)) data[k] = localStorage.getItem(k);
    }
  } catch {}
  return data;
}

function applySave(save) {
  if (!save || typeof save !== "object") return false;
  try {
    // убираем прогресс прошлого аккаунта этого устройства
    Object.keys(collectSave()).forEach((k) => localStorage.removeItem(k));
    Object.entries(save).forEach(([k, v]) => {
      if (isSyncKey(k) && typeof v === "string") localStorage.setItem(k, v);
    });
    return true;
  } catch {
    return false;
  }
}

function clearProgress() {
  try {
    Object.keys(collectSave()).forEach((k) => {
      if (k !== "mafia_language" && k !== "mafia_settings_v1") localStorage.removeItem(k);
    });
  } catch {}
}

function saveAccount(account) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ name: account.name, id: account.id, createdAt: account.createdAt || Date.now() }));
}

// ---------- облачное сохранение ----------
let lastPushed = "";
export async function pushSave(force = false) {
  const token = getAuthToken();
  if (!token) return;
  const data = collectSave();
  const json = JSON.stringify(data);
  if (!force && json === lastPushed) return;
  const res = await request("save:push", { token, data });
  if (res?.success) lastPushed = json;
}

let syncStarted = false;
export function startCloudSync() {
  if (syncStarted) return;
  syncStarted = true;
  setInterval(() => pushSave(), 20000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pushSave();
  });
  window.addEventListener("pagehide", () => pushSave());
  // важные события — сохраняем сразу
  ["mafia-wallet-changed", "mafia-teni-changed", "mafia-achievements-changed", "mafia-abilities-changed", "mafia-avatar-changed"].forEach((ev) =>
    window.addEventListener(ev, () => setTimeout(() => pushSave(), 1500))
  );
}

// ---------- вход ----------
/**
 * Итог успешного входа: аккаунт + токен. Если на сервере есть сохранение —
 * подставляем его и перезагружаем страницу; иначе отправляем свой прогресс.
 */
async function finishLogin(res, { keepLocal = false } = {}) {
  if (!res?.success) return res;
  const current = (() => {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    } catch {
      return null;
    }
  })();
  const sameAccount = current?.id === res.account.id;
  setAuth({ token: res.token, method: res.method, links: res.links });
  saveAccount(res.account);

  if (res.save && Object.keys(res.save).length > 1) {
    applySave(res.save);
    lastPushed = JSON.stringify(collectSave());
    if (window.location.pathname.startsWith("/auth/")) window.location.replace("/");
    else window.location.reload();
    return { ...res, reloading: true };
  }
  if (!sameAccount && !keepLocal) clearProgress();
  await pushSave(true);
  window.dispatchEvent(new CustomEvent("mafia-account-changed"));
  return res;
}

const myId = () => {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null")?.id || null;
  } catch {
    return null;
  }
};

let configPromise = null;
export async function getAuthConfig() {
  if (!configPromise) {
    configPromise = request("auth:config").then((res) => {
      if (res?.success === false) configPromise = null; // сервер не ответил — спросим ещё раз позже
      return { googleClientId: res?.googleClientId || null, clerkPublishableKey: res?.clerkPublishableKey || null };
    });
  }
  return configPromise;
}

export async function loginWithEmail(email, password) {
  return finishLogin(await request("auth:email-login", { email, password }));
}

/** Регистрация: если на устройстве уже есть гостевой аккаунт — его прогресс переносится */
export async function registerWithEmail(email, password, name) {
  return finishLogin(await request("auth:email-register", { email, password, name, claimId: myId() }), { keepLocal: true });
}

export async function loginWithGoogle(credential) {
  return finishLogin(await request("auth:google", { credential, claimId: myId() }), { keepLocal: true });
}

/** Google через Clerk: clerkToken — токен сессии Clerk */
export async function loginWithGoogleClerk(clerkToken) {
  return finishLogin(await request("auth:google", { clerkToken, claimId: myId() }), { keepLocal: true });
}

export async function linkGoogle(credential, clerkToken) {
  const res = await request("auth:link-google", { credential, clerkToken, token: getAuthToken() });
  if (res?.success) {
    setAuth({ ...(getAuth() || {}), token: res.token, links: res.links, method: getAuth()?.method || "google" });
    pushSave(true);
  }
  return res;
}

export async function linkEmail(email, password) {
  const res = await request("auth:link-email", { email, password, token: getAuthToken() });
  if (res?.success) {
    setAuth({ ...(getAuth() || {}), token: res.token, links: res.links, method: getAuth()?.method || "email" });
    pushSave(true);
  }
  return res;
}

/** При открытии сайта: { ok } или { needLogin } — аккаунт привязан, а входа нет */
export async function resumeSession() {
  const token = getAuthToken();
  const res = await request("auth:resume", { token, accountId: myId() });
  if (res?.success) {
    setAuth({ ...(getAuth() || {}), links: res.links });
    return { ok: true };
  }
  if (res?.needLogin) return { needLogin: true };
  if (token && res && res.success === false && res.needLogin === false) setAuth(null); // токен устарел, аккаунт гостевой
  return { ok: false };
}

/** Выход: прогресс уже на сервере, на устройстве его стираем */
export async function logout() {
  await pushSave(true);
  await request("auth:logout", { token: getAuthToken() });
  forgetLocalAccount();
  window.location.reload();
}

/** Забыть аккаунт на этом устройстве (без запроса к серверу) */
export function forgetLocalAccount() {
  setAuth(null);
  clearProgress();
  try {
    localStorage.removeItem(ACCOUNT_KEY);
    localStorage.removeItem("mafia_admin_token_v2");
  } catch {}
  window.dispatchEvent(new CustomEvent("mafia-account-changed"));
}

// ---------- Google Identity Services ----------
let gsiPromise = null;
export function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => resolve(window.google);
      s.onerror = () => {
        gsiPromise = null;
        reject(new Error("Google недоступен"));
      };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}
