import React from 'react';
import { Link } from 'react-router-dom';
import { isNewRole } from '../data/shopData';

const RoleCard = ({ role }) => {
  return (
    <Link 
      to={`/role/${role.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border-2 border-[#c5a059]/40 bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#0a0503] p-3 sm:p-4 shadow-[0_10px_25px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 hover:border-[#d4af37] hover:shadow-[0_15px_30px_rgba(212,175,55,0.25)]"
    >
      {isNewRole(role.id) && (
        <span className="absolute top-2 right-2 z-10 rounded-full bg-gradient-to-r from-[#8b0000] to-[#d4af37] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-pulse">
          New
        </span>
      )}
      {/* Декоративные уголки */}
      <div className="absolute top-1 left-1 h-3 w-3 border-t-2 border-l-2 border-[#d4af37]/60 group-hover:border-[#d4af37]" />
      <div className="absolute top-1 right-1 h-3 w-3 border-t-2 border-r-2 border-[#d4af37]/60 group-hover:border-[#d4af37]" />
      <div className="absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-[#d4af37]/60 group-hover:border-[#d4af37]" />
      <div className="absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-[#d4af37]/60 group-hover:border-[#d4af37]" />

      {/* Картинка (адаптивная высота) */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden rounded-lg border border-[#c5a059]/30 bg-black">
        <img 
          src={role.image} 
          alt={role.name} 
          className="h-full w-full object-cover object-top sepia-[0.15] contrast-105 transition-transform duration-500 group-hover:scale-105 group-hover:sepia-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0503] via-transparent to-transparent opacity-80" />
      </div>

      {/* Описание */}
      <div className="mt-3 sm:mt-4 text-center">
        <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-[#d4af37] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {role.name}
        </h3>
        <p className="mt-1.5 sm:mt-2 text-xs italic leading-relaxed text-[#c5a059]/90 line-clamp-2">
          "{role.description}"
        </p>
      </div>

      {/* Кнопка подробнее */}
      <div className="mt-3 sm:mt-4 border-t border-[#c5a059]/20 pt-2.5 sm:pt-3 text-center">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-[#d4af37] transition-colors group-hover:text-white">
          Досье игрока →
        </span>
      </div>
    </Link>
  );
};

export default RoleCard;