import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import roles from '../data/roles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { ROLE_PRICES } from '../data/shopData';
import { ownsRole } from '../services/wallet';
import { isRoleDisabled } from '../services/admin';

function getTeamBadgeStyle(category) {
  switch (category) {
    case 'mafia':
      return 'border-red-600/60 bg-red-950/80 text-red-300';
    case 'neutrals':
      return 'border-purple-600/60 bg-purple-950/80 text-purple-300';
    case 'civilians':
    default:
      return 'border-emerald-600/60 bg-emerald-950/80 text-emerald-300';
  }
}

const RolesGallery = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredRoles = roles.filter((role) => {
    const dis = isRoleDisabled(role.id);
    if (dis && (!dis.until || dis.duration === 'permanent')) return false;
    if (activeCategory === 'all') return true;
    return role.category === activeCategory;
  });

  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-[#d4af37]">
          Персонажи и Карты
        </h2>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
              activeCategory === 'all'
                ? 'border-[#d4af37] bg-[#8b0000] text-[#f3e5ab] shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                : 'border-[#c5a059]/40 bg-[#120a07] text-[#c5a059] hover:border-[#d4af37]'
            }`}
          >
            Вся семья
          </button>

          <button
            onClick={() => setActiveCategory('civilians')}
            className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
              activeCategory === 'civilians'
                ? 'border-emerald-500 bg-emerald-950 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'border-[#c5a059]/40 bg-[#120a07] text-[#c5a059] hover:border-emerald-500'
            }`}
          >
            Жители
          </button>

          <button
            onClick={() => setActiveCategory('mafia')}
            className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
              activeCategory === 'mafia'
                ? 'border-red-600 bg-red-950 text-red-200 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                : 'border-[#c5a059]/40 bg-[#120a07] text-[#c5a059] hover:border-red-600'
            }`}
          >
            Мафии
          </button>

          <button
            onClick={() => setActiveCategory('neutrals')}
            className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
              activeCategory === 'neutrals'
                ? 'border-purple-600 bg-purple-950 text-purple-200 shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                : 'border-[#c5a059]/40 bg-[#120a07] text-[#c5a059] hover:border-purple-600'
            }`}
          >
            Нейтралы и Одиночки
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredRoles.map((role) => (
          <Link
            key={role.id}
            to={`/role/${role.id}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#c5a059]/40 bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#0a0503] p-4 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          >
            <div className="absolute top-1.5 left-1.5 h-3 w-3 border-l-2 border-t-2 border-[#d4af37]/60 group-hover:border-[#d4af37]"></div>
            <div className="absolute top-1.5 right-1.5 h-3 w-3 border-r-2 border-t-2 border-[#d4af37]/60 group-hover:border-[#d4af37]"></div>
            <div className="absolute bottom-1.5 left-1.5 h-3 w-3 border-l-2 border-b-2 border-[#d4af37]/60 group-hover:border-[#d4af37]"></div>
            <div className="absolute bottom-1.5 right-1.5 h-3 w-3 border-r-2 border-b-2 border-[#d4af37]/60 group-hover:border-[#d4af37]"></div>

            <div>
              <div className="relative h-60 w-full overflow-hidden rounded-lg border border-[#c5a059]/30 bg-black">
                <img
                  src={role.image}
                  alt={role.name}
                  className={`h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105 ${
                    ownsRole(role.id) ? '' : 'opacity-40 grayscale'
                  }`}
                />
                {!ownsRole(role.id) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
                    <span className="text-5xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">🔒</span>
                    <span className="rounded-md bg-black/70 border border-[#d4af37]/60 px-2 py-0.5 text-xs font-bold text-[#d4af37]">
                      {ROLE_PRICES[role.id] ?? 0} M
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 text-center space-y-1.5">
                <div>
                  <span className={`inline-block rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTeamBadgeStyle(role.category)}`}>
                    {role.team}
                  </span>
                </div>

                <h3 className="text-xl font-bold uppercase tracking-wider text-[#d4af37]">
                  {role.name}
                </h3>

                <p className="text-xs italic text-[#c5a059]/90 line-clamp-3">
                  "{role.description}"
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-[#c5a059]/20 pt-3 text-center">
              <span className="inline-block w-full rounded-lg border border-[#d4af37]/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f3e5ab] transition-all duration-300 group-hover:border-[#d4af37] group-hover:text-white group-hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                Досье <FontAwesomeIcon icon={faArrowRight} className="text-[#d4af37] transition-colors group-hover:text-white" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RolesGallery;
