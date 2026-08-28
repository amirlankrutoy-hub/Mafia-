// presence.js — онлайн-статус и заявки на вход через мэра ("постучаться").
import { socket } from "../socket";

/** Сообщить серверу, кто я (вызывать после connect и при смене экрана) */
export function announcePresence(accountId, name) {
  if (!accountId) return;
  if (!socket.connected) socket.connect();
  socket.emit("presence:hello", accountId, name);
}

/** Подписка на изменения чьего-то статуса { accountId, online, name, roomCode, isMayor } */
export function onPresenceChanged(callback) {
  socket.on("presence:changed", callback);
  return () => socket.off("presence:changed", callback);
}

/** Поиск игрока по ID */
export function searchByAccountId(id) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit("presence:search", id, (result) => resolve(result));
  });
}

/** Статус сразу нескольких ID (для списков друзей/недавних) */
export function fetchBulkStatus(ids) {
  return new Promise((resolve) => {
    if (!ids?.length) return resolve([]);
    if (!socket.connected) socket.connect();
    socket.emit("presence:bulk", ids, (list) => resolve(list || []));
  });
}

/** Постучаться в комнату мэра-друга */
export function knockOnRoom({ toAccountId, roomCode, fromAccountId, fromName }) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit(
      "friend:knock",
      { toAccountId, roomCode, fromAccountId, fromName },
      (result) => resolve(result)
    );
  });
}

/** Мэр: подписка на входящие заявки друзей */
export function onIncomingFriendRequest(callback) {
  socket.on("friend:incoming-request", callback);
  return () => socket.off("friend:incoming-request", callback);
}

/** Мэр: ответ на заявку */
export function respondToFriendRequest({ roomCode, requesterSocketId, accepted }) {
  socket.emit("friend:mayor-response", { roomCode, requesterSocketId, accepted });
}

/** Проситель: подписка на решение мэра */
export function onFriendJoinDecision(callback) {
  socket.on("friend:join-decision", callback);
  return () => socket.off("friend:join-decision", callback);
}

// ==========================
// Публичный профиль (иконка / любимая роль / победы)
// ==========================

/** Получить публичный профиль игрока по ID */
export function getProfile(accountId) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit("profile:get", accountId, (p) => resolve(p));
  });
}

/** Обновить свой публичный профиль (видно другим игрокам сразу) */
export function updateProfile({ accountId, icon, favoriteRole, wins, name }) {
  if (!socket.connected) socket.connect();
  socket.emit("profile:update", { accountId, icon, favoriteRole, wins, name });
}

/** Засчитать себе победу (вызывать один раз в конце игры, если реально играл и победил) */
export function registerWin(accountId) {
  if (!accountId) return;
  if (!socket.connected) socket.connect();
  socket.emit("profile:register-win", accountId);
}

/** Топ-200 игроков по числу побед (вкладка "Мир") */
export function getLeaderboard() {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit("leaderboard:get", (list) => resolve(list || []));
  });
}

/** Подписка: чей-то профиль изменился (например, сменил иконку) */
export function onProfileChanged(callback) {
  socket.on("profile:changed", callback);
  return () => socket.off("profile:changed", callback);
}

// ==========================
// Друзья — без заявок и подтверждений: добавление сразу мгновенное и
// взаимное. Список хранится на сервере (переживает смену устройства и
// перезапуск сервера), поэтому у обоих игроков он появляется сразу.
// ==========================

/** Добавить в друзья — сразу и взаимно, без подтверждения второй стороны */
export function addFriendMutual({ toAccountId, fromAccountId, fromName, fromIcon }) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit(
      "friend:add",
      { toAccountId, fromAccountId, fromName, fromIcon },
      (res) => resolve(res)
    );
  });
}

/** Удалить из друзей — тоже сразу и взаимно */
export function removeFriendMutual({ myAccountId, friendId }) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit("friend:remove", { myAccountId, friendId }, (res) => resolve(res));
  });
}

/** Мой актуальный список друзей (с сервера — не только с этого устройства) */
export function getFriendsList(accountId) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit("friend:get-list", accountId, (list) => resolve(list || []));
  });
}

/** Подписка: кто-то добавил меня в друзья прямо сейчас (живое обновление) */
export function onFriendAdded(callback) {
  socket.on("friend:added", callback);
  return () => socket.off("friend:added", callback);
}

/** Подписка: кто-то удалил меня из друзей */
export function onFriendRemoved(callback) {
  socket.on("friend:removed", callback);
  return () => socket.off("friend:removed", callback);
}