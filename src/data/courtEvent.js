// courtEvent.js — событие «Суд Мафий»: колесо фортуны на 30 наград.
// Все сектора на колесе одинакового размера, а шанс выпадения у каждой
// награды свой (вес). Шансы открыто показаны на странице события.
import { AVATARS } from "./avatars";
import { DECORATIONS } from "./shopData";
import roles from "./roles";

export const SPIN_PRICE = 30; // теней за 1 прокрутку
export const SPIN5_PRICE = 100; // теней за 5 прокруток
export const DUPLICATE_TOKENS = 300; // если награда уже есть

// Редкость → цвет и подпись
export const PRIZE_TIERS = {
  tokens: { label: "Токены", color: "#f3d27a" },
  emoji: { label: "Эмодзи", color: "#fbbf24" },
  decoration: { label: "Украшение", color: "#2dd4bf" },
  sunset: { label: "Аватарка «Закат»", color: "#fb923c" },
  night: { label: "Аватарка «Ночь»", color: "#60a5fa" },
  role: { label: "Роль события", color: "#ef4444" }
};

// Роли — главный приз, шанс у них очень низкий
const WEIGHTS = { 200: 100, 300: 80, 500: 55, 1000: 20, emoji: 30, decoration: 25, sunset: 13, night: 11, role: 2 };

const av = (id) => AVATARS.find((a) => a.id === id);
const deco = (id) => DECORATIONS.find((d) => d.id === id);
const role = (id) => roles.find((r) => r.id === id);

const tokens = (amount) => ({ kind: "tokens", tier: "tokens", amount, name: `${amount} Токенов`, weight: WEIGHTS[amount] });
const avatar = (id, tier) => ({ kind: "avatar", tier, id, name: av(id)?.name, image: av(id)?.src, weight: WEIGHTS[tier] });
const emoji = (id, symbol, name) => ({ kind: "emoji", tier: "emoji", id, symbol, name, weight: WEIGHTS.emoji });
const decoration = (id) => ({ kind: "decoration", tier: "decoration", id, name: deco(id)?.name, deco: deco(id), weight: WEIGHTS.decoration });
const eventRole = (id) => ({ kind: "role", tier: "role", id, name: role(id)?.name, image: role(id)?.image, weight: WEIGHTS.role });

// Порядок секторов по часовой стрелке (редкие разнесены по кругу)
export const WHEEL = [
  tokens(200),
  avatar("noir1", "sunset"),
  emoji("e_scales", "⚖️", "Весы правосудия"),
  tokens(500),
  decoration("crown_red"),
  avatar("night1", "night"),
  tokens(300),
  eventRole("sudya"),
  emoji("e_gavel", "🔨", "Молоток судьи"),
  avatar("noir2", "sunset"),
  tokens(200),
  decoration("halo_purple"),
  avatar("night2", "night"),
  tokens(1000),
  emoji("e_judge", "🧑‍⚖️", "Судья"),
  avatar("noir3", "sunset"),
  tokens(500),
  decoration("horns_red"),
  avatar("night4", "night"),
  tokens(300),
  eventRole("advokat"),
  emoji("e_chains", "⛓️", "Кандалы"),
  avatar("noir4", "sunset"),
  tokens(1000),
  decoration("tophat_gold"),
  avatar("night8", "night"),
  emoji("e_scroll", "📜", "Приговор"),
  avatar("noir5", "sunset"),
  decoration("laurel_purple"),
  avatar("night9", "night")
].map((p, i) => ({ ...p, index: i }));

export const TOTAL_WEIGHT = WHEEL.reduce((s, p) => s + p.weight, 0);

/** Шанс награды в процентах среди оставшихся на колесе */
export const chanceOf = (prize, pool = WHEEL) => (prize.weight / pool.reduce((s, p) => s + p.weight, 0)) * 100;
