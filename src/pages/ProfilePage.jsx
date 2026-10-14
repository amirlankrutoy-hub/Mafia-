import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faCheck,
  faPen,
  faCopy,
  faGamepad,
  faPercent,
  faCrown,
  faMedal,
  faMasksTheater,
  faHeartPulse,
  faStore,
  faGear,
  faCircleCheck,
  faTriangleExclamation,
  faXmark,
  faStar,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import roles from '../data/roles';
import { DECORATIONS, ADMIN_DECORATION, migrateDecorationId } from '../data/shopData';
import { TEAMS } from '../data/teams';
import { ACHIEVEMENTS } from '../data/achievements_data';
import {
  getAvailableAvatars,
  getSelectedAvatar,
  setSelectedAvatar,
  getFavoriteRole,
  setFavoriteRole
} from '../services/profile';
import { updateProfile, renameAccount, announcePresence, getProfile } from '../services/presence';
import { renameMyAccount } from '../services/accounts';
import { getWallet, ownsRole } from '../services/wallet';
import { getTeniBalance } from '../services/teniWallet';
import { getAuth } from '../services/auth';
import { isAdmin } from '../services/admin';
import { isSupport } from '../services/status';
import { toast } from '../services/toast';
import { getStats, getUnlockedIds } from '../services/achievementsService';
import DecorationSVG from '../components/shop/DecorationSVG';
import Avatar from '../components/ui/Avatar';
import useSeo from '../hooks/useSeo';
import '../roles.css';
import '../profile.css';

function StatTile({ icon, value, label, i, accent }) {
  return (
    <div className="profile-stat anim-scale-in" style={{ '--i': i, '--accent': accent || '#f3d27a' }}>
      <span className="profile-stat__icon">
        <FontAwesomeIcon icon={icon} />
      </span>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export default function ProfilePage({ account }) {
  useSeo({ title: 'Мой профиль', description: 'Профиль игрока Mafia Play.', path: '/profile' });
  const [avatar, setAvatar] = useState(getSelectedAvatar());
  const [favRole, setFavRole] = useState(getFavoriteRole());
  const [server, setServer] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [rolePicker, setRolePicker] = useState(false);

  const local = getStats() || {};
  const wallet = getWallet();
  const auth = getAuth();
  const linked = !!(auth?.links?.email || auth?.links?.google);
  const decoId = migrateDecorationId(wallet.equippedDecoration);
  const decoration = [...DECORATIONS, ADMIN_DECORATION].find((d) => d.id === decoId);

  useEffect(() => {
    if (account?.id) getProfile(account.id).then((p) => p && setServer(p));
  }, [account?.id]);

  const games = Math.max(server?.games || 0, local.gamesPlayed || 0);
  const wins = Math.max(server?.wins || 0, local.wins || 0);
  const winrate = games ? Math.round((wins / games) * 100) : 0;
  const unlocked = getUnlockedIds().length;
  const ownedRoles = roles.filter((r) => ownsRole(r.id)).length;
  const fav = roles.find((r) => r.id === favRole);
  const favTeam = fav ? TEAMS[fav.category] : null;

  const persist = (nextAvatar, nextRole) => {
    setSelectedAvatar(nextAvatar);
    setFavoriteRole(nextRole);
    if (account) {
      updateProfile({ accountId: account.id, name: account.name, icon: nextAvatar, favoriteRole: nextRole, wins });
    }
    toast({ kind: 'success', text: 'Сохранено — другие игроки видят это сразу', duration: 2500 });
  };

  const pickAvatar = (path) => {
    setAvatar(path);
    persist(path, favRole);
  };

  const pickRole = (roleId) => {
    const next = favRole === roleId ? null : roleId;
    setFavRole(next);
    setRolePicker(false);
    persist(avatar, next);
  };

  const submitRename = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || name === account?.name) return;
    setRenaming(true);
    const res = await renameAccount(name);
    setRenaming(false);
    if (!res?.success) return setNameError(res?.message || 'Не удалось сменить ник');
    renameMyAccount(res.name);
    announcePresence(account.id, res.name);
    setNewName('');
    setNameError('');
    setEditing(false);
    toast({ kind: 'success', title: 'Ник изменён', text: `Теперь вы — ${res.name}` });
  };

  const copyId = () => {
    navigator.clipboard?.writeText(String(account.id)).then(
      () => toast({ kind: 'success', text: 'ID скопирован — отправьте его другу' }),
      () => {}
    );
  };

  if (!account) {
    return <div className="mx-auto max-w-lg py-10 text-center text-sm text-[#a8916c]">Сначала войдите в аккаунт.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      {/* Обложка профиля */}
      <section className="profile-hero anim-fade-up" style={{ '--team': favTeam?.color || '#d4af37', '--team-glow': favTeam?.glow || 'rgba(212,175,55,0.5)' }}>
        {fav && <div className="profile-hero__bg" style={{ backgroundImage: `url(${fav.image})` }} />}
        <div className="profile-hero__shade" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="profile-avatar">
            {decoration && (
              <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                <DecorationSVG kind={decoration.kind} colors={decoration.colors} className="h-16 w-24" />
              </div>
            )}
            <div className="profile-avatar__ring">
              <Avatar src={avatar} size={128} ring={false} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              {linked ? (
                <span className="role-chip" style={{ '--c': '#34d399' }}>
                  <FontAwesomeIcon icon={faCircleCheck} /> Защищён
                </span>
              ) : (
                <Link to="/settings" className="role-chip" style={{ '--c': '#f87171' }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} /> Гость — привязать Google или почту
                </Link>
              )}
              {isAdmin() && (
                <span className="role-chip" style={{ '--c': '#f3d27a' }}>
                  <FontAwesomeIcon icon={faCrown} /> Админ
                </span>
              )}
              {isSupport() && (
                <span className="role-chip" style={{ '--c': '#34d399' }}>
                  Саппорт
                </span>
              )}
            </div>

            {editing ? (
              <form onSubmit={submitRename} className="mt-3 max-w-sm">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setNameError('');
                    }}
                    maxLength={20}
                    placeholder="Новый ник"
                    className="input-noir !py-2 text-sm"
                  />
                  <button type="submit" disabled={renaming || !newName.trim()} className="btn btn-gold btn-sm shrink-0">
                    {renaming ? '…' : <FontAwesomeIcon icon={faCheck} />}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-sm shrink-0" aria-label="Отмена">
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
                {nameError && <p className="mt-1.5 text-xs text-red-400 anim-shake">{nameError}</p>}
                <p className="mt-1 text-[10px] text-[#a8916c]">Ник должен быть уникальным. Слово admin в нике использовать нельзя.</p>
              </form>
            ) : (
              <h1 className="mt-2 flex items-center justify-center gap-3 sm:justify-start">
                <span className="ach-title truncate font-display text-4xl font-black sm:text-5xl" translate="no">
                  {account.name}
                </span>
                <button type="button" onClick={() => setEditing(true)} className="profile-icon-btn" title="Сменить ник">
                  <FontAwesomeIcon icon={faPen} />
                </button>
              </h1>
            )}

            <button type="button" onClick={copyId} className="mt-2 inline-flex items-center gap-2 font-mono text-sm text-[#c9b48f] hover:text-[#f3e5ab]">
              ID {account.id} <FontAwesomeIcon icon={faCopy} className="text-xs" />
            </button>

            {fav && (
              <p className="mt-2 text-sm text-[#c9b48f]">
                Любимая роль: <b style={{ color: favTeam?.color }}>{fav.name}</b>
              </p>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <div className="profile-balance">
              <img src="/tokens.png" alt="" />
              <b>{wallet.balance.toLocaleString('ru-RU')}</b>
            </div>
            <div className="profile-balance profile-balance--teni">
              <img src="/krital.svg" alt="" />
              <b>{getTeniBalance().toLocaleString('ru-RU')}</b>
            </div>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={faGamepad} value={games} label="Игр" i={0} />
        <StatTile icon={faTrophy} value={wins} label="Побед" i={1} accent="#ffc83d" />
        <StatTile icon={faPercent} value={`${winrate}%`} label="Винрейт" i={2} accent="#34d399" />
        <StatTile icon={faStar} value={server?.mvp || 0} label="Игрок матча" i={3} accent="#c084fc" />
        <StatTile icon={faHeartPulse} value={local.survivedGames || 0} label="Выжил" i={4} accent="#f87171" />
        <StatTile icon={faMedal} value={`${unlocked}/${ACHIEVEMENTS.length}`} label="Достижения" i={5} accent="#38bdf8" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Любимая роль */}
        <section className="settings-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl font-black text-[#f3e5ab]">
              <FontAwesomeIcon icon={faMasksTheater} className="text-[#d4af37]" /> Любимая роль
            </h2>
            <button type="button" onClick={() => setRolePicker((v) => !v)} className="btn btn-ghost btn-sm">
              {rolePicker ? 'Скрыть' : 'Выбрать'}
            </button>
          </div>
          <p className="mt-1 text-xs text-[#a8916c]">Видна другим игрокам в вашем профиле.</p>

          {!rolePicker ? (
            fav ? (
              <div className="mt-4 flex items-center gap-4" style={{ '--team': favTeam.color, '--team-glow': favTeam.glow }}>
                <div className="role-card w-28 shrink-0">
                  <div className="role-card__frame">
                    <img src={fav.image} alt={fav.name} className="role-card__img" />
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="role-chip" style={{ '--c': favTeam.color }}>
                    <FontAwesomeIcon icon={favTeam.icon} /> {fav.team}
                  </span>
                  <p className="mt-2 font-display text-2xl font-black text-[#f3e5ab]">{fav.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#c9b48f]">{fav.ability}</p>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setRolePicker(true)} className="profile-empty mt-4">
                <FontAwesomeIcon icon={faMasksTheater} className="text-2xl" />
                Выберите роль, которую любите больше всего
              </button>
            )
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {roles.map((role) => {
                const team = TEAMS[role.category];
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => pickRole(role.id)}
                    className={`profile-role ${favRole === role.id ? 'profile-role--active' : ''}`}
                    style={{ '--team': team.color }}
                  >
                    <img src={role.image} alt="" />
                    <span>{role.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Аватарка */}
        <section className="settings-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl font-black text-[#f3e5ab]">
              <FontAwesomeIcon icon={faCircleCheck} className="text-[#d4af37]" /> Аватарка
            </h2>
            <Link to="/shop?tab=avatars" className="btn btn-ghost btn-sm">
              Ещё в магазине
            </Link>
          </div>
          <div className="mt-4 grid max-h-[320px] grid-cols-5 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-6">
            {getAvailableAvatars().map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => pickAvatar(path)}
                className={`profile-ava ${avatar === path ? 'profile-ava--active' : ''}`}
              >
                <img src={path} alt="" />
                {avatar === path && (
                  <span className="profile-ava__check">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Быстрые ссылки */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { to: '/achievements', icon: faMedal, title: 'Достижения', text: `${unlocked} из ${ACHIEVEMENTS.length} открыто` },
          { to: '/shop?tab=chests', icon: faStore, title: 'Коллекция ролей', text: `${ownedRoles} из ${roles.length} собрано` },
          { to: '/settings', icon: faGear, title: 'Настройки', text: 'Аккаунт, звук и язык' }
        ].map((l) => (
          <Link key={l.to} to={l.to} className="profile-link">
            <span className="settings-card__icon">
              <FontAwesomeIcon icon={l.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-[#f3e5ab]">{l.title}</span>
              <span className="block text-xs text-[#a8916c]">{l.text}</span>
            </span>
            <FontAwesomeIcon icon={faArrowRight} className="text-[#d4af37]" />
          </Link>
        ))}
      </section>
    </div>
  );
}
