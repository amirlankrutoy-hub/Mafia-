// abilities.js — способности для игры.
// Способности покупаются за тени в магазине. Если мэр разрешил способности,
// в игре игрок видит только свои купленные и может использовать ОДНУ за игру
// (дневную — на голосовании, ночную — ночью). Использованный заряд списывается.
import {
  faVolumeXmark,
  faCheckDouble,
  faShieldHalved,
  faMagnifyingGlass,
  faUserSecret,
  faHeartPulse,
  faEye,
  faDove
} from "@fortawesome/free-solid-svg-icons";

export const ABILITIES = [
  {
    id: "voice_change",
    name: "Глушитель",
    type: "day",
    price: 15,
    needsTarget: true,
    icon: faVolumeXmark,
    description: "Голос выбранного игрока в этом раунде голосования не засчитывается."
  },
  {
    id: "extra_vote",
    name: "Двойной голос",
    type: "day",
    price: 25,
    icon: faCheckDouble,
    description: "Ваш голос на этом голосовании считается за два."
  },
  {
    id: "vote_immunity",
    name: "Неприкасаемый",
    type: "day",
    price: 30,
    icon: faShieldHalved,
    description: "В этом раунде против вас нельзя проголосовать."
  },
  {
    id: "reveal_faction",
    name: "Разведка",
    type: "day",
    price: 20,
    needsTarget: true,
    icon: faMagnifyingGlass,
    description: "Узнайте фракцию одного игрока (мирные / мафия / нейтралы)."
  },
  {
    id: "alibi",
    name: "Алиби",
    type: "day",
    price: 30,
    icon: faUserSecret,
    description: "Если город приговорит вас на этом голосовании — у вас найдётся алиби, и казнь отменится."
  },
  {
    id: "night_immortality",
    name: "Бессмертие",
    type: "night",
    price: 35,
    icon: faHeartPulse,
    description: "Вы не можете погибнуть этой ночью."
  },
  {
    id: "reveal_role",
    name: "Разоблачение",
    type: "night",
    price: 40,
    needsTarget: true,
    icon: faEye,
    description: "Узнайте точную роль одного из игроков."
  },
  {
    id: "guardian",
    name: "Ангел-хранитель",
    type: "night",
    price: 30,
    needsTarget: true,
    icon: faDove,
    description: "Выбранный игрок не может погибнуть этой ночью."
  }
];

export function getAbility(id) {
  return ABILITIES.find((a) => a.id === id) || null;
}

export default ABILITIES;
