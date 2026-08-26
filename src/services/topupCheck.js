// topupCheck.js — периодически спрашивает у Telegram-бота "мне начислили
// что-то?" по ID аккаунта и, если да, зачисляет на локальный кошелёк.
//
// ВАЖНО: BOT_API_URL должен указывать на реально задеплоенный бот
// (публичный https-адрес). Пока бот работает только локально на
// компьютере администратора, эта проверка не найдёт сервер и просто
// будет тихо ничего не делать — это ожидаемо на этом этапе.

import { credit } from "./wallet";

// Задаётся при сборке через переменную окружения Vite (.env сайта):
// VITE_BOT_API_URL=https://<домен-бота>
const BOT_API_URL = import.meta.env?.VITE_BOT_API_URL || "";

const POLL_INTERVAL_MS = 15000;
let intervalId = null;

async function checkOnce(accountId) {
  if (!BOT_API_URL || !accountId) return;

  try {
    const res = await fetch(`${BOT_API_URL}/api/credits/${accountId}`);
    if (!res.ok) return;
    const data = await res.json();
    const amount = Number(data?.amount) || 0;

    if (amount > 0) {
      credit(amount);
      window.dispatchEvent(
        new CustomEvent("mafia-topup-received", { detail: { amount } })
      );
    }
  } catch (e) {
    // Бот недоступен (не задеплоен / нет сети) — молча пропускаем попытку
  }
}

/** Запустить периодическую проверку начислений для аккаунта. Вызвать один раз, когда account готов. */
export function startTopupPolling(accountId) {
  stopTopupPolling();
  if (!accountId) return;

  checkOnce(accountId); // сразу при старте, не дожидаясь первого интервала
  intervalId = setInterval(() => checkOnce(accountId), POLL_INTERVAL_MS);
}

export function stopTopupPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
