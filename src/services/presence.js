// presence.js — онлайн-статус, друзья (заявки), приглашения, профиль, рейтинг.
import { socket } from "../socket";
import { getAuthToken } from "./auth";

const ACK_TIMEOUT_MS = 8000;

function ensureConnected() {
  if (!socket.connected) socket.connect();
}

// emit с ответом и таймаутом: интерфейс не "зависает", если сервер молчит
function request(event, payload, fallback) {
  return new Promise((resolve) => {
    ensureConnected();
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(fallback);
    }, ACK_TIMEOUT_MS);
    const cb = (res) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(res ?? fallback);
    };
    if (payload === undefined) socket.emit(event, cb);
    else socket.emit(event, payload, cb);
  });
}

function subscribe(event, callback) {
  socket.on(event, callback);
  return () => socket.off(event, callback);
}

const NO_ANSWER = { success: false, message: "Сервер не отвечает. Попробуйте ещё раз." };

/** Сообщить серверу, кто я. Вызывается на каждое (пере)подключение — см. GlobalEvents */
export function announcePresence(accountId, name) {
  if (!accountId) return;
  ensureConnected();
  socket.emit("presence:hello", accountId, name, getAuthToken());
}

export const onPresenceChanged = (cb) => subscribe("presence:changed", cb);

export const searchByAccountId = (id) => request("presence:search", id, null);

export function fetchBulkStatus(ids) {
  if (!ids?.length) return Promise.resolve([]);
  return request("presence:bulk", ids, []);
}

export function checkNameAvailable(name, accountId) {
  return request("account:check-name", { name, accountId }, { available: true });
}

export const renameAccount = (name) => request("account:rename", { name }, NO_ANSWER);

// ---------- Профиль ----------
export const getProfile = (accountId) => request("profile:get", accountId, null);

export function updateProfile({ accountId, icon, favoriteRole, name }) {
  ensureConnected();
  socket.emit("profile:update", { accountId, icon, favoriteRole, name });
}

/** Победы теперь засчитывает сервер — оставлено для совместимости */
export function registerWin() {}

export const onProfileChanged = (cb) => subscribe("profile:changed", cb);

// ---------- Рейтинг ----------
export const getLeaderboard = () =>
  request("leaderboard:get", undefined, null).then((res) => {
    if (!res) return null;
    // старый сервер возвращал просто массив
    if (Array.isArray(res)) return { list: res.map((p, i) => ({ ...p, rank: i + 1 })), me: null, total: res.length };
    return res;
  });

// ---------- Друзья ----------
export const sendFriendRequest = (toAccountId) =>
  request("friend:request", { toAccountId }, NO_ANSWER);

export const respondFriendRequest = (fromAccountId, accept) =>
  request("friend:respond", { fromAccountId, accept }, NO_ANSWER);

export const cancelFriendRequest = (toAccountId) =>
  request("friend:cancel", { toAccountId }, NO_ANSWER);

export const getFriendRequests = () =>
  request("friend:requests", undefined, { incoming: [], outgoing: [] });

export const removeFriend = (friendId) => request("friend:remove", { friendId }, NO_ANSWER);

export const getFriendsList = (accountId) => request("friend:get-list", accountId, []);

export const inviteFriend = (toAccountId, roomCode) =>
  request("friend:invite", { toAccountId, roomCode }, NO_ANSWER);

export const onFriendRequestIncoming = (cb) => subscribe("friend:request-incoming", cb);
export const onFriendRequests = (cb) => subscribe("friend:requests", cb);
export const onFriendAccepted = (cb) => subscribe("friend:accepted", cb);
export const onFriendDeclined = (cb) => subscribe("friend:declined", cb);
export const onFriendRequestCancelled = (cb) => subscribe("friend:request-cancelled", cb);
export const onFriendRemoved = (cb) => subscribe("friend:removed", cb);
export const onFriendInvite = (cb) => subscribe("friend:invite", cb);

// ---------- "Постучаться" в комнату друга ----------
export const knockOnRoom = ({ roomCode }) => request("friend:knock", { roomCode }, NO_ANSWER);

export const onIncomingFriendRequest = (cb) => subscribe("friend:incoming-request", cb);

export function respondToFriendRequest({ roomCode, requesterSocketId, requesterAccountId, accepted }) {
  socket.emit("friend:mayor-response", { roomCode, requesterSocketId, requesterAccountId, accepted });
}

export const onFriendJoinDecision = (cb) => subscribe("friend:join-decision", cb);

// ---------- Отключённые админом роли ----------
export const getDisabledRolesRemote = () => request("roles:get-disabled", undefined, {});
export const onDisabledRolesChanged = (cb) => subscribe("roles:disabled", cb);

// ---------- Саппорт: сообщение администратору ----------
export const sendSupportReport = (type, text, targetId) =>
  request("support:report", { type, text, targetId }, NO_ANSWER);

// ---------- Личные сообщения друзьям ----------
export const sendDirectMessage = (to, text) => request("dm:send", { to, text }, NO_ANSWER);
export const getDirectHistory = (withId) => request("dm:history", { with: withId }, []);
export const onDirectMessage = (cb) => subscribe("dm:message", cb);
