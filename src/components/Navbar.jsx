import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVolumeHigh,
  faVolumeXmark,
  faBars,
  faXmark,
  faHouse,
  faBookOpen,
  faDiceSix,
  faStore,
  faUserGroup,
  faTrophy,
  faIdCard,
  faShieldHalved,
  faRightFromBracket,
  faLanguage
} from '@fortawesome/free-solid-svg-icons';
import TopUpModal from './shop/TopUpModal';
import LanguageSwitcher from './LanguageSwitcher';
import { useMusic } from '../context/MusicContext';
import { getAdminRoleInfo, logoutAdmin } from '../services/admin';
import { getTeniBalance } from '../services/teniWallet';
import { getBalance } from '../services/wallet';
import { getSelectedAvatar, getFavoriteRole } from '../services/profile';
import { updateProfile, announcePresence } from '../services/presence';
import TeniExchangeModal from './shop/TeniExchangeModal';

const Navbar = ({ account }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showTeniExchange, setShowTeniExchange] = useState(false);
  const { menuMuted, toggleMenuMute, playMenu } = useMusic();
  const navigate = useNavigate();
  const location = useLocation();

  const [adminRole, setAdminRole] = useState(getAdminRoleInfo());
  const [teniBalance, setTeniBalance] = useState(getTeniBalance());
  const [mafioBalance, setMafioBalance] = useState(getBalance());

  useEffect(() => {
    const refreshTeni = () => setTeniBalance(getTeniBalance());
    window.addEventListener('mafia-teni-changed', refreshTeni);
    window.addEventListener('mafia-achievements-changed', refreshTeni);
    return () => {
      window.removeEventListener('mafia-teni-changed', refreshTeni);
      window.removeEventListener('mafia-achievements-changed', refreshTeni);
    };
  }, []);

  useEffect(() => {
    const refreshMafio = () => setMafioBalance(getBalance());
    window.addEventListener('mafia-wallet-changed', refreshMafio);
    return () => window.removeEventListener('mafia-wallet-changed', refreshMafio);
  }, []);

  useEffect(() => {
    const refresh = () => setAdminRole(getAdminRoleInfo());
    window.addEventListener('mafia-admin-changed', refresh);
    return () => window.removeEventListener('mafia-admin-changed', refresh);
  }, []);

  // Синхронизируем публичный профиль (иконка/любимая роль/победы) с сервером,
  // чтобы другие игроки сразу видели актуальные данные.
  useEffect(() => {
    if (!account) return;

    const pushProfile = () => {
      import('../services/achievementsService').then((m) => {
        const stats = m.getStats?.() || {};
        updateProfile({
          accountId: account.id,
          name: account.name,
          icon: getSelectedAvatar(),
          favoriteRole: getFavoriteRole(),
          wins: stats.wins || 0
        });
      });
    };

    announcePresence(account.id, account.name);
    pushProfile();

    window.addEventListener('mafia-avatar-changed', pushProfile);
    window.addEventListener('mafia-favorite-role-changed', pushProfile);
    window.addEventListener('mafia-achievements-changed', pushProfile);
    return () => {
      window.removeEventListener('mafia-avatar-changed', pushProfile);
      window.removeEventListener('mafia-favorite-role-changed', pushProfile);
      window.removeEventListener('mafia-achievements-changed', pushProfile);
    };
  }, [account]);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const handleAdminLogout = () => {
    logoutAdmin();
    setAdminRole(null);
  };

  const goPlay = () => {
    setIsDrawerOpen(false);
    sessionStorage.removeItem('mafia_story_seen');
    navigate('/online');
  };

  const handleMusicClick = () => {
    toggleMenuMute();
    if (menuMuted) {
      setTimeout(() => playMenu(), 50);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Главная', icon: faHouse, to: '/' },
    { id: 'rules', label: 'Правила', icon: faBookOpen, to: '/rules' },
    { id: 'play', label: 'Играть', icon: faDiceSix, action: goPlay },
    { id: 'roles', label: 'Роли', icon: faIdCard, to: '/roles' },
    { id: 'shop', label: 'Магазин', icon: faStore, to: '/shop' },
    { id: 'friends', label: 'Друзья', icon: faUserGroup, to: '/friends' },
    { id: 'achievements', label: 'Достижения', icon: faTrophy, to: '/achievements' }
  ];

  // Общее содержимое боковой панели — используется и в постоянном
  // десктопном сайдбаре, и в выдвижном мобильном.
  const SidebarContent = ({ onNavigate }) => (
    <>
      <div className="flex items-center gap-2 pb-4 border-b border-[#d4af37]/20">
        <img className="w-9 h-9 rounded-full border border-[#d4af37]/50" src="/favicon.svg" alt="" />
        <span className="font-black text-[#d4af37] uppercase tracking-widest text-sm">
          Mafia Play
        </span>
      </div>

      {/* Профиль */}
      {account && (
        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate();
            navigate('/profile');
          }}
          className="mt-4 w-full rounded-xl border border-[#d4af37]/30 bg-[#0d0705]/60 p-3 text-left hover:border-[#d4af37]/60 transition"
        >
          <div className="text-[10px] uppercase tracking-widest text-[#c5a059]">
            {adminRole ? (
              <strong style={{ color: adminRole.color }}>{adminRole.label}</strong>
            ) : (
              'Игрок'
            )}
          </div>
          <div className="flex items-center gap-2">
            <img
              src={getSelectedAvatar()}
              alt=""
              className="h-8 w-8 rounded-full border border-[#d4af37]/50 object-cover"
            />
            <div className="min-w-0">
              <div className="text-base font-bold text-[#f3e5ab] truncate">{account.name}</div>
              <div className="text-[11px] text-[#c5a059]">
                ID: <span className="font-mono text-[#d4af37]">{account.id}</span>
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Валюта */}
      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => setShowTopUp(true)}
          className="w-full flex items-center justify-between rounded-xl border border-[#d4af37]/30 bg-[#180e0a] px-3 py-2"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-[#f3e5ab]">
            <img src="/mafio.png" alt="" className="w-6 h-6" />
            {mafioBalance.toLocaleString('ru-RU')}
          </span>
          <span className="h-5 w-5 rounded-full bg-[#d4af37] text-black text-xs font-black flex items-center justify-center">
            +
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowTeniExchange(true)}
          className="w-full flex items-center justify-between rounded-xl border border-[#d4af37]/30 bg-[#180e0a] px-3 py-2"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-[#f3e5ab]">
            <img src="/teni.png" alt="" className="w-7 h-7 rounded-full" />
            {teniBalance}
          </span>
          <span className="h-5 w-5 rounded-full bg-[#d4af37] text-black text-xs font-black flex items-center justify-center">
            +
          </span>
        </button>

        <button
          onClick={handleMusicClick}
          className="w-full rounded-xl border border-[#d4af37]/30 bg-[#180e0a] px-3 py-2 flex items-center justify-between"
        >
          <span className="flex items-center gap-2 text-[#f3e5ab] font-bold text-sm">
            <FontAwesomeIcon icon={menuMuted ? faVolumeXmark : faVolumeHigh} className="text-[#d4af37]" />
            Музыка
          </span>
          <span className={`text-xs font-bold ${menuMuted ? 'text-red-400' : 'text-green-400'}`}>
            ● {menuMuted ? 'Выкл' : 'Вкл'}
          </span>
        </button>

        <div className="w-full rounded-xl border border-[#d4af37]/30 bg-[#180e0a] px-3 py-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[#f3e5ab] font-bold text-sm">
            <FontAwesomeIcon icon={faLanguage} className="text-[#d4af37]" />
            Язык
          </span>
          <LanguageSwitcher />
        </div>
      </div>

      <nav className="flex-1 my-4 space-y-1.5">
        {menuItems.map((item) =>
          item.action ? (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase tracking-wide text-xs text-[#e6d5bc] bg-gradient-to-r from-[#8b0000]/60 to-[#5c0000]/60 border border-[#d4af37]/30 hover:brightness-125 transition"
            >
              <FontAwesomeIcon icon={item.icon} className="text-[#d4af37]" />
              {item.label}
            </button>
          ) : (
            <Link
              key={item.id}
              to={item.to}
              onClick={onNavigate}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase tracking-wide text-xs transition ${
                location.pathname === item.to
                  ? 'bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/40'
                  : 'text-[#c5a059] hover:bg-[#d4af37]/10 hover:text-[#f3e5ab] border border-transparent'
              }`}
            >
              <FontAwesomeIcon icon={item.icon} />
              {item.label}
            </Link>
          )
        )}

        {adminRole && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase tracking-wide text-xs text-[#d4af37] border border-[#d4af37]/40 hover:bg-[#d4af37]/10 transition"
          >
            <FontAwesomeIcon icon={faShieldHalved} />
            Админ-панель
          </Link>
        )}
      </nav>

      {adminRole && (
        <button
          onClick={handleAdminLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/40 py-2 text-[11px] uppercase font-bold text-red-400 hover:bg-red-500/10 transition"
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          Выйти из админки
        </button>
      )}

      <div className="pt-4 mt-4 border-t border-[#d4af37]/20 text-[10px] text-[#6b5636] text-center">
        Mafia Play
      </div>
    </>
  );

  return (
    <>
      {/* ---------------- ПОСТОЯННЫЙ САЙДБАР (десктоп) ---------------- */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex-col lg:p-5 bg-gradient-to-b from-[#1c100b] via-[#140b07] to-[#0a0503] border-r-2 border-[#d4af37]/40 overflow-y-auto">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* ---------------- МОБИЛЬНАЯ ВЕРХНЯЯ ПАНЕЛЬ ---------------- */}
      <nav className="lg:hidden border-b border-[#d4af37]/30 bg-[#140b07]/95 shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md sticky top-0 z-40">
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Открыть меню"
              className="h-10 w-10 rounded-lg border border-[#d4af37]/50 text-[#d4af37] flex items-center justify-center hover:bg-[#d4af37]/10 active:scale-95 transition"
            >
              <FontAwesomeIcon icon={faBars} size="lg" />
            </button>
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img className="w-8 h-8 rounded-full" src="/favicon.svg" alt="Mafia Play" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#140b07] px-2 py-1">
              <img src="/mafio.png" alt="" className="w-5 h-5" />
              <span className="text-xs font-bold text-[#f3e5ab]">{mafioBalance}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#140b07] px-2 py-1">
              <img src="/teni.png" alt="" className="w-5 h-5 rounded-full" />
              <span className="text-xs font-bold text-[#d4af37]">{teniBalance}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ---------------- ВЫДВИЖНОЙ САЙДБАР (мобайл) ---------------- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative w-[280px] max-w-[82vw] h-full bg-gradient-to-b from-[#1c100b] via-[#140b07] to-[#0a0503] border-r-2 border-[#d4af37]/40 p-5 flex flex-col z-10 shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-y-auto">
            <div className="flex justify-end -mt-1 -mr-1">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg text-[#c5a059] hover:bg-[#d4af37]/10"
                aria-label="Закрыть меню"
              >
                <FontAwesomeIcon icon={faXmark} size="lg" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setIsDrawerOpen(false)} />
          </div>
        </div>
      )}

      {showTopUp && (
        <TopUpModal onClose={() => setShowTopUp(false)} playerName={account?.name} />
      )}

      {showTeniExchange && (
        <TeniExchangeModal onClose={() => setShowTeniExchange(false)} />
      )}
    </>
  );
};

export default Navbar;
