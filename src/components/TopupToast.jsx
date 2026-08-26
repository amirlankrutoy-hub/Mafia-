import React, { useEffect, useState } from "react";

// Тот же паттерн, что и AchievementToast.jsx — отдельное событие,
// чтобы не путать пополнение через бота с достижениями.
const TopupToast = () => {
  const [amount, setAmount] = useState(null);

  useEffect(() => {
    const onTopup = (e) => {
      setAmount(e.detail?.amount ?? null);
      setTimeout(() => setAmount(null), 3000);
    };
    window.addEventListener("mafia-topup-received", onTopup);
    return () => window.removeEventListener("mafia-topup-received", onTopup);
  }, []);

  if (amount === null) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] animate-fadeIn">
      <div className="flex items-center gap-3 rounded-xl border-2 border-[#ffd76a] bg-gradient-to-r from-[#4a3a05] via-[#2a1f04] to-[#4a3a05] px-4 py-2.5 shadow-[0_0_25px_rgba(212,175,55,0.4)] backdrop-blur-md">
        <span className="text-2xl">🎉</span>
        <div className="text-left">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#ffe9a8]">
            Поздравляем с успешной покупкой
          </div>
          <div className="text-sm font-black text-[#f3e5ab]">
            Вы получили +{amount.toLocaleString("ru-RU")} 🪙 Мафио
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopupToast;
