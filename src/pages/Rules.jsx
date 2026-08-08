import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faGavel, faShieldHalved, faArrowRight } from '@fortawesome/free-solid-svg-icons';

function Rules() {
  const rulesList = [
    {
      step: '01',
      title: 'Знакомство и распределение ролей',
      icon: faShieldHalved,
      description: 'В начале игры ведущий (или система) конфиденциально распределяет роли между игроками. Город делится на три лагеря: Мирные жители (пытаются вычислить мафию), Мафия (ночью устраняет жителей) и Одиночки / Нейтралы (преследуют собственные цели).'
    },
    {
      step: '02',
      title: 'Первая ночь: Город засыпает',
      icon: faMoon,
      description: 'Наступает ночная фаза. Все игроки закрывают глаза. По команде ведущего просыпается Мафия и знакомится друг с другом, выбирая свою первую жертву. Затем могут просыпаться активные мирные роли (Доктор, Шериф) и одиночки для совершения своих ночных действий.'
    },
    {
      step: '03',
      title: 'Утро и день: Город просыпается',
      icon: faSun,
      description: 'Ведущий объявляет итоги ночи: кто из игроков был убит или спасен. Начинается дневное обсуждение. Жители деликатно или бурно спорят, анализируют улики, ищут подозрительные совпадения и обвиняют друг друга в причастности к преступному клану.'
    },
    {
      step: '04',
      title: 'Дневное голосование (Суд семьи)',
      icon: faGavel,
      description: 'По окончании обсуждения проводится общее голосование. Игрок, набравший наибольшее количество голосов против себя, считается «арестованным» или изгнанным из города. Перед тем как покинуть игру, он имеет право на последнее слово.'
    },
    {
      step: '05',
      title: 'Условия победы',
      icon: faArrowRight,
      description: 'Игра продолжается чередованием фаз дня и ночи. Мирные жители побеждают, когда в городе не остается ни одного члена мафии и маньяка. Мафия побеждает, если их количество сравнивается или превышает количество оставшихся мирных жителей.'
    }
  ];

  return (
    <div className="space-y-10 py-6 max-w-5xl mx-auto">
      {/* Шапка страницы */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#080402] p-8 text-center shadow-[0_0_50px_rgba(212,175,55,0.25)]">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-widest text-[#d4af37] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          Кодекс и Правила Игры
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#c5a059] max-w-2xl mx-auto italic">
          Законы мафии суровы, но справедливы. Изучите поэтапный регламент проведения расследований и ночных операций.
        </p>
      </div>

      {/* Список правил по порядку */}
      <div className="space-y-6">
        {rulesList.map((rule, index) => (
          <div
            key={index}
            className="group relative flex flex-col md:flex-row items-start md:items-center justify-between overflow-hidden rounded-xl border border-[#c5a059]/40 bg-gradient-to-r from-[#1c100b] via-[#120a07] to-[#0a0503] p-6 shadow-xl transition-all duration-300 hover:border-[#d4af37] hover:shadow-[0_0_25px_rgba(212,175,55,0.2)] gap-6"
          >
            {/* Декоративные уголки */}
            <div className="absolute top-1.5 left-1.5 h-3 w-3 border-l-2 border-t-2 border-[#d4af37]/60 group-hover:border-[#d4af37]"></div>
            <div className="absolute top-1.5 right-1.5 h-3 w-3 border-r-2 border-t-2 border-[#d4af37]/60 group-hover:border-[#d4af37]"></div>
            <div className="absolute bottom-1.5 left-1.5 h-3 w-3 border-l-2 border-b-2 border-[#d4af37]/60 group-hover:border-[#d4af37]"></div>
            <div className="absolute bottom-1.5 right-1.5 h-3 w-3 border-r-2 border-b-2 border-[#d4af37]/60 group-hover:border-[#d4af37]"></div>

            {/* Номер и Иконка */}
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-3xl sm:text-4xl font-black text-[#d4af37]/40 group-hover:text-[#d4af37] transition-colors font-mono">
                {rule.step}
              </span>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#d4af37]/50 bg-[#8b0000]/40 text-[#f3e5ab] shadow-inner group-hover:bg-[#d4af37] group-hover:text-black transition-all">
                <FontAwesomeIcon icon={rule.icon} className="text-xl" />
              </div>
            </div>

            {/* Описание правила */}
            <div className="flex-1 space-y-2 text-left">
              <h3 className="text-xl font-bold uppercase tracking-wider text-[#d4af37]">
                {rule.title}
              </h3>
              <p className="text-xs sm:text-sm italic leading-relaxed text-[#c5a059]/90">
                "{rule.description}"
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Кнопка возврата или перехода к игре */}
      <div className="flex justify-center pt-4">
        <Link
          to="/play"
          className="rounded-xl bg-gradient-to-r from-[#8b0000] to-[#5c0000] px-8 py-3 text-sm font-bold uppercase tracking-widest text-[#f3e5ab] border border-[#d4af37] shadow-lg transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
        >
          🎮 Начать игру по правилам
        </Link>
      </div>
    </div>
  );
}

export default Rules;