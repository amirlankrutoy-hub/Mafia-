import React, { useState } from 'react';
import { registerOrLoginByName } from '../services/accounts';

const NameModal = ({ onAccountReady }) => {
  const [inputName, setInputName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!inputName.trim()) return;

    const result = registerOrLoginByName(inputName.trim());
    if (!result.success) {
      setError(result.message);
      return;
    }

    onAccountReady(result.account);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#080402] p-5 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.3)] text-center">
        {/* Декоративные уголки */}
        <div className="absolute top-2 left-2 h-3.5 w-3.5 sm:h-4 sm:w-4 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute top-2 right-2 h-3.5 w-3.5 sm:h-4 sm:w-4 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute bottom-2 left-2 h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute bottom-2 right-2 h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-r-2 border-[#d4af37]" />

        <img className="w-[50px] h-[50px] mx-auto" src="/favicon.svg" alt="" />
        <br />

        <div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-[#d4af37]">
            ВЫБЕРИТЕ СВОЁ ИМЯ
          </h2>
          <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs italic text-[#c5a059]">
            Имя закрепляется за вами навсегда — изменить его будет нельзя. После входа вам
            выдадут личный ID.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            <input
              type="text"
              placeholder="Ваше имя..."
              value={inputName}
              onChange={(e) => {
                setInputName(e.target.value);
                if (error) setError('');
              }}
              className="w-full rounded-lg border border-[#c5a059]/40 bg-[#0d0907] px-3 py-2.5 sm:px-4 sm:py-3 text-center text-sm text-[#e6d5bc] placeholder-[#c5a059]/40 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              autoFocus
              maxLength={20}
            />

            {error && (
              <p className="text-xs font-semibold text-red-400">{error}</p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#f3e5ab] border border-[#d4af37] transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            >
              ВОЙТИ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NameModal;
