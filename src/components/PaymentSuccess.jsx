import { useEffect, useState } from "react";

const SPARKS = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 41) % 100}%`,
  d: `${2.4 + ((i * 7) % 18) / 10}s`,
  delay: `${((i * 11) % 20) / 10}s`,
  color: ["#f3d27a", "#d4af37", "#fff3c4", "#c0151f"][i % 4]
}));

// Большой праздничный экран "Оплата прошла успешно!"
export default function PaymentSuccess() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const onSuccess = (e) => setInfo(e.detail);
    window.addEventListener("mafia-topup-success", onSuccess);
    return () => window.removeEventListener("mafia-topup-success", onSuccess);
  }, []);

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(null), 7000);
    return () => clearTimeout(t);
  }, [info]);

  if (!info) return null;
  return (
    <div className="fixed inset-0 z-[2600] flex items-center justify-center p-5" onClick={() => setInfo(null)}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md anim-fade-in" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {SPARKS.map((s, i) => (
          <span key={i} className="spark" style={{ left: s.left, background: s.color, "--d": s.d, "--delay": s.delay }} />
        ))}
      </div>
      <div className="noir-card deco-corners relative w-full max-w-sm p-8 text-center anim-scale-in">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-emerald-700 text-4xl text-black shadow-[0_0_50px_rgba(52,211,153,0.6)] anim-pop">
          ✓
        </div>
        <h2 className="mt-5 font-display text-3xl font-black gold-text">Оплата прошла успешно!</h2>
        <div className="mt-4 flex items-center justify-center gap-2 font-display text-4xl font-black text-[#f3e5ab] anim-fade-up" style={{ "--i": 3 }}>
          +{Number(info.amount).toLocaleString("ru-RU")}
          <img src="/tokens.png" alt="" className="h-9 w-9" />
        </div>
        <p className="mt-2 text-sm text-[#c9b48f]">Токены уже на вашем балансе. Спасибо за поддержку!</p>
        <button className="btn btn-gold mt-6 w-full" onClick={() => setInfo(null)}>
          Отлично
        </button>
      </div>
    </div>
  );
}
