// friends.js — список друзей и недавних игроков (хранится локально на устройстве).

const FRIENDS_KEY = "mafia_friends_v1"; // [{ id, name }]
const RECENT_KEY = "mafia_recent_players_v1"; // [{ id, name, lastPlayedAt }]
const MAX_RECENT = 20;

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

export function getFriends() {
  return readList(FRIENDS_KEY);
}

export function isFriend(id) {
  return getFriends().some((f) => f.id === id);
}

export function addFriend({ id, name }) {
  if (!id) return;
  const list = getFriends();
  if (list.some((f) => f.id === id)) return;
  list.push({ id, name: name || `Игрок ${id}` });
  writeList(FRIENDS_KEY, list);
  import("./achievementsService").then((m) => m.recordEvent("friend_added")).catch(() => {});
}

export function removeFriend(id) {
  const list = getFriends().filter((f) => f.id !== id);
  writeList(FRIENDS_KEY, list);
}

export function getRecentPlayers() {
  return readList(RECENT_KEY);
}

// ---------- Отправленные заявки в друзья (для состояния кнопки "Дружить") ----------
const SENT_REQUESTS_KEY = "mafia_sent_friend_requests_v1"; // [accountId]

export function getSentRequests() {
  return readList(SENT_REQUESTS_KEY);
}

export function isSentRequest(id) {
  return getSentRequests().includes(id);
}

export function markRequestSent(id) {
  if (!id) return;
  const list = getSentRequests();
  if (!list.includes(id)) writeList(SENT_REQUESTS_KEY, [...list, id]);
}

export function unmarkRequestSent(id) {
  writeList(SENT_REQUESTS_KEY, getSentRequests().filter((x) => x !== id));
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
  writeList(RECENT_KEY, list.slice(0, MAX_RECENT));
}
