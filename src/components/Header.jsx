import React, { useState } from 'react';
import { Menu, X } from 'lucide-react'; // Набор иконки (можно использовать любые другие)

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navLinks = [
    { title: 'Главная', href: '#' },
    { title: 'О нас', href: '#' },
    { title: 'Услуги', href: '#' },
    { title: 'Контакты', href: '#' },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-md relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Логотип */}
          <div className="flex-shrink-0 font-bold text-xl text-cyan-400">
            Logo
          </div>

          {/* Навигация для десктопа (скрыта на мобильных) */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="hover:text-cyan-400 transition-colors duration-200 text-sm font-medium"
              >
                {link.title}
              </a>
            ))}
          </nav>

          {/* Кнопка "Бургер" для мобильных (скрыта на десктопе) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Выпадающее мобильное меню */}
      {isOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 animate-fadeIn">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                onClick={() => setIsOpen(false)} // Закрываем при клике
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;