import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { DECORATIONS, ADMIN_DECORATION } from '../data/shopData';
import {
  ownsDecoration,
  getEquippedDecoration,
  setEquippedDecoration,
  getWallet
} from '../services/wallet';
import { tryUnlockAdmin, getAdminRoleInfo, logoutAdmin } from '../services/admin';
import { AVATAR_LIST, getSelectedAvatar, setSelectedAvatar } from '../services/profile';
import DecorationSVG from '../components/shop/DecorationSVG';

const ALL_DECORATIONS = [...DECORATIONS, ADMIN_DECORATION];

function Home({ userName }) {
  const navigate = useNavigate();
  const goPlay = () => {
    sessionStorage.removeItem('mafia_story_seen');
    navigate('/online');
  };

  const [avatarIndex, setAvatarIndex] = useState(() => {
    const idx = AVATAR_LIST.indexOf(getSelectedAvatar());
    return idx >= 0 ? idx : 0;
  });
  const [decorId, setDecorId] = useState(getEquippedDecoration());
  const [wallet, setWallet] = useState(getWallet());

  useEffect(() => {
    const refresh = () => setWallet(getWallet());
    window.addEventListener('mafia-wallet-changed', refresh);
    return () => window.removeEventListener('mafia-wallet-changed', refresh);
  }, []);

  const currentAvatar = AVATAR_LIST[avatarIndex];
  const equippedDecoration = ALL_DECORATIONS.find((d) => d.id === decorId);

  const ownedDecorations = ALL_DECORATIONS.filter(
    (d) => ownsDecoration(d.id) || (d.id === ADMIN_DECORATION.id && wallet.isAdmin)
  );

  // Первый пункт — "без украшения" (id: null)
  const decorationOptions = [{ id: null, name: 'Без украшения' }, ...ownedDecorations];
  const decorationIndex = Math.max(
    0,
    decorationOptions.findIndex((d) => d.id === decorId)
  );

  const changeAvatar = (dir) => {
    const next = (avatarIndex + dir + AVATAR_LIST.length) % AVATAR_LIST.length;
    setAvatarIndex(next);
    setSelectedAvatar(AVATAR_LIST[next]);
  };

  const changeDecoration = (dir) => {
    const next =
      (decorationIndex + dir + decorationOptions.length) % decorationOptions.length;
    const nextId = decorationOptions[next].id;
    setDecorId(nextId);
    setEquippedDecoration(nextId);
  };

  return (
    <div className="space-y-10 py-6">
      {/* Приветственный баннер */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#080402] p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(212,175,55,0.25)]">
        <h1 className="text-2xl sm:text-5xl font-black uppercase tracking-widest text-[#d4af37] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          Добро пожаловать в Mafia Play
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#c5a059] max-w-2xl mx-auto italic">
          Город засыпает... Пролетают тени, а судьба жителей теперь в ваших руках.
        </p>

        {userName && (
          <p className="mt-4 text-xs sm:text-sm text-[#f3e5ab]">
            Вы вошли как: <strong className="text-[#d4af37] font-bold">{userName}</strong>
          </p>
        )}
      </div>

      {/* Выбор аватара и украшения */}
      <div className="mx-auto max-w-md rounded-2xl border-2 border-[#d4af37]/60 bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#080402] p-6 text-center shadow-[0_0_40px_rgba(212,175,55,0.2)]">
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-[#c5a059]">
          Ваш образ
        </h2>

        <div className="mt-5 flex items-center justify-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => changeAvatar(-1)}
            className="h-11 w-11 shrink-0 rounded-full border border-[#d4af37]/50 text-[#d4af37] flex items-center justify-center hover:bg-[#d4af37]/10 active:scale-95"
            aria-label="Предыдущий аватар"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          <div className="relative h-36 w-36 sm:h-40 sm:w-40 rounded-full border-4 border-[#d4af37] bg-[#0a0503] shadow-[0_0_30px_rgba(212,175,55,0.35)] overflow-hidden">
            <img src={currentAvatar} alt="Аватар" className="h-full w-full object-cover" />
            {equippedDecoration && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                <DecorationSVG
                  kind={equippedDecoration.kind}
                  colors={equippedDecoration.colors}
                  className="w-20 h-16"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => changeAvatar(1)}
            className="h-11 w-11 shrink-0 rounded-full border border-[#d4af37]/50 text-[#d4af37] flex items-center justify-center hover:bg-[#d4af37]/10 active:scale-95"
            aria-label="Следующий аватар"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>

        <p className="mt-3 text-[11px] text-[#8b6b12]">
          Аватар {avatarIndex + 1} / {AVATAR_LIST.length}
        </p>

        {ownedDecorations.length > 0 && (
          <div className="mt-6 border-t border-[#c5a059]/20 pt-5">
            <p className="text-[10px] uppercase tracking-widest text-[#c5a059] mb-3">
              Украшение
            </p>
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={() => changeDecoration(-1)}
                className="h-9 w-9 shrink-0 rounded-full border border-[#d4af37]/50 text-[#d4af37] flex items-center justify-center hover:bg-[#d4af37]/10 active:scale-95"
                aria-label="Предыдущее украшение"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>

              <span className="min-w-[9rem] text-sm font-bold uppercase tracking-wider text-[#f3e5ab]">
                {decorationOptions[decorationIndex]?.name || 'Без украшения'}
              </span>

              <button
                type="button"
                onClick={() => changeDecoration(1)}
                className="h-9 w-9 shrink-0 rounded-full border border-[#d4af37]/50 text-[#d4af37] flex items-center justify-center hover:bg-[#d4af37]/10 active:scale-95"
                aria-label="Следующее украшение"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={goPlay}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#8b0000] to-[#5c0000] px-8 py-3 text-sm font-bold uppercase tracking-widest text-[#f3e5ab] border border-[#d4af37] shadow-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
        >
          🎮 Начать игру
        </button>

        <Link
          to="/roles"
          className="mt-3 inline-block text-xs text-[#c5a059] underline underline-offset-4 hover:text-[#d4af37]"
        >
          Смотреть все роли →
        </Link>
      </div>

      <AdminFooter />
    </div>
  );
}

function AdminFooter() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [roleInfo, setRoleInfo] = useState(getAdminRoleInfo());

  function submit(e) {
    e.preventDefault();
    const res = tryUnlockAdmin(password);
    setMsg(res);
    setPassword('');
    if (res.success) setRoleInfo(res.role || getAdminRoleInfo());
  }

  function handleLogout() {
    logoutAdmin();
    setRoleInfo(null);
    setMsg(null);
  }

  return (
    <footer className="mt-16 border-t border-[#c5a059]/10 pt-6 pb-10 text-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059]/30 hover:text-[#c5a059]/60"
      >
        Mafia Play · панель администратора
      </button>

      {open && (
        <div className="fixed inset-0 z-[500] bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#d4af37] bg-[#120a07] p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#d4af37]">
                {roleInfo ? 'Панель администратора' : 'Вход для администратора'}
              </h3>
              <button onClick={() => setOpen(false)} className="text-[#c5a059]">✕</button>
            </div>

            {roleInfo ? (
              <div className="space-y-3">
                <p className="text-sm">
                  Вы вошли как{" "}
                  <strong style={{ color: roleInfo.color }}>{roleInfo.label}</strong>
                </p>
                {roleInfo.id === "admin_support" && (
                  <p className="text-green-300 text-sm">
                    +3000 Мафио · Telegram:{" "}
                    <a href="https://t.me/Amir4k_Nurmatov" target="_blank" rel="noreferrer" className="underline">
                      @Amir4k_Nurmatov
                    </a>
                  </p>
                )}
                <p className="text-[#c5a059] text-xs">
                  Бан игроков — только в лобби комнаты. Выдача Мафио — там же.
                </p>
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center rounded-lg bg-[#d4af37] text-black font-bold py-2"
                >
                  Открыть панель
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg border border-red-500/40 text-red-400 py-2 text-sm"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль администратора"
                  className="w-full rounded-lg border border-[#c5a059]/40 bg-black/40 px-3 py-2 text-[#f3e5ab] outline-none focus:border-[#d4af37]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#d4af37] text-black font-bold py-2"
                >
                  Войти
                </button>
                {msg && !msg.success && (
                  <p className="text-red-400 text-sm">{msg.message}</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}

export default Home;
