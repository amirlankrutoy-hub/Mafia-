import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCheck } from '@fortawesome/free-solid-svg-icons';
import roles from '../data/roles';
import {
  getAvailableAvatars,
  getSelectedAvatar,
  setSelectedAvatar,
  getFavoriteRole,
  setFavoriteRole
} from '../services/profile';
import { updateProfile, renameAccount, announcePresence } from '../services/presence';
import { renameMyAccount } from '../services/accounts';
import { toast } from '../services/toast';
import { getStats } from '../services/achievementsService';
import useSeo from '../hooks/useSeo';

export default function ProfilePage({ account }) {
  useSeo({ title: 'Мой профиль', description: 'Профиль игрока Mafia Play.', path: '/profile' });
  const [avatar, setAvatar] = useState(getSelectedAvatar());
  const [favRole, setFavRole] = useState(getFavoriteRole());
  const [saved, setSaved] = useState(false);

  const wins = getStats()?.wins || 0;
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [renaming, setRenaming] = useState(false);

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
    toast({ kind: 'success', title: 'Ник изменён', text: `Теперь вы — ${res.name}` });
  };

  useEffect(() => {
    setAvatar(getSelectedAvatar());
    setFavRole(getFavoriteRole());
  }, []);

  const persist = (nextAvatar, nextRole) => {
    setSelectedAvatar(nextAvatar);
    setFavoriteRole(nextRole);
    if (account) {
      updateProfile({
        accountId: account.id,
        name: account.name,
        icon: nextAvatar,
        favoriteRole: nextRole,
        wins
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handlePickAvatar = (path) => {
    setAvatar(path);
    persist(path, favRole);
  };

  const handlePickRole = (roleId) => {
    const next = favRole === roleId ? null : roleId;
    setFavRole(next);
    persist(avatar, next);
  };

  if (!account) {
    return (
      <div className="max-w-lg mx-auto py-10 text-center text-sm text-[#8b6b12]">
        Сначала войдите в аккаунт.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-[#d4af37] text-center">
        Мой профиль
      </h1>

      {/* Текущая карточка */}
      <div className="flex flex-col items-center gap-2">
        <img
          src={avatar}
          alt=""
          className="h-24 w-24 rounded-full border-2 border-[#d4af37] object-cover"
        />
        <p className="text-lg font-black text-[#f3e5ab]">{account.name}</p>
        <p className="font-mono text-xs text-[#8b6b12]">ID: {account.id}</p>

        <form onSubmit={submitRename} className="mt-3 w-full max-w-sm">
          <div className="flex gap-2">
            <input
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
              {renaming ? '…' : 'Сменить ник'}
            </button>
          </div>
          {nameError && <p className="mt-1.5 text-xs text-red-400 anim-shake">{nameError}</p>}
          <p className="mt-1 text-[10px] text-[#8b6b12]">Ник должен быть уникальным. Слово admin в нике использовать нельзя.</p>
        </form>

        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#d4af37]/25 bg-[#0d0705]/70 px-4 py-2">
          <FontAwesomeIcon icon={faTrophy} className="text-[#d4af37]" />
          <span className="text-sm font-bold text-[#f3e5ab]">{wins} побед</span>
        </div>

        {saved && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <FontAwesomeIcon icon={faCheck} />
            Сохранено — другие игроки видят это сразу
          </p>
        )}
      </div>

      {/* Выбор иконки */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#c5a059]">
          Иконка (видна другим игрокам)
        </h2>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {getAvailableAvatars().map((path) => (
            <button
              key={path}
              type="button"
              onClick={() => handlePickAvatar(path)}
              className={`overflow-hidden rounded-full border-2 transition ${
                avatar === path
                  ? 'border-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.6)]'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={path} alt="" className="h-12 w-12 object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Выбор любимой роли */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#c5a059]">
          Любимая роль (видна другим игрокам)
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => handlePickRole(role.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                favRole === role.id
                  ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#f3e5ab]'
                  : 'border-[#d4af37]/20 text-[#c5a059] hover:border-[#d4af37]/50'
              }`}
            >
              <img
                src={role.image}
                alt=""
                className="h-8 w-8 rounded-full object-cover border border-[#d4af37]/40"
              />
              <span className="text-xs font-bold truncate">{role.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
