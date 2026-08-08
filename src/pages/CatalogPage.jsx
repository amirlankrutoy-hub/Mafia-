// pages/CatalogPage.jsx
import React, { useState } from 'react';
import { Filter, SlidersHorizontal } from 'lucide-react';

export const CatalogPage = () => {
  const [items] = useState([
    { id: 1, name: 'Разработка UI', status: 'В процессе', price: '$450' },
    { id: 2, name: 'Адаптивный дизайн', status: 'Завершено', price: '$300' },
    { id: 3, name: 'Оптимизация скорости', status: 'Ожидание', price: '$200' },
  ]);

  return (
    <div className="space-y-4">
      {/* Панель фильтров (Мобильная) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap">
          <SlidersHorizontal size={14} /> Фильтры
        </button>
        <button className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-medium whitespace-nowrap">
          Все категории
        </button>
        <button className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400 whitespace-nowrap">
          Активные
        </button>
      </div>

      {/* 📱 МОБИЛЬНЫЙ ВАРИАНТ: Карточки вместо громоздкой таблицы */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-500">ID #{item.id}</span>
                <h3 className="font-bold text-white text-base">{item.name}</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {item.status}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">Стоимость:</span>
              <span className="text-sm font-bold text-cyan-400">{item.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};