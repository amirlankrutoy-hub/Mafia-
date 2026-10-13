// Оформление команд (фракций) для страниц ролей.
import { faUserShield, faUserSecret, faFire, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

export const TEAMS = {
  civilians: {
    id: "civilians",
    label: "Мирные жители",
    short: "Жители",
    icon: faUserShield,
    color: "#34d399",
    glow: "rgba(52, 211, 153, 0.55)",
    goal: "Вычислить и изгнать мафию и опасных одиночек.",
    tips: [
      "Слушайте, кто слишком уверенно обвиняет других без причины.",
      "Не раскрывайте свою роль раньше времени — мафия охотится на сильных.",
      "Запоминайте, кто за кого голосовал: это лучшая улика."
    ]
  },
  mafia: {
    id: "mafia",
    label: "Мафия",
    short: "Мафия",
    icon: faUserSecret,
    color: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.6)",
    goal: "Сравняться числом с мирными жителями.",
    tips: [
      "Днём ведите себя как самый честный житель города.",
      "Договаривайтесь с семьёй в тайном чате — голосуйте вместе.",
      "Убирайте ночью тех, кто начал вас подозревать."
    ]
  },
  neutrals: {
    id: "neutrals",
    label: "Одиночки",
    short: "Одиночки",
    icon: faFire,
    color: "#c084fc",
    glow: "rgba(192, 132, 252, 0.6)",
    goal: "Играть за себя и остаться последним — или выполнить свою цель.",
    tips: [
      "Против вас и мафия, и город — не доверяйте никому.",
      "Пусть мафия и мирные ослабляют друг друга.",
      "Не выделяйтесь в первые дни."
    ]
  }
};

export const ALL_TEAMS = { id: "all", label: "Вся семья", short: "Все", icon: faLayerGroup, color: "#f3d27a", glow: "rgba(243, 210, 122, 0.55)" };

export const TEAM_ORDER = ["civilians", "mafia", "neutrals"];
