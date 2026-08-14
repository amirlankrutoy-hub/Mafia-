// achievements.js — определения 100 достижений.
// Каждое достижение даёт 10 теней. Финальное — золотое, за встречу с админом.

import roles from "./roles";

const ROLE_NAMES = Object.fromEntries(roles.map((r) => [r.id, r.name]));

function roleName(id) {
  return ROLE_NAMES[id] || id;
}

const list = [];

function add(def) {
  list.push({ reward: 10, gold: false, ...def });
}

// ---------- Игры сыграно ----------
[1, 5, 10, 25, 50, 100, 200, 500, 1000].forEach((n) => {
  add({
    id: `games_played_${n}`,
    title: `Завсегдатай (${n})`,
    description: `Сыграйте ${n} ${n === 1 ? "игру" : "игр"} в Mafia Play.`,
    stat: "gamesPlayed",
    threshold: n
  });
});

// ---------- Победы всего ----------
[1, 5, 10, 25, 50, 100, 250].forEach((n) => {
  add({
    id: `wins_total_${n}`,
    title: `Победитель (${n})`,
    description: `Победите ${n} ${n === 1 ? "раз" : "раз"} в игре.`,
    stat: "wins",
    threshold: n
  });
});

// ---------- Победы по командам ----------
const teams = [
  { key: "town", label: "за мирных жителей" },
  { key: "mafia", label: "за мафию" },
  { key: "neutral", label: "за нейтралов" }
];
teams.forEach(({ key, label }) => {
  [1, 10, 25].forEach((n) => {
    add({
      id: `wins_${key}_${n}`,
      title: `${label[0].toUpperCase()}${label.slice(1)}: ${n}`,
      description: `Победите ${n} ${n === 1 ? "раз" : "раз"} ${label}.`,
      stat: `winsByTeam.${key}`,
      threshold: n
    });
  });
});

// ---------- Сыграть каждой ролью ----------
roles.forEach((r) => {
  add({
    id: `play_role_${r.id}`,
    title: `Проба роли: ${r.name}`,
    description: `Сыграйте роль «${r.name}» хотя бы раз.`,
    stat: `rolesPlayed.${r.id}`,
    threshold: 1
  });
});

// ---------- Победить каждой ролью ----------
roles.forEach((r) => {
  add({
    id: `win_role_${r.id}`,
    title: `Мастер роли: ${r.name}`,
    description: `Победите в игре, находясь в роли «${r.name}».`,
    stat: `rolesWon.${r.id}`,
    threshold: 1
  });
});

// ---------- Выживание / смерти ----------
[1, 10, 25].forEach((n) => {
  add({
    id: `survived_${n}`,
    title: `Выживший (${n})`,
    description: `Доживите до конца игры ${n} ${n === 1 ? "раз" : "раз"}.`,
    stat: "survivedGames",
    threshold: n
  });
});
[1, 10].forEach((n) => {
  add({
    id: `killed_night_${n}`,
    title: `Жертва ночи (${n})`,
    description: `Погибните ночью ${n} ${n === 1 ? "раз" : "раз"}.`,
    stat: "killedAtNight",
    threshold: n
  });
});
[1, 10].forEach((n) => {
  add({
    id: `executed_${n}`,
    title: `На эшафоте (${n})`,
    description: `Будьте казнены по итогам голосования ${n} ${n === 1 ? "раз" : "раз"}.`,
    stat: "executedByVote",
    threshold: n
  });
});

// ---------- Голосования и ночные действия ----------
[10, 50, 100, 500].forEach((n) => {
  add({
    id: `votes_cast_${n}`,
    title: `Голос народа (${n})`,
    description: `Проголосуйте на дневном голосовании ${n} раз.`,
    stat: "votesCast",
    threshold: n
  });
});
[10, 50, 100, 500].forEach((n) => {
  add({
    id: `night_actions_${n}`,
    title: `Ночной дозор (${n})`,
    description: `Совершите ${n} ночных действий.`,
    stat: "nightActionsUsed",
    threshold: n
  });
});

// ---------- Друзья ----------
[1, 5, 10, 25].forEach((n) => {
  add({
    id: `friends_${n}`,
    title: `Круг общения (${n})`,
    description: `Добавьте ${n} ${n === 1 ? "друга" : "друзей"}.`,
    stat: "friendsAdded",
    threshold: n
  });
});

// ---------- Комнаты ----------
[1, 5, 10, 25].forEach((n) => {
  add({
    id: `rooms_created_${n}`,
    title: `Хозяин комнаты (${n})`,
    description: `Создайте ${n} ${n === 1 ? "комнату" : "комнат"} в роли мэра.`,
    stat: "roomsCreated",
    threshold: n
  });
});
[1, 10, 50, 100].forEach((n) => {
  add({
    id: `rooms_joined_${n}`,
    title: `Гость семьи (${n})`,
    description: `Присоединитесь к ${n} ${n === 1 ? "комнате" : "комнатам"}.`,
    stat: "roomsJoined",
    threshold: n
  });
});

// ---------- Эмодзи ----------
[10, 50].forEach((n) => {
  add({
    id: `emojis_sent_${n}`,
    title: `Душа компании (${n})`,
    description: `Отправьте ${n} эмодзи в лобби.`,
    stat: "emojisSent",
    threshold: n
  });
});

// ---------- Валюта ----------
[1000, 5000, 10000].forEach((n) => {
  add({
    id: `mafio_earned_${n}`,
    title: `Капитал (${n})`,
    description: `Заработайте суммарно ${n.toLocaleString("ru-RU")} Мафио.`,
    stat: "mafioEarnedTotal",
    threshold: n
  });
});
[100, 500].forEach((n) => {
  add({
    id: `teni_earned_${n}`,
    title: `Хранитель теней (${n})`,
    description: `Заработайте суммарно ${n} теней за достижения.`,
    stat: "teniEarnedTotal",
    threshold: n
  });
});

// ---------- Специализация ролей ----------
const specialRoles = [
  { key: "doctorSaves", role: "doctor", label: "Спасения доктора" },
  { key: "mafiaKills", role: "mafia", label: "Устранения от мафии" },
  { key: "sheriffChecks", role: "sherif", label: "Проверки шерифа" },
  { key: "maniacKills", role: "manyak", label: "Жертвы маньяка" },
  { key: "potroshitelKills", role: "potroshitel", label: "Жертвы потрошителя" }
];
specialRoles.forEach(({ key, role, label }) => {
  [1, 10, 25].forEach((n) => {
    add({
      id: `${key}_${n}`,
      title: `${label}: ${n}`,
      description: `Роль «${roleName(role)}»: совершите ночное действие ${n} ${
        n === 1 ? "раз" : "раз"
      }.`,
      stat: key,
      threshold: n
    });
  });
});

// ---------- Ежедневный вход ----------
[3, 7].forEach((n) => {
  add({
    id: `login_streak_${n}`,
    title: `Верность семье (${n} дней подряд)`,
    description: `Заходите на сайт ${n} дней подряд.`,
    stat: "loginStreak",
    threshold: n
  });
});

// ---------- Финальное достижение ----------
add({
  id: "meet_admin",
  title: "Вы встретились с админом, поздравляю",
  description: "Сыграйте в одной комнате с настоящим администратором сайта.",
  stat: "metAdmin",
  threshold: 1,
  gold: true
});

// Подрежем/дополним ровно до 100, если подсчёт где-то разошёлся.
while (list.length < 100) {
  const n = list.length + 1;
  add({
    id: `bonus_${n}`,
    title: `Бонусное достижение ${n}`,
    description: "Продолжайте играть, чтобы открыть больше наград.",
    stat: "gamesPlayed",
    threshold: 1000 + n
  });
}

export const ACHIEVEMENTS = list.slice(0, 100);

export default ACHIEVEMENTS;
