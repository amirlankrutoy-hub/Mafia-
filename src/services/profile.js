// profile.js — выбранный аватар игрока (задаётся в главном меню, используется при входе в комнату).

const AVATAR_KEY = "mafia_selected_avatar_v1";
const DEFAULT_AVATAR = "/avatars/avatar1.svg";

export const AVATAR_LIST = Array.from(
  { length: 17 },
  (_, i) => `/avatars/avatar${i + 1}.svg`
);

export function getSelectedAvatar() {
  return localStorage.getItem(AVATAR_KEY) || DEFAULT_AVATAR;
}

export function setSelectedAvatar(avatarPath) {
  localStorage.setItem(AVATAR_KEY, avatarPath);
  window.dispatchEvent(new CustomEvent("mafia-avatar-changed"));
}

// ---------- Любимая роль (выбирается игроком, видна другим в профиле) ----------
const FAVORITE_ROLE_KEY = "mafia_favorite_role_v1";

export function getFavoriteRole() {
  return localStorage.getItem(FAVORITE_ROLE_KEY) || null;
}

export function setFavoriteRole(roleId) {
  if (roleId) {
    localStorage.setItem(FAVORITE_ROLE_KEY, roleId);
  } else {
    localStorage.removeItem(FAVORITE_ROLE_KEY);
  }
  window.dispatchEvent(new CustomEvent("mafia-favorite-role-changed"));
}
