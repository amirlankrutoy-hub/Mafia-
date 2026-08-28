// friends.js — недавние игроки (хранится локально на устройстве, привязано к аккаунту).
// Список друзей теперь хранится на сервере (см. presence.js: getFriendsList,
// addFriendMutual) — здесь остались только "недавние игроки".

const RECENT_KEY = "mafia_recent_players_v1"; // [{ id, name, lastPlayedAt }]
const ACCOUNT_KEY = "mafia_account_v1";
const MAX_RECENT = 20;

function getCurrentAccountId() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.id || null;
  } catch {
    return null;
  }
}

function recentKey() {
  const id = getCurrentAccountId();
  return id ? `${RECENT_KEY}_${id}` : RECENT_KEY;
}

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("mafia-friends-changed"));
}

export function getRecentPlayers() {
  return readList(recentKey());
}

/** Вызывать когда игрок оказывается в одном лобби с другими (id != мой id) */
export function noteRecentPlayers(players, myId) {
  if (!Array.isArray(players) || !players.length) return;
  const list = getRecentPlayers();
  const now = Date.now();

  players.forEach(({ id, name }) => {
    if (!id || id === myId) return;
    const idx = list.findIndex((p) => p.id === id);
    if (idx >= 0) {
      list[idx] = { id, name: name || list[idx].name, lastPlayedAt: now };
    } else {
      list.unshift({ id, name: name || `Игрок ${id}`, lastPlayedAt: now });
    }
  });

  list.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  writeList(recentKey(), list.slice(0, MAX_RECENT));
}