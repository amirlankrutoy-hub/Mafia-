// solo.js — «Одиночный режим»: комнаты без мэра, роли выпадают случайно из своих.
import { socket } from "../socket";
import { getWallet } from "./wallet";

const TIMEOUT_MS = 25000;

function request(event, ...args) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    const t = setTimeout(() => resolve({ success: false, message: "Сервер не отвечает. Попробуйте ещё раз." }), TIMEOUT_MS);
    socket.emit(event, ...args, (res) => {
      clearTimeout(t);
      resolve(res || { success: false });
    });
  });
}

/** Роли, которые есть у игрока (выпадают только они) */
export function myOwnedRoles() {
  return getWallet().ownedRoles || [];
}

export const soloCreate = (player) => request("solo:create", { ...player, ownedRoles: myOwnedRoles() });
export const soloFind = (player) => request("solo:find", { ...player, ownedRoles: myOwnedRoles() });
export const soloStart = (roomCode) => request("solo:start", roomCode);
export const soloInfo = () => request("solo:info");
export const sendOwnedRoles = (roomCode) => socket.emit("solo:owned-roles", roomCode, myOwnedRoles());

/** То же правило, что на сервере: сколько мафии и нейтралов при n игроках */
export function soloFactionCounts(n) {
  if (n < 7) return { mafia: 1, neutral: n >= 4 ? 1 : 0 };
  if (n <= 10) return { mafia: 2, neutral: 1 };
  const k = Math.ceil((n - 10) / 5);
  return { mafia: 2 + k, neutral: 1 + k };
}

export const SOLO_MIN_PLAYERS = 4;
