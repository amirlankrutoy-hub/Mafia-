import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCrown, faCheck } from '@fortawesome/free-solid-svg-icons';

import { ACHIEVEMENTS } from '../data/achievements_data';
import { CATEGORIES, categoryOf } from '../data/achievementCategories';
import { getUnlockedIds, getProgress } from '../services/achievementsService';
import useSeo from '../hooks/useSeo';

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'done', label: 'Открытые' },
  { id: 'progress', label: 'В процессе' },
  { id: 'locked', label: 'Не начатые' }
];

function ProgressRing({ pct }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="ach-ring relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="achRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff1b8" />
            <stop offset="50%" stopColor="#f3d27a" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#achRingGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="ach-ring__bar"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-black text-[#f3e5ab]">{pct}%</span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#a8916c]">собрано</span>
      </div>
    </div>
  );
}

function Medal({ icon, done, size = 'md' }) {
  return (
    <div className={`ach-medal ach-medal--${size} ${done ? 'ach-medal--done' : ''}`}>
      <FontAwesomeIcon icon={done ? icon : faLock} />
    </div>
  );
}

function AchievementCard({ def, done, progress, i }) {
  const cat = categoryOf(def);
  const started = progress.value > 0;
  return (
    <div className={`ach-card anim-scale-in ${done ? 'ach-card--done' : ''}`} style={{ '--i': Math.min(i, 12) }}>
      {done && (
        <span className="ach-card__check" title="Выполнено">
          <FontAwesomeIcon icon={faCheck} />
        </span>
      )}
      <div className="flex items-start gap-3">
        <Medal icon={cat.icon} done={done} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold leading-tight ${done ? 'text-[#f3e5ab]' : started ? 'text-[#d9c9a8]' : 'text-zinc-400'}`}>
            {def.title}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[#a8916c]">{def.description}</p>
        </div>
      </div>

      <div className="mt-3">
        {done ? (
          <div className="ach-bar">
            <div className="ach-bar__fill" style={{ width: '100%' }} />
          </div>
        ) : (
          <div className="ach-bar">
            <div className="ach-bar__fill" style={{ width: `${Math.max(progress.pct, started ? 3 : 0)}%` }} />
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between text-[10px]">
          <span className={done ? 'font-bold uppercase tracking-widest text-[#f3d27a]' : 'text-zinc-500'}>
            {done ? 'Выполнено' : `${Math.min(progress.value, progress.threshold)} / ${progress.threshold}`}
          </span>
          <span className={`ach-reward ${done ? 'ach-reward--done' : ''}`}>
            <img src="/krital.svg" alt="" className="h-3.5 w-3.5 rounded-full" />+{def.reward}
          </span>
        </div>
      </div>
    </div>
  );
}

const Achievements = () => {
  useSeo({ title: 'Достижения', description: 'Достижения игроков Mafia Play.', path: '/achievements' });
  const [unlocked, setUnlocked] = useState(getUnlockedIds());
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const refresh = () => setUnlocked(getUnlockedIds());
    window.addEventListener('mafia-achievements-changed', refresh);
    return () => window.removeEventListener('mafia-achievements-changed', refresh);
  }, []);

  const items = useMemo(
    () =>
      ACHIEVEMENTS.map((def) => ({
        def,
        cat: categoryOf(def),
        done: unlocked.includes(def.id),
        progress: getProgress(def)
      })),
    [unlocked]
  );

  const gold = items.find((x) => x.def.gold);
  const regular = items.filter((x) => !x.def.gold);
  const doneCount = items.filter((x) => x.done).length;
  const pct = Math.round((doneCount / items.length) * 100);
  const earned = items.filter((x) => x.done).reduce((s, x) => s + x.def.reward, 0);
  const closest = regular
    .filter((x) => !x.done && x.progress.value > 0)
    .sort((a, b) => b.progress.pct - a.progress.pct)[0];

  const visible = regular.filter((x) => {
    if (category !== 'all' && x.cat.id !== category) return false;
    if (filter === 'done') return x.done;
    if (filter === 'progress') return !x.done && x.progress.value > 0;
    if (filter === 'locked') return !x.done && x.progress.value === 0;
    return true;
  });

  const groups = CATEGORIES.map((c) => ({
    cat: c,
    list: visible.filter((x) => x.cat.id === c.id).sort((a, b) => Number(b.done) - Number(a.done) || b.progress.pct - a.progress.pct),
    total: regular.filter((x) => x.cat.id === c.id).length,
    done: regular.filter((x) => x.cat.id === c.id && x.done).length
  })).filter((g) => g.list.length);

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
      {/* Шапка с общим прогрессом */}
      <section className="ach-hero anim-fade-up">
        <div className="ach-hero__glow" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ProgressRing pct={pct} />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#a8916c]">Зал славы</p>
            <h1 className="ach-title font-display text-4xl font-black sm:text-5xl">Достижения</h1>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
              <div className="ach-stat">
                <b>{doneCount}</b>
                <span>из {items.length}</span>
              </div>
              <div className="ach-stat">
                <b>
                  <img src="/krital.svg" alt="" className="h-4 w-4 rounded-full" />
                  {earned}
                </b>
                <span>теней</span>
              </div>
              <div className="ach-stat">
                <b>{regular.filter((x) => !x.done && x.progress.value > 0 && x.cat.id !== 'bonus').length}</b>
                <span>в процессе</span>
              </div>
            </div>
            {closest && (
              <p className="mt-3 text-xs text-[#a8916c]">
                Ближе всего: <b className="text-[#f3e5ab]">{closest.def.title}</b> — {closest.progress.value}/{closest.progress.threshold}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Золотое легендарное достижение */}
      {gold && (
        <section className={`ach-legend mt-5 anim-fade-up ${gold.done ? 'ach-legend--done' : ''}`} style={{ '--i': 1 }}>
          <div className="ach-legend__sheen" />
          <div className="relative flex items-center gap-4">
            <div className={`ach-medal ach-medal--lg ${gold.done ? 'ach-medal--done ach-medal--legend' : ''}`}>
              <FontAwesomeIcon icon={gold.done ? faCrown : faLock} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="chip !text-[9px]">Легендарное</span>
              <p className={`mt-1.5 font-display text-lg font-black sm:text-xl ${gold.done ? 'text-[#ffe9a8]' : 'text-zinc-300'}`}>
                {gold.def.title}
              </p>
              <p className="mt-0.5 text-xs text-[#a8916c]">{gold.def.description}</p>
            </div>
            <span className={`ach-reward ach-reward--lg ${gold.done ? 'ach-reward--done' : ''}`}>
              <img src="/krital.svg" alt="" className="h-4 w-4 rounded-full" />+{gold.def.reward}
            </span>
          </div>
        </section>
      )}

      {/* Фильтры */}
      <div className="mt-6">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`ach-pill ${filter === f.id ? 'ach-pill--active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button type="button" onClick={() => setCategory('all')} className={`ach-pill ach-pill--sm ${category === 'all' ? 'ach-pill--active' : ''}`}>
            Все категории
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`ach-pill ach-pill--sm shrink-0 ${category === c.id ? 'ach-pill--active' : ''}`}
            >
              <FontAwesomeIcon icon={c.icon} className="text-[10px]" /> {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Сетка по категориям */}
      {groups.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[#a8916c]">Здесь пока пусто — играйте, и достижения появятся.</p>
      ) : (
        groups.map((g) => (
          <section key={g.cat.id} className="mt-6">
            <div className="mb-3 flex items-center gap-3">
              <FontAwesomeIcon icon={g.cat.icon} className="text-[#d4af37]" />
              <h2 className="font-display text-xl font-black text-[#f3e5ab]">{g.cat.label}</h2>
              <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/40 to-transparent" />
              <span className="text-xs font-bold text-[#a8916c]">
                {g.done}/{g.total}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.list.map((x, i) => (
                <AchievementCard key={x.def.id} def={x.def} done={x.done} progress={x.progress} i={i} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default Achievements;
