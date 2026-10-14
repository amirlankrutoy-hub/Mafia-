// courtEvent.js — прокрутка колеса «Суд Мафий» (за тени).
// Каждая выпавшая награда исчезает с колеса; когда забраны все 30 —
// событие пройдено.
import { WHEEL, SPIN_PRICE, SPIN5_PRICE, DUPLICATE_TOKENS } from "../data/courtEvent";
import { getTeniBalance, debitTeni } from "./teniWallet";
import { credit, getWallet, grantItem } from "./wallet";

const KEY = "mafia_event_court_v1";

function readState() {
  try {
    const s = { spins: 0, history: [], won: [], ...(JSON.parse(localStorage.getItem(KEY) || "{}") || {}) };
    if (!Array.isArray(s.won)) s.won = [];
    return s;
  } catch {
    return { spins: 0, history: [], won: [] };
  }
}

function writeState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  window.dispatchEvent(new CustomEvent("mafia-event-changed"));
}

export const getEventState = readState;

/** Награды, которые ещё остались на колесе */
export function remainingPrizes(state = readState()) {
  const won = new Set(state.won);
  return WHEEL.filter((p) => !won.has(p.index));
}

export const isEventComplete = () => remainingPrizes().length === 0;

/** Есть ли у игрока эта награда (для отметки «у вас есть» и замены дубликата) */
export function ownsPrize(prize, wallet = getWallet()) {
  if (prize.kind === "avatar") return (wallet.ownedAvatars || []).includes(prize.id);
  if (prize.kind === "role") return (wallet.ownedRoles || []).includes(prize.id);
  if (prize.kind === "emoji") return (wallet.ownedEmojis || []).includes(prize.id);
  if (prize.kind === "decoration") return (wallet.ownedDecorations || []).includes(prize.id);
  return false;
}

// Случайная награда из оставшихся (по весам), без повторов внутри одной крутки ×5
function roll(pool) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r < 0) return p;
  }
  return pool[pool.length - 1];
}

function grant(prize) {
  if (prize.kind === "tokens") {
    credit(prize.amount);
    return { prize, tokens: prize.amount, duplicate: false };
  }
  if (ownsPrize(prize)) {
    credit(DUPLICATE_TOKENS);
    return { prize, tokens: DUPLICATE_TOKENS, duplicate: true };
  }
  grantItem(prize.kind, prize.id);
  return { prize, tokens: 0, duplicate: false };
}

/** Прокрутить колесо: count = 1 или 5. Возвращает { success, results } или { success:false, message } */
export function spinCourt(count = 1) {
  const state = readState();
  let pool = remainingPrizes(state);
  if (!pool.length) return { success: false, message: "Вы уже забрали все награды события" };
  const n = count === 5 ? 5 : 1;
  if (pool.length < n) return { success: false, message: `На колесе осталось только ${pool.length} наград` };
  const price = n === 5 ? SPIN5_PRICE : SPIN_PRICE;
  if (getTeniBalance() < price) return { success: false, message: "Недостаточно теней" };
  const paid = debitTeni(price);
  if (paid && paid.success === false) return { success: false, message: "Недостаточно теней" };

  const results = [];
  for (let i = 0; i < n; i++) {
    const prize = roll(pool);
    pool = pool.filter((p) => p !== prize);
    results.push(grant(prize));
  }
  state.spins += results.length;
  state.won = [...state.won, ...results.map((r) => r.prize.index)];
  state.history = [...results.map((r) => ({ index: r.prize.index, duplicate: r.duplicate, at: Date.now() })), ...state.history].slice(0, 30);
  if (!pool.length) state.completedAt = Date.now();
  writeState(state);
  return { success: true, results, complete: !pool.length };
}
