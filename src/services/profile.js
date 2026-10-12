// profile.js — выбранный аватар игрока (задаётся в главном меню, используется при входе в комнату).

import { AVATARS, DEFAULT_AVATAR, avatarBySrc } from "../data/avatars";
import { isAdmin } from "./admin";
import { isSupport } from "./status";
import { getWallet } from "./wallet";

const AVATAR_KEY = "mafia_selected_avatar_v1";

/** Можно ли игроку ставить этот аватар */
export function canUseAvatar(a) {
  if (!a) return false;
  if (a.tier === "free") return true;
  if (a.tier === "shop") return (getWallet().ownedAvatars || []).includes(a.id);
  if (a.tier === "admin") return isAdmin();
  if (a.tier === "support") return isSupport() || isAdmin();
  return false;
}

/** Все аватарки, доступные игроку прямо сейчас (бесплатные, купленные, особые) */
export function getAvailableAvatars() {
  return AVATARS.filter(canUseAvatar).map((a) => a.src);
}

// Для совместимости со старым кодом
export const AVATAR_LIST = AVATARS.filter((a) => a.tier === "free").map((a) => a.src);

export function getSelectedAvatar() {
  const saved = localStorage.getItem(AVATAR_KEY);
  const meta = avatarBySrc(saved);
  // особый аватар больше недоступен (например, сняли статус саппорта) — обычный
  if (!saved || (meta && !canUseAvatar(meta))) return DEFAULT_AVATAR;
  return saved;
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
