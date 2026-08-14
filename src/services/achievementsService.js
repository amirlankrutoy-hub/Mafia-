// achievementsService.js — учёт статистики игрока и разблокировка достижений.

import ACHIEVEMENTS from "../pages/Achievements";
import { creditTeni } from "./teniWallet";

const STORAGE_KEY = "mafia_achievements_v1";

function defaultStats() {
  return {
    gamesPlayed: 0,
    wins: 0,
    winsByTeam: { town: 0, mafia: 0, neutral: 0 },
    rolesPlayed: {},
    rolesWon: {},
    survivedGames: 0,
    killedAtNight: 0,
    executedByVote: 0,
    votesCast: 0,
    nightActionsUsed: 0,
    friendsAdded: 0,
    roomsCreated: 0,
    roomsJoined: 0,
    emojisSent: 0,
    mafioEarnedTotal: 0,
    teniEarnedTotal: 0,
    doctorSaves: 0,
    mafiaKills: 0,
    sheriffChecks: 0,
    maniacKills: 0,
    potroshitelKills: 0,
    metAdmin: 0,
    loginStreak: 0,
    lastLoginDate: null
  };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stats: defaultStats(), unlocked: [] };
    const parsed = JSON.parse(raw);
    return {
      stats: { ...defaultStats(), ...(parsed.stats || {}) },
      unlocked: parsed.unlocked || []
    };
  } catch {
    return { stats: defaultStats(), unlocked: [] };
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("mafia-achievements-changed"));
}

function getStatValue(stats, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? 0 : acc[key]), stats) || 0;
}

/** Проверяет все достижения и разблокирует новые, выдавая тени */
function evaluateAndUnlock(state) {
  const newlyUnlocked = [];

  ACHIEVEMENTS.forEach((def) => {
    if (state.unlocked.includes(def.id)) return;
    const value = getStatValue(state.stats, def.stat);
    if (value >= def.threshold) {
      state.unlocked.push(def.id);
      state.stats.teniEarnedTotal += def.reward;
      creditTeni(def.reward);
      newlyUnlocked.push(def);
    }
  });

  return newlyUnlocked;
}

function queueToasts(defs) {
  if (!defs.length) return;
  defs.forEach((def, i) => {
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("mafia-achievement-unlocked", { detail: def })
      );
    }, i * 2200);
  });
}

function bump(stats, path, amount = 1) {
  const keys = path.split(".");
  let obj = stats;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof obj[keys[i]] !== "object" || obj[keys[i]] == null) {
      obj[keys[i]] = {};
    }
    obj = obj[keys[i]];
  }
  const last = keys[keys.length - 1];
  obj[last] = (obj[last] || 0) + amount;
}

function persistAndNotify(state) {
  const unlocked = evaluateAndUnlock(state);
  writeState(state);
  queueToasts(unlocked);
  return unlocked;
}

/**
 * Записать игровое событие и обновить прогресс достижений.
 * Поддерживаемые типы:
 *  game_played
 *  game_result   { won, team: 'town'|'mafia'|'neutral', role, alive, killedBy: 'night'|'vote'|null }
 *  role_played   { role }
 *  vote_cast
 *  night_action  { role }
 *  friend_added
 *  room_created
 *  room_joined
 *  emoji_sent
 *  mafio_earned  { amount }
 *  met_admin
 *  daily_login
 */
export function recordEvent(type, payload = {}) {
  const state = readState();
  const stats = state.stats;

  switch (type) {
    case "game_played":
      stats.gamesPlayed += 1;
      break;

    case "game_result": {
      if (payload.won) {
        stats.wins += 1;
        if (payload.team) bump(stats, `winsByTeam.${payload.team}`);
        if (payload.role) bump(stats, `rolesWon.${payload.role}`);
      }
      if (payload.alive) stats.survivedGames += 1;
      if (payload.killedBy === "night") stats.killedAtNight += 1;
      if (payload.killedBy === "vote") stats.executedByVote += 1;
      break;
    }

    case "role_played":
      if (payload.role) bump(stats, `rolesPlayed.${payload.role}`);
      break;

    case "vote_cast":
      stats.votesCast += 1;
      break;

    case "night_action":
      stats.nightActionsUsed += 1;
      if (payload.role === "doctor") stats.doctorSaves += 1;
      if (payload.role === "mafia" || payload.role === "otez") stats.mafiaKills += 1;
      if (payload.role === "sherif") stats.sheriffChecks += 1;
      if (payload.role === "manyak") stats.maniacKills += 1;
      if (payload.role === "potroshitel") stats.potroshitelKills += 1;
      break;

    case "friend_added":
      stats.friendsAdded += 1;
      break;

    case "room_created":
      stats.roomsCreated += 1;
      break;

    case "room_joined":
      stats.roomsJoined += 1;
      break;

    case "emoji_sent":
      stats.emojisSent += 1;
      break;

    case "mafio_earned":
      stats.mafioEarnedTotal += Math.max(0, Number(payload.amount) || 0);
      break;

    case "met_admin":
      stats.metAdmin = 1;
      break;

    case "daily_login": {
      const today = new Date().toISOString().slice(0, 10);
      if (stats.lastLoginDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        stats.loginStreak = stats.lastLoginDate === yesterday ? stats.loginStreak + 1 : 1;
        stats.lastLoginDate = today;
      }
      break;
    }

    default:
      break;
  }

  return persistAndNotify(state);
}

export function getStats() {
  return readState().stats;
}

export function getUnlockedIds() {
  return readState().unlocked;
}

export function isUnlocked(id) {
  return readState().unlocked.includes(id);
}

export function getProgress(def) {
  const stats = readState().stats;
  const value = getStatValue(stats, def.stat);
  return { value, threshold: def.threshold, pct: Math.min(100, Math.round((value / def.threshold) * 100)) };
}
