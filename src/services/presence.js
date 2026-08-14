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
