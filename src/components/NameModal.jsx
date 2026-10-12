import React, { useState } from 'react';
import { registerOrLoginByName } from '../services/accounts';
import { checkNameAvailable } from '../services/presence';
import Logo from './ui/Logo';

const NameModal = ({ onAccountReady }) => {
  const [inputName, setInputName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const name = inputName.trim();
    if (!name) return;
    if (name.length < 2) return setError('Имя слишком короткое');

    setBusy(true);
    // Имя должно быть уникальным среди всех игроков, а не только на этом устройстве
    const { available, message } = await checkNameAvailable(name);
    setBusy(false);
    if (!available) return setError(message || 'Это имя уже занято другим игроком. Выберите другое.');

    const result = registerOrLoginByName(name);
    if (!result.success) return setError(result.message);
    onAccountReady(result.account);
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md anim-fade-in" />
      <div className="noir-card deco-corners relative w-full max-w-md p-7 sm:p-9 text-center anim-scale-in">
        <Logo size={110} intro className="mx-auto" />
        <p className="eyebrow mt-4">Добро пожаловать в семью</p>
        <h2 className="mt-2 font-display text-3xl font-black gold-text">Как вас зовут?</h2>
        <p className="mt-2 text-xs text-[#a8916c]">
          Имя закрепляется за вами навсегда. После входа вы получите личный ID — по нему вас найдут друзья.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="text"
            placeholder="Ваше имя…"
            value={inputName}
            onChange={(e) => {
              setInputName(e.target.value);
              if (error) setError('');
            }}
            className="input-noir text-center text-base"
            autoFocus
            maxLength={20}
          />
          {error && <p className="text-xs font-semibold text-red-400 anim-shake">{error}</p>}
          <button type="submit" disabled={busy || !inputName.trim()} className="btn btn-blood btn-lg w-full">
            {busy ? 'Проверяем…' : 'Войти в игру'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NameModal;
