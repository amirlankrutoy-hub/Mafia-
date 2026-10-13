import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoon,
  faSun,
  faGavel,
  faMasksTheater,
  faTrophy,
  faCrown,
  faUserShield,
  faUserSecret,
  faSkull,
  faWandMagicSparkles,
  faScaleBalanced,
  faComments,
  faArrowRight,
  faFeather,
  faFire
} from '@fortawesome/free-solid-svg-icons';
import useSeo from '../hooks/useSeo';
import ABILITIES from '../data/abilities';

const STEPS = [
  {
    icon: faMasksTheater,
    title: 'Раздача ролей',
    text: 'Мэр создаёт комнату, игроки заходят по коду. Каждый тайно получает роль — её карточку видите только вы. Мафия сразу узнаёт своих напарников.'
  },
  {
    icon: faMoon,
    title: 'Ночь: город засыпает',
    text: 'Роли просыпаются по очереди: мафия выбирает жертву, доктор лечит, шериф проверяет, нейтралы преследуют свои цели. Остальные ждут утра.'
  },
  {
    icon: faSun,
    title: 'Утро: итоги ночи',
    text: 'Мэр объявляет, кто погиб, а кого удалось спасти. Начинается обсуждение: ищите противоречия, задавайте вопросы, защищайтесь.'
  },
  {
    icon: faGavel,
    title: 'Голосование',
    text: 'Живые игроки голосуют, кого изгнать. Голосование тайное. При ничьей — переголосование между лидерами; повторная ничья — никого не казнят.'
  },
  {
    icon: faScaleBalanced,
    title: 'Приговор мэра',
    text: 'Мэр утверждает казнь или милует осуждённого. После приговора снова опускается ночь — и так до победы одной из сторон.'
  }
];

const TEAMS = [
  {
    icon: faUserShield,
    name: 'Мирные жители',
    tone: 'town',
    goal: 'Вычислить и изгнать всю мафию и опасных нейтралов.',
    tip: 'Ваше оружие — логика, голосование и роли вроде доктора и шерифа.'
  },
  {
    icon: faUserSecret,
    name: 'Мафия',
    tone: 'mafia',
    goal: 'Сравняться числом с мирными или превзойти их.',
    tip: 'Ночью убивайте, днём притворяйтесь мирными. У семьи есть свой тайный чат.'
  },
  {
    icon: faFire,
    name: 'Нейтралы',
    tone: 'neutral',
    goal: 'У каждого своя цель: маньяк и потрошитель хотят остаться последними.',
    tip: 'Не доверяйте никому — против вас и мафия, и город.'
  }
];

const EXTRA = [
  {
    icon: faCrown,
    title: 'Мэр — ведущий',
    text: 'Мэр не играет за команду: он запускает фазы, объявляет итоги и утверждает приговор. Может исключить игрока за нарушение.'
  },
  {
    icon: faSkull,
    title: 'Лёгкий и сложный режим',
    text: 'В лёгком режиме роль погибшего раскрывается. В сложном — город узнаёт только, от чьей руки он погиб.'
  },
  {
    icon: faComments,
    title: 'Чаты',
    text: 'Общий чат открыт во время голосования. У мафии свой канал «Семья», пока жив хотя бы один напарник.'
  },
  {
    icon: faFeather,
    title: 'Выбывшие молчат',
    text: 'Погибшие игроки остаются наблюдать за игрой, но не голосуют и не подсказывают живым.'
  }
];

function Rules() {
  useSeo({
    title: 'Правила игры Мафия',
    description: 'Правила игры «Мафия» онлайн: роли, ночь и день, голосование, мэр-ведущий, способности и условия победы мирных, мафии и нейтралов.',
    path: '/rules'
  });

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-3 py-6 sm:px-4">
      {/* Шапка */}
      <section className="ach-hero text-center anim-fade-up">
        <div className="ach-hero__glow" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#a8916c]">Кодекс семьи</p>
          <h1 className="ach-title mt-1 font-display text-4xl font-black sm:text-6xl">Правила игры</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[#c9b48f] sm:text-base">
            Город засыпает — просыпается мафия. Всё, что нужно знать, чтобы выжить, вычислить врага и победить.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <a href="#flow" className="ach-pill">Ход игры</a>
            <a href="#teams" className="ach-pill">Команды</a>
            <a href="#abilities" className="ach-pill">Способности</a>
            <a href="#extra" className="ach-pill">Важно знать</a>
          </div>
        </div>
      </section>

      {/* Ход игры — таймлайн */}
      <section id="flow" className="scroll-mt-6">
        <SectionTitle icon={faMoon} title="Ход игры" />
        <ol className="rules-timeline mt-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rules-step anim-fade-up" style={{ '--i': i }}>
              <span className="rules-step__node">
                <FontAwesomeIcon icon={s.icon} />
              </span>
              <div className="rules-step__card">
                <span className="rules-step__num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-display text-xl font-black text-[#f3e5ab]">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#c9b48f]">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Команды */}
      <section id="teams" className="scroll-mt-6">
        <SectionTitle icon={faTrophy} title="Команды и победа" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TEAMS.map((t, i) => (
            <div key={t.name} className={`rules-team rules-team--${t.tone} anim-scale-in`} style={{ '--i': i }}>
              <span className="rules-team__icon">
                <FontAwesomeIcon icon={t.icon} />
              </span>
              <h3 className="mt-3 font-display text-xl font-black text-[#f3e5ab]">{t.name}</h3>
              <p className="mt-2 text-sm font-bold text-[#f3d27a]">{t.goal}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#a8916c]">{t.tip}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link to="/roles" className="ach-pill">
            Все роли и их способности <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
          </Link>
        </div>
      </section>

      {/* Способности */}
      <section id="abilities" className="scroll-mt-6">
        <SectionTitle icon={faWandMagicSparkles} title="Способности" />
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#c9b48f]">
          Способности покупаются за тени в магазине. Если мэр разрешил их в игре, у игрока появляется кнопка{' '}
          <b className="text-[#f3d27a]">«Способность»</b> — в ней только его купленные способности. За игру можно использовать{' '}
          <b className="text-[#f3d27a]">только одну</b>: дневную — во время голосования, ночную — пока идёт ночь.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ABILITIES.map((a, i) => (
            <div key={a.id} className="ach-card flex items-start gap-3 anim-scale-in" style={{ '--i': i }}>
              <span className="ability-option__icon">
                <FontAwesomeIcon icon={a.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#f3e5ab]">{a.name}</span>
                  <span className={`chip !py-0 !text-[9px] ${a.type === 'day' ? '' : 'chip--muted'}`}>
                    <FontAwesomeIcon icon={a.type === 'day' ? faSun : faMoon} className="mr-1" />
                    {a.type === 'day' ? 'День' : 'Ночь'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-snug text-[#a8916c]">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Важно знать */}
      <section id="extra" className="scroll-mt-6">
        <SectionTitle icon={faCrown} title="Важно знать" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {EXTRA.map((e, i) => (
            <div key={e.title} className="ach-card ach-card--done anim-scale-in" style={{ '--i': i }}>
              <div className="flex items-center gap-3">
                <span className="ach-medal ach-medal--done">
                  <FontAwesomeIcon icon={e.icon} />
                </span>
                <h3 className="font-display text-lg font-black text-[#f3e5ab]">{e.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#c9b48f]">{e.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Призыв */}
      <section className="ach-legend ach-legend--done text-center">
        <div className="ach-legend__sheen" />
        <div className="relative">
          <h2 className="font-display text-2xl font-black text-[#ffe9a8] sm:text-3xl">Готовы к первой ночи?</h2>
          <p className="mt-2 text-sm text-[#c9b48f]">Соберите друзей и проверьте, кто из вас лучше всех врёт.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/online" className="btn btn-gold">
              Играть онлайн
            </Link>
            <Link to="/play" className="btn btn-ghost">
              Офлайн с ведущим
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/50" />
      <FontAwesomeIcon icon={icon} className="text-[#d4af37]" />
      <h2 className="font-display text-2xl font-black text-[#f3e5ab] sm:text-3xl">{title}</h2>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/50" />
    </div>
  );
}

export default Rules;
