// teniWallet.js — валюта "Кристаллы теней", выдаётся за достижения.
// Хранится локально, привязана к конкретному ID аккаунта (см. комментарий
// в wallet.js — раньше был общий ключ на весь браузер, что путало балансы
// разных аккаунтов на одном устройстве).

const TENI_KEY = "mafia_teni_v1";
const ACCOUNT_KEY = "mafia_account_v1";

function getCurrentAccountId() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.id || null;
  } catch {
    return null;
  }
}

function teniKey() {
  const id = getCurrentAccountId();
  if (!id) return TENI_KEY;

  const perAccountKey = `${TENI_KEY}_${id}`;
  try {
    if (!localStorage.getItem(perAccountKey)) {
      const legacy = localStorage.getItem(TENI_KEY);
      if (legacy) localStorage.setItem(perAccountKey, legacy);
    }
  } catch {
    // ignore
  }
  return perAccountKey;
}

function readBalance() {
  try {
    const raw = localStorage.getItem(teniKey());
    return raw ? Math.max(0, Number(JSON.parse(raw).balance) || 0) : 0;
  } catch {
    return 0;
  }
}

function writeBalance(balance) {
  localStorage.setItem(teniKey(), JSON.stringify({ balance }));
  window.dispatchEvent(new CustomEvent("mafia-teni-changed"));
}

export function getTeniBalance() {
  return readBalance();
}

export function creditTeni(amount) {
  const value = Math.max(0, Math.floor(Number(amount)) || 0);
  if (!value) return readBalance();
  const next = readBalance() + value;
  writeBalance(next);
  return next;
}

/** Списание для обмена теней на Мафио (используется следующим блоком) */
/** Изменить баланс теней на delta (админ), не ниже 0 */
export function adjustTeni(delta) {
  const next = Math.max(0, readBalance() + Math.trunc(Number(delta) || 0));
  writeBalance(next);
  return next;
}

export function debitTeni(amount) {
  const value = Math.max(0, Math.floor(Number(amount)) || 0);
  const current = readBalance();
  if (!value || value > current) return { success: false, balance: current };
  const next = current - value;
  writeBalance(next);
  return { success: true, balance: next };
}