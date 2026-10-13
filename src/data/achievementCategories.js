// Категории достижений: определяются по префиксу id.
import {
  faDice,
  faTrophy,
  faMasksTheater,
  faSkull,
  faMoon,
  faUserGroup,
  faCoins,
  faCalendarCheck,
  faStar,
  faCrown
} from "@fortawesome/free-solid-svg-icons";

export const CATEGORIES = [
  { id: "games", label: "Игры", icon: faDice, prefixes: ["games_played_"] },
  { id: "wins", label: "Победы", icon: faTrophy, prefixes: ["wins_"] },
  { id: "roles", label: "Роли", icon: faMasksTheater, prefixes: ["play_role_", "win_role_"] },
  { id: "fate", label: "Судьба", icon: faSkull, prefixes: ["survived_", "killed_night_", "executed_"] },
  {
    id: "actions",
    label: "Действия",
    icon: faMoon,
    prefixes: ["votes_cast_", "night_actions_", "doctorSaves_", "mafiaKills_", "sheriffChecks_", "maniacKills_", "potroshitelKills_"]
  },
  { id: "social", label: "Общение", icon: faUserGroup, prefixes: ["friends_", "rooms_", "emojis_"] },
  { id: "wealth", label: "Богатство", icon: faCoins, prefixes: ["mafio_earned_", "teni_earned_"] },
  { id: "loyalty", label: "Верность", icon: faCalendarCheck, prefixes: ["login_streak_"] },
  { id: "bonus", label: "Бонусные", icon: faStar, prefixes: ["bonus_"] }
];

const GOLD = { id: "gold", label: "Легенда", icon: faCrown, prefixes: [] };

export function categoryOf(def) {
  if (def?.gold) return GOLD;
  return CATEGORIES.find((c) => c.prefixes.some((p) => def?.id?.startsWith(p))) || CATEGORIES[CATEGORIES.length - 1];
}
