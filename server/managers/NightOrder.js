module.exports = [
  { role: "doctor", label: "Доктор", teamAction: false },
  { role: "mafia", label: "Мафия", teamAction: true, withRoles: ["otez"] },
  { role: "otez", label: "Крёстный отец", teamAction: false, onlyAfterMafia: true },
  { role: "vor", label: "Вор", teamAction: false },
  { role: "manyak", label: "Маньяк", teamAction: false },
  { role: "potroshitel", label: "Потрошитель", teamAction: false },
  { role: "sherif", label: "Шериф", teamAction: false },
  { role: "sveshennik", label: "Священник", teamAction: false, modes: ["check", "kill"] },
  { role: "krasotka", label: "Красотка", teamAction: false },
  { role: "poklon", label: "Поклонница", teamAction: false },
  { role: "stukach", label: "Стукач", teamAction: false },
];