// abilities.js — способности, которые можно купить за тени и использовать в игре.
// Дневные — активируются в первые 10 секунд голосования.
// Ночные — активируются в первые 10 секунд после начала ночи.

export const ABILITIES = [
  {
    id: "voice_change",
    name: "Смена голоса",
    type: "day",
    price: 15,
    description: "Скрывает ваше имя в этом раунде голосования — другие не увидят, кто вы."
  },
  {
    id: "extra_vote",
    name: "Двойной голос",
    type: "day",
    price: 25,
    description: "Ваш голос на этом голосовании считается за два."
  },
  {
    id: "vote_immunity",
    name: "Неприкасаемый",
    type: "day",
    price: 30,
    description: "В этом раунде против вас нельзя проголосовать."
  },
  {
    id: "reveal_faction",
    name: "Разведка",
    type: "day",
    price: 20,
    needsTarget: true,
    description: "Узнайте фракцию одного игрока (мирные / мафия / нейтралы)."
  },
  {
    id: "night_immortality",
    name: "Бессмертие",
    type: "night",
    price: 35,
    description: "Вы не можете погибнуть этой ночью."
  },
  {
    id: "reveal_role",
    name: "Разоблачение",
    type: "night",
    price: 40,
    needsTarget: true,
    description: "Узнайте точную роль одного из игроков."
  }
];

export function getAbility(id) {
  return ABILITIES.find((a) => a.id === id) || null;
}

export default ABILITIES;
