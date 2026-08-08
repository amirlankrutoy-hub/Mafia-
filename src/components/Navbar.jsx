import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeHigh, faVolumeXmark, faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import CurrencyBar from './shop/CurrencyBar';
import TopUpModal from './shop/TopUpModal';
import { useMusic } from '../context/MusicContext';
import { getAdminRoleInfo, logoutAdmin } from '../services/admin';

const Navbar = ({ userName, onChangeName }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const { menuMuted, toggleMenuMute, playMenu } = useMusic();
  const navigate = useNavigate();

  const [adminRole, setAdminRole] = useState(getAdminRoleInfo());

  useEffect(() => {
    const refresh = () => setAdminRole(getAdminRoleInfo());
    window.addEventListener("mafia-admin-changed", refresh);
    return () => window.removeEventListener("mafia-admin-changed", refresh);
  }, []);

  const handleAdminLogout = () => {
    logoutAdmin();
    setAdminRole(null);
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const goPlay = (e) => {
    e.preventDefault();
    setIsMenuOpen(false);
    sessionStorage.removeItem('mafia_story_seen');
    navigate('/online');
  };

  const handleMusicClick = () => {
    toggleMenuMute();
    if (menuMuted) {
      setTimeout(() => playMenu(), 50);
    }
  };

  const linkClass =
    'rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#f3e5ab] border border-[#d4af37] shadow-md transition-all hover:brightness-125 hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]';

  const mobileLinkClass =
    'block text-center rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] py-2.5 text-xs font-bold uppercase tracking-widest text-[#f3e5ab] border border-[#d4af37]';

  return (
    <>
      <nav className="border-b border-[#d4af37]/30 bg-[#140b07]/95 shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md sticky top-0 z-40 relative" >
        <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className="group flex items-center gap-2 shrink-0"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="absolute left-0">
                <img className="w-8 h-8 sm:w-10 sm:h-10 md:w-[50px] md:h-[50px]" src="/favicon.svg" alt="Mafia Play" />
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-3 lg:gap-5">
              <Link to="/" className={linkClass}>Главная</Link>
              <Link to="/rules" className={linkClass}>Правила</Link>
              <button type="button" onClick={goPlay} className={linkClass}>Играть</button>
              <Link to="/shop" className={linkClass}>Магазин</Link>

              <button
                type="button"
                onClick={handleMusicClick}
                title={menuMuted ? 'Включить музыку' : 'Выключить музыку'}
                aria-label={menuMuted ? 'Включить музыку' : 'Выключить музыку'}
                className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition ${menuMuted
                    ? 'border-zinc-600 bg-zinc-900 text-zinc-400'
                    : 'border-[#d4af37] bg-[#1c100b] text-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                  }`}
              >
                <FontAwesomeIcon icon={menuMuted ? faVolumeXmark : faVolumeHigh} />
              </button>

              <CurrencyBar onOpenTopUp={() => setShowTopUp(true)} />

              {userName && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#c5a059]">
                    {adminRole ? (
                      <strong style={{ color: adminRole.color }}>{adminRole.label}</strong>
                    ) : (
                      <strong className="text-[#d4af37]">{userName}</strong>
                    )}
                  </span>
                  {adminRole ? (
                    <>
                      <Link
                        to="/admin"
                        className="rounded border border-[#d4af37]/50 px-2 py-1 text-[10px] uppercase text-[#d4af37]"
                      >
                        Панель
                      </Link>
                      <button
                        onClick={handleAdminLogout}
                        className="rounded border border-red-500/40 px-2 py-1 text-[10px] uppercase text-red-400"
                      >
                        Выйти
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={onChangeName}
                      className="rounded border border-[#c5a059]/30 bg-[#180e0a] px-2 py-1 text-[10px] uppercase text-[#c5a059]"
                    >
                      Сменить
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex md:hidden items-center gap-2">

              <CurrencyBar onOpenTopUp={() => setShowTopUp(true)} />

              <button
                type="button"
                onClick={toggleMenu}
                className="h-9 w-9 rounded-lg border border-[#d4af37]/50 text-[#d4af37] flex items-center justify-center"
                aria-label="Меню"
              >
                <FontAwesomeIcon icon={isMenuOpen ? faXmark : faBars} />
              </button>

            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden mt-3 space-y-3 pb-3">

              {/* Музыка */}
              <button
                onClick={handleMusicClick}
                className="w-full rounded-xl border border-[#d4af37]/30 bg-[#180e0a] p-4 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon
                    icon={menuMuted ? faVolumeXmark : faVolumeHigh}
                    className="text-[#d4af37]"
                  />
                  <span className="text-[#f3e5ab] font-bold">
                    Музыка лобби
                  </span>
                </div>

                <span
                  className={`font-bold ${menuMuted
                      ? "text-red-400"
                      : "text-green-400"
                    }`}
                >
                  ● {menuMuted ? "Выключена" : "Включена"}
                </span>
              </button>

              {/* Валюта */}

              <div className="rounded-xl border border-[#d4af37]/30 bg-[#180e0a] p-4">
                <div className="text-[#f3e5ab] font-bold mb-2">
                  💰 Мафио
                </div>

                <CurrencyBar onOpenTopUp={() => setShowTopUp(true)} />
              </div>

              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass}
              >
                🏠 Главная
              </Link>

              <Link
                to="/rules"
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass}
              >
                📖 Правила
              </Link>

              <button
                type="button"
                onClick={goPlay}
                className={`w-full ${mobileLinkClass}`}
              >
                🎮 Играть
              </button>

              <Link
                to="/shop"
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass}
              >
                🛒 Магазин
              </Link>

              {userName && (
                <div className="flex flex-col gap-2 pt-3 border-t border-[#d4af37]/20">
                  <span className="text-xs text-[#c5a059]">
                    {adminRole ? (
                      <>Роль: <strong style={{ color: adminRole.color }}>{adminRole.label}</strong></>
                    ) : (
                      <>Игрок: <strong className="text-[#d4af37]">{userName}</strong></>
                    )}
                  </span>
                  <div className="flex gap-2">
                    {adminRole ? (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setIsMenuOpen(false)}
                          className="rounded border border-[#d4af37]/50 px-3 py-1 text-[10px] uppercase text-[#d4af37]"
                        >
                          Панель
                        </Link>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleAdminLogout();
                          }}
                          className="rounded border border-red-500/40 px-3 py-1 text-[10px] uppercase text-red-400"
                        >
                          Выйти
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onChangeName();
                        }}
                        className="rounded border border-[#c5a059]/30 bg-[#180e0a] px-3 py-1 text-[10px] uppercase tracking-wider text-[#c5a059]"
                      >
                        Сменить имя
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </nav>

      {showTopUp && (
        <TopUpModal onClose={() => setShowTopUp(false)} playerName={userName} />
      )}
    </>
  );
};

export default Navbar;
