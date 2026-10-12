// chests.js — открытие сундуков: списание Токенов, случайная награда, зачисление.
import roles from "../data/roles";
import { CHESTS, ROLE_RARITY, DUPLICATE_TOKENS } from "../data/chests";
import { EMOJIS } from "../data/shopData";
import { debit, credit, getWallet, grantItem } from "./wallet";
import { creditTeni } from "./teniWallet";

function rand(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pickWeighted(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    if ((r -= w) < 0) return key;
  }
  return entries[entries.length - 1][0];
}

const roundTo = (n, step) => Math.round(n / step) * step;

/**
 * Открыть сундук. Возвращает { success, message?, reward }
 * reward: { type: "tokens"|"teni"|"emoji"|"role", rarity, amount?, emoji?, role?, duplicate? }
 */
export function openChest(chestId) {
  const chest = CHESTS.find((c) => c.id === chestId);
  if (!chest) return { success: false, message: "Неизвестный сундук" };
  if (!debit(chest.price).success) return { success: false, message: "Недостаточно Токенов" };

  const wallet = getWallet();
  let type = pickWeighted(chest.drops);

  if (type === "emoji") {
    const free = EMOJIS.filter((e) => !wallet.ownedEmojis.includes(e.id));
    if (!free.length) type = "tokens"; // все эмодзи уже есть
    else {
      const emoji = free[Math.floor(Math.random() * free.length)];
      grantItem("emoji", emoji.id);
      return { success: true, reward: { type, rarity: chest.rarity === "mythic" ? "epic" : "rare", emoji } };
    }
  }

  if (type === "role") {
    const rarity = pickWeighted(chest.roleRarity);
    const pool = Object.keys(ROLE_RARITY).filter((id) => ROLE_RARITY[id] === rarity);
    const roleId = pool[Math.floor(Math.random() * pool.length)];
    const role = roles.find((r) => r.id === roleId);
    if (wallet.ownedRoles.includes(roleId)) {
      const amount = DUPLICATE_TOKENS[rarity];
      credit(amount);
      return { success: true, reward: { type, rarity, role, duplicate: true, amount } };
    }
    grantItem("role", roleId);
    return { success: true, reward: { type, rarity, role } };
  }

  if (type === "teni") {
    const amount = rand(...chest.teni);
    creditTeni(amount);
    return { success: true, reward: { type, rarity: amount >= chest.teni[1] * 0.8 ? "epic" : "rare", amount } };
  }

  const amount = roundTo(rand(...chest.tokens), 10);
  credit(amount);
  const ratio = (amount - chest.tokens[0]) / (chest.tokens[1] - chest.tokens[0]);
  return { success: true, reward: { type: "tokens", rarity: ratio > 0.8 ? "epic" : ratio > 0.4 ? "rare" : "common", amount } };
}
