import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faArrowRight, faRightLeft, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import TENI_EXCHANGE_RATES from '../../data/exchangeRates';
import { creditTeni, getTeniBalance } from '../../services/teniWallet';
import { getBalance, debit } from '../../services/wallet';
import { toast } from '../../services/toast';
import '../../wallet.css';

// Курс самого маленького пакета — от него считаем выгоду остальных
const BASE = TENI_EXCHANGE_RATES[0].teni / TENI_EXCHANGE_RATES[0].mafio;
const BEST = TENI_EXCHANGE_RATES.reduce((a, r) => (r.teni / r.mafio > a.teni / a.mafio ? r : a), TENI_EXCHANGE_RATES[0]);

const TeniExchangeModal = ({ onClose }) => {
  const [balance, setBalance] = useState(getBalance());
  const [teni, setTeni] = useState(getTeniBalance());
  const [done, setDone] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const exchange = (rate) => {
    const result = debit(rate.mafio);
    if (!result.success) {
      toast({ kind: 'error', text: 'Недостаточно Токенов' });
      return;
    }
    creditTeni(rate.teni);
    setBalance(getBalance());
    setTeni(getTeniBalance());
    setDone(rate);
  };

  return createPortal(
    <div className="fixed inset-0 z-[800] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md anim-fade-in" onClick={onClose} />
      <div className="exch anim-scale-in">
        <button onClick={onClose} className="topup__close" aria-label="Закрыть">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <header className="text-center">
          <div className="exch__crystal">
            <img src="/krital.svg" alt="" />
          </div>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#b9a3e0]">Тени тратятся на способности</p>
          <h2 className="exch-title font-display text-3xl font-black">Обмен на Тени</h2>
        </header>

        <div className="exch-balances mt-5">
          <div className="exch-bal">
            <img src="/tokens.png" alt="" />
            <b>{balance.toLocaleString('ru-RU')}</b>
            <span>Токены</span>
          </div>
          <FontAwesomeIcon icon={faRightLeft} className="text-[#b48cff]" />
          <div className="exch-bal">
            <img src="/krital.svg" alt="" />
            <b>{teni.toLocaleString('ru-RU')}</b>
            <span>Тени</span>
          </div>
        </div>

        {done ? (
          <div className="exch-done">
            <div className="exch-done__burst">
              <img src="/krital.svg" alt="" />
            </div>
            <p className="font-display text-3xl font-black text-[#efe4ff]">+{done.teni} теней</p>
            <p className="text-sm text-[#b9a3e0]">Обмен прошёл успешно</p>
            <div className="mt-3 flex w-full gap-2">
              <button type="button" onClick={() => setDone(null)} className="btn btn-ghost flex-1">
                Ещё обмен
              </button>
              <a href="/shop?tab=abilities" className="btn btn-gold flex-1">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> Способности
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            {TENI_EXCHANGE_RATES.map((rate, i) => {
              const bonus = Math.round(((rate.teni / rate.mafio) / BASE - 1) * 100);
              const lack = rate.mafio - balance;
              return (
                <button
                  key={rate.teni}
                  type="button"
                  disabled={lack > 0}
                  onClick={() => exchange(rate)}
                  className={`exch-rate anim-fade-up ${rate === BEST ? 'exch-rate--best' : ''}`}
                  style={{ '--i': i }}
                >
                  {bonus > 0 && <span className="exch-rate__tag">{rate === BEST ? `Лучший курс +${bonus}%` : `+${bonus}%`}</span>}
                  <span className="exch-rate__side text-[#fff1c4]">
                    <img src="/tokens.png" alt="" />
                    {rate.mafio.toLocaleString('ru-RU')}
                  </span>
                  <span className="exch-rate__arrow">
                    <FontAwesomeIcon icon={faArrowRight} />
                  </span>
                  <span className="exch-rate__side justify-end text-[#efe4ff]">
                    {rate.teni.toLocaleString('ru-RU')}
                    <img src="/krital.svg" alt="" />
                  </span>
                  {lack > 0 && <span className="exch-rate__need">Не хватает {lack.toLocaleString('ru-RU')}</span>}
                </button>
              );
            })}
            <p className="pt-2 text-center text-[11px] text-[#a8916c]">Обмен мгновенный. Тени нельзя обменять обратно на Токены.</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TeniExchangeModal;
