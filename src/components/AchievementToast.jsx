import React, { useEffect, useState } from "react";

const AchievementToast = () => {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const onUnlocked = (e) => {
      setCurrent(e.detail);
      setTimeout(() => setCurrent(null), 2000);
    };
    window.addEventListener("mafia-achievement-unlocked", onUnlocked);
    return () => window.removeEventListener("mafia-achievement-unlocked", onUnlocked);
  }, []);

  if (!current) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] animate-fadeIn">
      <div
        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 shadow-[0_0_25px_rgba(212,175,55,0.4)] backdrop-blur-md ${
          current.gold
            ? "border-[#ffd76a] bg-gradient-to-r from-[#4a3a05] via-[#2a1f04] to-[#4a3a05]"
            : "border-[#d4af37] bg-[#140b07]/95"
        }`}
      >
        <img src="/teni.png" alt="" className="w-7 h-7 rounded-full" />
        <div className="text-left">
          <div
            className={`text-[10px] font-bold uppercase tracking-widest ${
              current.gold ? "text-[#ffe9a8]" : "text-[#d4af37]"
            }`}
          >
            Достижение выполнено
          </div>
          <div className="text-sm font-black text-[#f3e5ab]">{current.title}</div>
        </div>
        <span className="ml-2 text-xs font-bold text-[#d4af37]">+{current.reward}</span>
      </div>
    </div>
  );
};

export default AchievementToast;
