// pages/ProfilePage.jsx
import React from 'react';
import { Camera, Save } from 'lucide-react';

export const ProfilePage = () => {
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Аватар */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-cyan-400 flex items-center justify-center text-2xl font-bold text-white">
            AN
          </div>
          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-cyan-500 text-slate-950 shadow-lg">
            <Camera size={16} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Пользователь</h2>
          <p className="text-xs text-slate-400">Frontend Developer</p>
        </div>
      </div>

      {/* Форма редактирования */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Имя пользователя</label>
          <input 
            type="text" 
            defaultValue="Амирлан"
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
          <input 
            type="email" 
            defaultValue="user@example.com"
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        {/* Кнопка сохранения на весь экран для удобного тапа */}
        <button 
          type="submit"
          className="w-full py-3.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition shadow-lg shadow-cyan-500/20"
        >
          <Save size={18} /> Сохранить изменения
        </button>
      </form>
    </div>
  );
};