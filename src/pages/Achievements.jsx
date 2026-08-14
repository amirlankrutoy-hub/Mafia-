import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCrown } from '@fortawesome/free-solid-svg-icons';

import { ACHIEVEMENTS } from '../data/achievements_data';
import { getUnlockedIds, getProgress } from '../services/achievementsService';

const Achievements = () => {
  const [unlocked, setUnlocked] = useState(getUnlockedIds());

  useEffect(() => {
    const refresh = () => {
      setUnlocked(getUnlockedIds());
    };

    window.addEventListener('mafia-achievements-changed', refresh);

    return () => {
      window.removeEventListener('mafia-achievements-changed', refresh);
    };
  }, []);

  const unlockedCount = unlocked.length;

  return (
    <div className="max-w-5xl mx-auto py-6 px-3">
      <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-[#d4af37] text-center">
        Достижения
      </h1>

      <p className="mt-2 text-center text-sm text-[#c5a059]">
        Открыто {unlockedCount} / {ACHIEVEMENTS.length}
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACHIEVEMENTS.map((def) => {
          const isDone = unlocked.includes(def.id);
          const progress = getProgress(def);

          // Золотое особое достижение
          if (def.gold) {
            return (
              <div
                key={def.id}
                className={`sm:col-span-2 lg:col-span-3 rounded-2xl border-2 p-5 flex items-center gap-4 ${
                  isDone
                    ? 'border-[#ffd76a] bg-gradient-to-r from-[#4a3a05] via-[#2a1f04] to-[#4a3a05] shadow-[0_0_30px_rgba(255,215,100,0.35)]'
                    : 'border-zinc-700 bg-zinc-950/60 opacity-70'
                }`}
              >
                <FontAwesomeIcon
                  icon={faCrown}
                  className={`text-4xl ${
                    isDone ? 'text-[#ffd76a]' : 'text-zinc-600'
                  }`}
                />

                <div>
                  <div
                    className={`text-lg font-black ${
                      isDone ? 'text-[#ffe9a8]' : 'text-zinc-400'
                    }`}
                  >
                    {def.title}
                  </div>

                  <div className="text-xs text-[#c5a059] mt-1">
                    {def.description}
                  </div>

                  {!isDone && (
                    <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                      <FontAwesomeIcon icon={faLock} />
                      Заблокировано
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Обычное достижение
          return (
            <div
              key={def.id}
              className={`rounded-xl border p-3.5 flex flex-col gap-1.5 ${
                isDone
                  ? 'border-[#d4af37]/60 bg-[#180e0a]'
                  : 'border-zinc-800 bg-zinc-950/50 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-bold truncate ${
                    isDone ? 'text-[#f3e5ab]' : 'text-zinc-400'
                  }`}
                >
                  {def.title}
                </span>

                {isDone ? (
                  <img
                    src="/teni.png"
                    alt=""
                    className="w-5 h-5 rounded-full shrink-0"
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={faLock}
                    className="text-zinc-600 shrink-0"
                  />
                )}
              </div>

              <p className="text-[11px] text-[#8b6b12] leading-snug">
                {def.description}
              </p>

              {!isDone && (
                <div className="mt-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#d4af37]/70"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress.pct))}%`,
                    }}
                  />
                </div>
              )}

              {!isDone && (
                <span className="text-[10px] text-zinc-500">
                  {progress.value} / {progress.threshold}
                </span>
              )}

              <span className="text-[10px] font-bold text-[#d4af37]">
                +{def.reward} теней
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;