// teniWallet.js — валюта "Тени", выдаётся за достижения.
// Хранится локально (привязана к устройству/аккаунту так же, как Мафио).

const TENI_KEY = "mafia_teni_v1";

function readBalance() {
  try {
    const raw = localStorage.getItem(TENI_KEY);
    return raw ? Math.max(0, Number(JSON.parse(raw).balance) || 0) : 0;
  } catch {
    return 0;
  }
}

function writeBalance(balance) {
  localStorage.setItem(TENI_KEY, JSON.stringify({ balance }));
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
export function debitTeni(amount) {
  const value = Math.max(0, Math.floor(Number(amount)) || 0);
  const current = readBalance();
  if (!value || value > current) return { success: false, balance: current };
  const next = current - value;
  writeBalance(next);
  return { success: true, balance: next };
}
