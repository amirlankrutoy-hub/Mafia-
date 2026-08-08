// components/Layout.jsx
import React, { useState } from 'react';
import { Menu, X, Home, Grid, User, Settings, Bell, Search } from 'lucide-react';

export const Layout = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Главная', icon: <Home size={20} /> },
    { id: 'catalog', label: 'Каталог', icon: <Grid size={20} /> },
    { id: 'profile', label: 'Профиль', icon: <User size={20} /> },
    { id: 'settings', label: 'Настройки', icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* 🟢 ВЕРХНЯЯ ШАПКА (Header) */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Бургер для вызова бокового меню на мобилке */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-300 hover:bg-slate-800 active:scale-95 transition"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            AppMobile
          </span>
        </div>

        {/* Быстрые действия в шапке */}
        <div className="flex items-center gap-1 sm:gap-3">
          <button className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
            <Search size={20} />
          </button>
          <button className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
          </button>
        </div>
      </header>

      {/* 🔴 БОКОВОЕ МЕНЮ (Drawer / Sidebar) для мобилок и ПК */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Затемнение фона */}
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
          />
          
          {/* Сама панель */}
          <div className="relative w-[280px] max-w-[80vw] bg-slate-900 h-full border-r border-slate-800 p-5 flex flex-col z-10 animate-slideRight">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <span className="font-bold text-cyan-400 text-lg">Меню навигации</span>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 my-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                    activeTab === item.id 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 text-center">
              Версия приложения v2.4.0
            </div>
          </div>
        </div>
      )}

      {/* 🟡 ОСНОВНОЙ КОНТЕНТ СТРАНИЦЫ */}
      <main className="flex-1 pb-20 md:pb-6 px-4 py-6 max-w-5xl mx-auto w-full">
        {children}
      </main>

      {/* 🔵 НИЖНИЙ ТАБ-БАР (Bottom Navigation) — Только для мобилок */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 flex justify-around items-center">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              activeTab === item.id ? 'text-cyan-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};