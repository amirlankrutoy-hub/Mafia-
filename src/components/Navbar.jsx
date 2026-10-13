import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  faLanguage,
  faRankingStar,
  faPlay,
  faGear
} from '@fortawesome/free-solid-svg-icons';
import TopUpModal from './shop/TopUpModal';
import LanguageSwitcher from './LanguageSwitcher';
import { useMusic } from '../context/MusicContext';
import { isAdmin, onAdminChanged } from '../services/admin';
import { getTeniBalance } from '../services/teniWallet';
import { getBalance } from '../services/wallet';
import { getSelectedAvatar, getFavoriteRole } from '../services/profile';
import { updateProfile } from '../services/presence';
import TeniExchangeModal from './shop/TeniExchangeModal';
import Logo from './ui/Logo';
import Avatar from './ui/Avatar';
import SupportReportModal from './SupportReportModal';
import { isSupport, onStatusChanged } from '../services/status';
import { totalUnread, onUnreadChanged } from '../services/dm';

const NAV = [
  { id: 'home', label: 'Главная', icon: faHouse, to: '/' },
  { id: 'rules', label: 'Правила', icon: faBookOpen, to: '/rules' },
  { id: 'roles', label: 'Роли', icon: faIdCard, to: '/roles' },
  { id: 'top', label: 'Мировой топ', icon: faRankingStar, to: '/top' },
  { id: 'friends', label: 'Друзья', icon: faUserGroup, to: '/friends' },
  { id: 'shop', label: 'Магазин', icon: faStore, to: '/shop' },
  { id: 'achievements', label: 'Достижения', icon: faTrophy, to: '/achievements' },
  { id: 'settings', label: 'Настройки', icon: faGear, to: '/settings' }
];

// 100000 -> "100K", чтобы крупный баланс помещался в кнопку
const compact = (n) =>
  n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : n.toLocaleString('ru-RU');

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c0151f] px-1.5 text-[10px] font-black text-white shadow-[0_0_12px_rgba(192,21,31,0.8)] anim-pop">
      {count > 9 ? '9+' : count}
    </span>
  );
}

const Navbar = ({ account }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showTeniExchange, setShowTeniExchange] = useState(false);
  const { menuMuted, toggleMenuMute, playMenu } = useMusic();
  const navigate = useNavigate();
  const location = useLocation();

  const [admin, setAdmin] = useState(isAdmin());
  const [teniBalance, setTeniBalance] = useState(getTeniBalance());
  const [mafioBalance, setMafioBalance] = useState(getBalance());
  const [avatar, setAvatar] = useState(getSelectedAvatar());
  const [requests, setRequests] = useState(0);
  const [support, setSupport] = useState(isSupport());
  const [dmUnread, setDmUnread] = useState(totalUnread());
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const offStatus = onStatusChanged(() => setSupport(isSupport()));
    const offDm = onUnreadChanged(() => setDmUnread(totalUnread()));
    return () => {
      offStatus();
      offDm();
    };
  }, []);

  useEffect(() => {
    const refreshTeni = () => setTeniBalance(getTeniBalance());
    const refreshMafio = () => setMafioBalance(getBalance());
    const refreshAvatar = () => setAvatar(getSelectedAvatar());
    const onRequests = (e) => setRequests(e.detail?.count || 0);
    window.addEventListener('mafia-teni-changed', refreshTeni);
    window.addEventListener('mafia-achievements-changed', refreshTeni);
    window.addEventListener('mafia-wallet-changed', refreshMafio);
    window.addEventListener('mafia-avatar-changed', refreshAvatar);
    window.addEventListener('mafia-friend-requests', onRequests);
    const offAdmin = onAdminChanged(() => setAdmin(isAdmin()));
    return () => {
      window.removeEventListener('mafia-teni-changed', refreshTeni);
      window.removeEventListener('mafia-achievements-changed', refreshTeni);
      window.removeEventListener('mafia-wallet-changed', refreshMafio);
      window.removeEventListener('mafia-avatar-changed', refreshAvatar);
      window.removeEventListener('mafia-friend-requests', onRequests);
      offAdmin();
    };
  }, []);

  // Публичный профиль (иконка/любимая роль) — другие игроки сразу видят изменения
  useEffect(() => {
    if (!account) return;
    const pushProfile = () =>
      updateProfile({
        accountId: account.id,
        name: account.name,
        icon: getSelectedAvatar(),
        favoriteRole: getFavoriteRole()
      });
    pushProfile();
    window.addEventListener('mafia-avatar-changed', pushProfile);
    window.addEventListener('mafia-favorite-role-changed', pushProfile);
    return () => {
      window.removeEventListener('mafia-avatar-changed', pushProfile);
      window.removeEventListener('mafia-favorite-role-changed', pushProfile);
    };
  }, [account]);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const goPlay = () => {
    setIsDrawerOpen(false);
    navigate('/online');
  };

  const handleMusicClick = () => {
    toggleMenuMute();
    if (menuMuted) setTimeout(() => playMenu(), 50);
  };

  const linkClass = ({ isActive }) =>
    `group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-bold tracking-wide transition-all duration-300 ${
      isActive
        ? 'bg-gradient-to-r from-[#d4af37]/20 to-transparent text-[#f3d27a]'
        : 'text-[#a8916c] hover:bg-white/[0.03] hover:text-[#f3d27a] hover:translate-x-1'
    }`;

  const SidebarContent = () => (
    <>
      <Link to="/" className="flex items-center gap-3 pb-5">
        <Logo size={52} />
        <div>
          <div className="font-display text-xl font-black leading-none gold-text">Mafia Play</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#a8916c]">Cosa Nostra</div>
        </div>
      </Link>

      {account && (
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="noir-card noir-card--flat spotlight w-full p-3 text-left transition hover:brightness-110"
        >
          <div className="flex items-center gap-3">
            <Avatar src={avatar} size={42} online />
            <div className="min-w-0">
              <div className="truncate font-bold text-[#f3e5ab]">{account.name}</div>
              <div className="text-[11px] text-[#a8916c]">
                ID <span className="font-mono text-[#d4af37]">{account.id}</span>
                {admin && <span className="ml-2 chip !py-0 !text-[9px]">Админ</span>}
                {support && <span className="ml-2 chip chip--green !py-0 !text-[9px]">Саппорт</span>}
              </div>
            </div>
          </div>
        </button>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowTopUp(true)}
          className="flex items-center justify-between rounded-xl border border-[#d4af37]/25 bg-black/30 px-2.5 py-2 transition hover:border-[#d4af37]/60"
          title="Токены"
        >
          <span className="flex items-center gap-1.5 text-sm font-bold text-[#f3e5ab]">
            <img src="/tokens.png" alt="" className="h-5 w-5" />
            {compact(mafioBalance)}
          </span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#d4af37] text-[10px] font-black text-black">+</span>
        </button>
        <button
          type="button"
          onClick={() => setShowTeniExchange(true)}
          className="flex items-center justify-between rounded-xl border border-[#d4af37]/25 bg-black/30 px-2.5 py-2 transition hover:border-[#d4af37]/60"
          title="Тени"
        >
          <span className="flex items-center gap-1.5 text-sm font-bold text-[#f3e5ab]">
            <img src="/krital.svg" alt="" className="h-5 w-5 rounded-full" />
            {compact(teniBalance)}
          </span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#d4af37] text-[10px] font-black text-black">+</span>
        </button>
      </div>

      <button type="button" onClick={goPlay} className="btn btn-blood btn-pulse mt-4 w-full">
        <FontAwesomeIcon icon={faDiceSix} /> Играть
      </button>

      <nav className="mt-4 flex-1 space-y-0.5">
        {NAV.map((item, i) => (
          <NavLink key={item.id} to={item.to} end={item.to === '/'} className={linkClass} style={{ '--i': i }}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[#f3d27a] shadow-[0_0_10px_#d4af37]" />}
                <FontAwesomeIcon icon={item.icon} className="w-4 transition-transform duration-300 group-hover:scale-110" />
                {item.label}
                {item.id === 'friends' && <Badge count={requests + dmUnread} />}
              </>
            )}
          </NavLink>
        ))}
        {support && (
          <button type="button" onClick={() => setReportOpen(true)} className="group relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-[13px] font-bold tracking-wide text-emerald-300 transition hover:bg-emerald-500/10">
            <FontAwesomeIcon icon={faShieldHalved} className="w-4" />
            Связь с админом
          </button>
        )}
        {admin && (
          <NavLink to="/admin" className={linkClass}>
            <FontAwesomeIcon icon={faShieldHalved} className="w-4" />
            Админ-панель
          </NavLink>
        )}
      </nav>

      <div className="mt-4 space-y-2 border-t border-[#d4af37]/15 pt-4">
        <button
          onClick={handleMusicClick}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[#e6d5bc] transition hover:bg-white/[0.03]"
        >
          <span className="flex items-center gap-2.5 font-semibold">
            <FontAwesomeIcon icon={menuMuted ? faVolumeXmark : faVolumeHigh} className="w-4 text-[#d4af37]" />
            Музыка
          </span>
          <span
            className={`relative h-5 w-9 rounded-full transition ${menuMuted ? 'bg-zinc-700' : 'bg-[#d4af37]'}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ${
                menuMuted ? 'left-0.5' : 'left-[18px]'
              }`}
            />
          </span>
        </button>
        <div className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm">
          <span className="flex items-center gap-2.5 font-semibold text-[#e6d5bc]">
            <FontAwesomeIcon icon={faLanguage} className="w-4 text-[#d4af37]" />
            Язык
          </span>
          <LanguageSwitcher />
        </div>
      </div>
    </>
  );

  const isGame = location.pathname.startsWith('/online');
  const bottomTabs = [
    { to: '/', icon: faHouse, label: 'Главная' },
    { to: '/top', icon: faRankingStar, label: 'Топ' },
    { action: goPlay, icon: faPlay, label: 'Играть', main: true },
    { to: '/friends', icon: faUserGroup, label: 'Друзья', badge: requests + dmUnread },
    { action: () => setIsDrawerOpen(true), icon: faBars, label: 'Меню' }
  ];

  return (
    <>
      {/* Десктоп: постоянный сайдбар */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[17rem] flex-col overflow-y-auto border-r border-[#d4af37]/15 bg-gradient-to-b from-[#170d08]/95 via-[#0e0806]/95 to-[#070403]/95 p-5 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      {/* Мобайл: верхняя панель */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-[#d4af37]/15 bg-[#0a0605]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={40} />
            <span className="font-display text-lg font-black gold-text">Mafia Play</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTopUp(true)}
              className="flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-black/40 px-2 py-1"
            >
              <img src="/tokens.png" alt="" className="h-4 w-4" />
              <span className="text-xs font-bold text-[#f3e5ab]">{compact(mafioBalance)}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTeniExchange(true)}
              className="flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-black/40 px-2 py-1"
            >
              <img src="/krital.svg" alt="" className="h-4 w-4 rounded-full" />
              <span className="text-xs font-bold text-[#d4af37]">{teniBalance}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Мобайл: нижний таб-бар */}
      {!isGame && (
        <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#d4af37]/15 bg-[#0a0605]/90 backdrop-blur-xl safe-area-pb">
          <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
            {bottomTabs.map((tab) => {
              const active = tab.to && (tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to));
              const inner = (
                <>
                  {tab.main ? (
                    <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#c0151f] to-[#5c0000] text-lg text-[#fbe9c4] ring-4 ring-[#0a0605] shadow-[0_8px_25px_-5px_rgba(192,21,31,0.9)] btn-pulse">
                      <FontAwesomeIcon icon={tab.icon} />
                    </span>
                  ) : (
                    <span className="relative">
                      <FontAwesomeIcon icon={tab.icon} className={`text-lg transition ${active ? 'scale-110' : ''}`} />
                      {tab.badge > 0 && (
                        <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c0151f] px-1 text-[9px] font-black text-white">
                          {tab.badge}
                        </span>
                      )}
                    </span>
                  )}
                  <span className="text-[10px] font-bold">{tab.label}</span>
                </>
              );
              const cls = `flex w-16 flex-col items-center gap-1 py-1.5 transition ${
                active ? 'text-[#f3d27a]' : 'text-[#a8916c]'
              }`;
              return tab.to ? (
                <Link key={tab.label} to={tab.to} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button key={tab.label} type="button" onClick={tab.action} className={cls}>
                  {inner}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Мобайл: выдвижное меню */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm anim-fade-in" />
          <div className="relative z-10 flex h-full w-[290px] max-w-[85vw] flex-col overflow-y-auto border-r border-[#d4af37]/25 bg-gradient-to-b from-[#170d08] via-[#0e0806] to-[#070403] p-5 shadow-[0_0_60px_rgba(0,0,0,0.9)] anim-slide-left">
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-[#a8916c] hover:bg-white/5 hover:text-[#f3d27a]"
              aria-label="Закрыть меню"
            >
              <FontAwesomeIcon icon={faXmark} size="lg" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} playerName={account?.name} accountId={account?.id} />}
      {showTeniExchange && <TeniExchangeModal onClose={() => setShowTeniExchange(false)} />}
      <SupportReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
};

export default Navbar;
