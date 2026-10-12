// dm.js — счётчик непрочитанных личных сообщений и открытый сейчас чат
const KEY = "mafia_dm_unread_v1";
let unread = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
})();
let activeChat = null;

function emit() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(unread));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent("mafia-dm-unread"));
}

export const getUnread = () => unread;
export const totalUnread = () => Object.values(unread).reduce((s, n) => s + n, 0);

export function addUnread(friendId) {
  if (friendId === activeChat) return false;
  unread = { ...unread, [friendId]: (unread[friendId] || 0) + 1 };
  emit();
  return true;
}

export function setActiveChat(friendId) {
  activeChat = friendId;
  if (friendId && unread[friendId]) {
    const next = { ...unread };
    delete next[friendId];
    unread = next;
    emit();
  }
}

export const getActiveChat = () => activeChat;

export function onUnreadChanged(cb) {
  window.addEventListener("mafia-dm-unread", cb);
  return () => window.removeEventListener("mafia-dm-unread", cb);
}
