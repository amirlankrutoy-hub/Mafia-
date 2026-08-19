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

/** Подписка: чей-то профиль изменился (например, сменил иконку) */
export function onProfileChanged(callback) {
  socket.on("profile:changed", callback);
  return () => socket.off("profile:changed", callback);
}

// ==========================
// Заявки в друзья
// ==========================

/** Отправить заявку в друзья */
export function sendFriendRequest({ toAccountId, fromAccountId, fromName, fromIcon }) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit(
      "friend:request-send",
      { toAccountId, fromAccountId, fromName, fromIcon },
      (res) => resolve(res)
    );
  });
}

/** Отменить свою уже отправленную заявку (повторное нажатие "Дружить") */
export function cancelFriendRequest({ toAccountId, fromAccountId }) {
  socket.emit("friend:request-cancel", { toAccountId, fromAccountId });
}

/** Мои входящие заявки (для вкладки "Заявки") */
export function getFriendRequests(accountId) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit("friend:get-requests", accountId, (list) => resolve(list || []));
  });
}

/** Принять/отклонить входящую заявку */
export function respondFriendRequest({ myAccountId, fromAccountId, accepted }) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    socket.emit(
      "friend:request-respond",
      { toAccountId: myAccountId, fromAccountId, accepted },
      (res) => resolve(res)
    );
  });
}

/** Подписка: мне прислали новую заявку в друзья (живое уведомление) */
export function onFriendRequestReceived(callback) {
  socket.on("friend:request-received", callback);
  return () => socket.off("friend:request-received", callback);
}

/** Подписка: кто-то принял мою заявку в друзья */
export function onFriendRequestAccepted(callback) {
  socket.on("friend:request-accepted", callback);
  return () => socket.off("friend:request-accepted", callback);
}
