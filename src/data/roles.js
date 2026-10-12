// roles.js
const roles = [
  {
    id: 'doctor',
    name: 'Доктор',
    category: 'civilians',
    team: 'Мирные жители',
    image: '/roles/doctor.webp',
    description: 'Лечит одного из игроков ночью, спасая от выстрела.',
    ability: 'Спасает выбранного игрока от гибели ночью.'
  },
  {
    id: 'krasotka',
    name: 'Красотка',
    category: 'civilians',
    team: 'Мирные жители',
    image: '/roles/krasotka.webp',
    description: 'Соблазняет одного игрока на ночь. Если кто-то попытается её убить, то умрёт соблазнённый, а не она.',
    ability: 'Соблазняет любого персонажа на одну ночь.'
  },
  {
    id: 'mafia',
    name: 'Мафиози',
    category: 'mafia',
    team: 'Мафия',
    image: '/roles/mafia.webp',
    description: 'Член преступной группировки, ночью выбирает жертву вместе с семьёй.',
    ability: 'Участвует в ночном голосовании мафии — жертву выбирает большинство.'
  },
  {
    id: 'manyak',
    name: 'Маньяк',
    category: 'neutrals',
    team: 'Одиночка',
    image: '/roles/manyak.webp',
    description: 'Играет сам за себя, совершает убийства каждую ночь.',
    ability: 'Убивает любого игрока каждую ночь.'
  },
  {
    id: 'obivatel',
    name: 'Обыватель',
    category: 'civilians',
    team: 'Мирные жители',
    image: '/roles/obivatel.webp',
    description: 'Обычный житель города без особых ночных умений. Его главное оружие — дедукция и голос на дневном голосовании.',
    ability: 'Участвует в дневном голосовании жителей.'
  },
  {
    id: 'otez',
    name: 'Крёстный отец',
    category: 'mafia',
    team: 'Мафия',
    image: '/roles/otez.webp',
    description: 'Глава мафии: вместе с семьёй выбирает жертву, а затем блокирует голос одного из игроков.',
    ability: 'Лишает игрока голоса на дневном голосовании. При равенстве голосов мафии решает он.'
  },
  {
    id: 'poklon',
    name: 'Поклонница',
    category: 'neutrals',
    team: 'Нейтралы',
    image: '/roles/poklon.webp',
    description: 'Следит за выбранным игроком и узнаёт его роль и действия. Побеждает, если доживёт до конца вместе со своим избранником.',
    ability: 'Узнаёт роль избранника и к кому он ходил ночью.'
  },
  {
    id: 'potroshitel',
    name: 'Потрошитель',
    category: 'neutrals',
    team: 'Одиночка',
    image: '/roles/potroshitel.webp',
    description: 'Опасный персонаж, может устранять любых игроков с активной ролью. Обывателей убивать не может.',
    ability: 'Убивает всех, кроме обывателей.'
  },
  {
    id: 'sherif',
    name: 'Шериф',
    category: 'civilians',
    team: 'Мирные жители',
    image: '/roles/sherif.webp',
    description: 'Ночью может устранить выбранного игрока.',
    ability: 'Устраняет выбранного игрока ночью.'
  },
  {
    id: 'stukach',
    name: 'Стукач',
    category: 'neutrals',
    team: 'Одиночка',
    image: '/roles/stukach.webp',
    description: 'Передаёт ценную информацию одной из сторон. Выигрывает вместе с той стороной, которой помог.',
    ability: 'Узнаёт роль игрока и раскрывает его сторону городу или мафии.'
  },
  {
    id: 'vor',
    name: 'Вор',
    category: 'mafia',
    team: 'Мафия',
    image: '/roles/vor.webp',
    description: 'Ночной специалист мафии, блокирует голос выбранного игрока на следующем голосовании.',
    ability: 'Блокирует голос игрока. Просыпается сразу после Крёстного отца.'
  },
  {
    id: 'sveshennik',
    name: 'Священник',
    category: 'civilians',
    team: 'Мирные жители',
    image: '/roles/sveshennik.webp',
    description: 'Может либо проверить игрока, либо устранить его.',
    ability: 'Проверяет или устраняет игроков.'
  }
];

export default roles;