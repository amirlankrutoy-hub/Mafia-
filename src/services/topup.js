// topup.js — покупка Токенов за звёзды Telegram.
// Сервер создаёт счёт, Telegram подтверждает оплату, сервер присылает
// "topup:success" — только тогда Токены зачисляются на баланс.
import { socket } from "../socket";
import { credit } from "./wallet";

const DONE_KEY = "mafia_topups_done_v1"; // уже зачисленные заказы — защита от двойного начисления

function readDone() {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function createTopup(packageId) {
  return new Promise((resolve) => {
    if (!socket.connected) socket.connect();
    const t = setTimeout(() => resolve({ success: false, message: "Сервер не отвечает. Попробуйте ещё раз." }), 20000);
    socket.emit("topup:create", { packageId }, (res) => {
      clearTimeout(t);
      resolve(res || { success: false });
    });
  });
}

/** Обработать подтверждённую сервером оплату. Возвращает true, если Токены зачислены сейчас. */
export function applyTopup({ orderId, amount, stars }) {
  const done = readDone();
  const fresh = !done.includes(orderId);
  if (fresh) {
    credit(amount);
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify([...done, orderId].slice(-200)));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("mafia-topup-success", { detail: { orderId, amount, stars } }));
  }
  socket.emit("topup:ack", orderId);
  return fresh;
}
