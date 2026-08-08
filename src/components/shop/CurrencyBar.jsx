import { useEffect, useState } from "react";
import { getBalance } from "../../services/wallet";

export default function CurrencyBar({ onOpenTopUp }) {
  const [balance, setBalance] = useState(getBalance());

  useEffect(() => {
    const refresh = () => setBalance(getBalance());
    window.addEventListener("mafia-wallet-changed", refresh);
    return () => window.removeEventListener("mafia-wallet-changed", refresh);
  }, []);

  return (
    <div className="flex items-center rounded-full border-2 border-[#d4af37] bg-gradient-to-b from-[#1c130a] to-[#0b0704] px-2 py-1 gap-2 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
      <img
        src="/mafio.png"
        alt="Мафио"
        className="h-8 w-8 rounded-full object-cover border border-[#8b6b12] shadow-inner"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling?.classList.remove("hidden");
        }}
      />
      <div className="hidden h-8 w-8 rounded-full bg-gradient-to-b from-[#f3e5ab] via-[#d4af37] to-[#8b6b12] border border-[#8b6b12] flex items-center justify-center text-black font-black text-sm shadow-inner">
        M
      </div>
      <span className="text-[#f3e5ab] font-bold tabular-nums text-sm sm:text-base min-w-[3ch] text-center">
        {balance.toLocaleString("ru-RU")}
      </span>
      <button
        type="button"
        onClick={onOpenTopUp}
        aria-label="Пополнить Мафио"
        className="h-7 w-7 rounded-lg bg-gradient-to-b from-[#3a2c14] to-[#1a1206] border border-[#d4af37]/60 text-[#d4af37] font-black flex items-center justify-center hover:brightness-125 active:scale-95 transition"
      >
        +
      </button>
    </div>
  );
}
