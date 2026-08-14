// abilitiesShop.js — покупка способностей за тени и учёт "запаса" каждой (расходуются при использовании).

import { getAbility } from "../data/abilities";
import { getTeniBalance, debitTeni } from "./teniWallet";

const STORAGE_KEY = "mafia_abilities_owned_v1";

function readOwned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeOwned(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("mafia-abilities-changed"));
}

export function getOwnedAbilities() {
  return readOwned();
}

export function getAbilityCount(id) {
  return readOwned()[id] || 0;
}

export function buyAbility(id) {
  const ability = getAbility(id);
  if (!ability) return { success: false, message: "Способность не найдена" };

  if (getTeniBalance() < ability.price) {
    return { success: false, message: "Недостаточно теней" };
  }

  const result = debitTeni(ability.price);
  if (!result.success) return { success: false, message: "Недостаточно теней" };

  const owned = readOwned();
  owned[id] = (owned[id] || 0) + 1;
  writeOwned(owned);

  return { success: true };
}

/** Списать одну использованную способность из запаса (вызывать после успешной активации на сервере) */
export function consumeAbility(id) {
  const owned = readOwned();
  if (!owned[id]) return;
  owned[id] -= 1;
  if (owned[id] <= 0) delete owned[id];
  writeOwned(owned);
}
