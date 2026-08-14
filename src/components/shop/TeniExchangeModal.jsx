import React from 'react';
import TENI_EXCHANGE_RATES from '../../data/exchangeRates';
import { creditTeni } from '../../services/teniWallet';
import { getBalance, debit } from '../../services/wallet';

const TeniExchangeModal = ({ onClose }) => {
  const balance = getBalance();

  const exchange = (rate) => {
    const result = debit(rate.mafio);
    if (!result.success) {
      alert('Недостаточно Мафио');
      return;
    }
    creditTeni(rate.teni);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-sm rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#080402] p-6 text-center shadow-[0_0_50px_rgba(212,175,55,0.3)]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[#c5a059] hover:text-[#d4af37]"
          aria-label="Закрыть"
        >
          ✕
        </button>

        <img src="/mafio.png" alt="" className="w-10 h-10 mx-auto" />
        <h2 className="mt-2 text-lg font-black uppercase tracking-widest text-[#d4af37]">
          Обмен Мафио на тени
        </h2>
        <p className="mt-1 text-xs text-[#c5a059]">
          Баланс: <strong className="text-[#f3e5ab]">{balance.toLocaleString('ru-RU')}</strong> Мафио
        </p>

        <div className="mt-5 space-y-2.5">
          {TENI_EXCHANGE_RATES.map((rate) => (
            <button
              key={rate.teni}
              type="button"
              disabled={balance < rate.mafio}
              onClick={() => exchange(rate)}
              className="w-full flex items-center justify-between rounded-xl border border-[#c5a059]/40 bg-[#120a07] px-4 py-3 text-left transition hover:border-[#d4af37] disabled:opacity-40"
            >
              <span className="flex items-center gap-1.5 text-sm font-bold text-[#f3e5ab]">
                {rate.mafio.toLocaleString('ru-RU')} <img src="/mafio.png" alt="" className="w-5 h-5" />
              </span>
              <span className="text-[#8b6b12]">→</span>
              <span className="flex items-center gap-2 text-sm font-bold text-[#d4af37]">
                {rate.teni} <img src="/teni.png" alt="" className="w-8 h-8 rounded-full" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeniExchangeModal;
