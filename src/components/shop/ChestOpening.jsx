import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ChestSVG from "./ChestSVG";
import { RARITIES } from "../../data/chests";

const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);
const SPARKS = Array.from({ length: 26 }, (_, i) => ({
  x: Math.cos((i / 26) * Math.PI * 2) * (120 + (i % 3) * 40),
  y: Math.sin((i / 26) * Math.PI * 2) * (120 + (i % 3) * 40),
  d: 0.6 + (i % 5) * 0.12
}));

function RewardCard({ reward }) {
  const r = RARITIES[reward.rarity] || RARITIES.common;
  let icon;
  let title;
  let sub;
  if (reward.type === "role" && reward.allOwned) {
    icon = <img src="/tokens.png" alt="" className="h-28 w-28" />;
    title = `+${reward.amount} Токенов`;
    sub = `Все роли редкости «${r.label}» у вас уже есть — вместо роли Токены`;
  } else if (reward.type === "role") {
    icon = (
      <img src={reward.role.image} alt="" className="aspect-[2/3] w-44 rounded-2xl object-cover" style={{ boxShadow: `0 0 50px ${r.glow}`, outline: `2px solid ${r.color}` }} />
    );
    title = reward.role.name;
    sub = "Новая роль открыта!";
  } else if (reward.type === "emoji") {
    icon = <span className="text-8xl">{reward.emoji.symbol}</span>;
    title = "Новый эмодзи";
    sub = "Отправляйте его в лобби";
  } else if (reward.type === "teni") {
    icon = <img src="/krital.svg" alt="" className="h-28 w-28 rounded-full" />;
    title = `+${reward.amount} Теней`;
    sub = "Тени тратятся на способности";
  } else {
    icon = <img src="/tokens.png" alt="" className="h-28 w-28" />;
    title = `+${reward.amount.toLocaleString("ru-RU")} Токенов`;
    sub = "Зачислено на баланс";
  }
  return (
    <div className="relative flex flex-col items-center text-center anim-pop">
      <span className="chip mb-4" style={{ color: r.color, borderColor: r.color, background: "rgba(0,0,0,.45)" }}>
        {reward.type === "role" ? `${r.label} роль` : r.label}
      </span>
      {icon}
      <h3 className="mt-5 font-display text-3xl font-black" style={{ color: r.color, textShadow: `0 0 24px ${r.glow}` }}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-[#c9b48f]">{sub}</p>
    </div>
  );
}

// Экран открытия: сундук трясётся -> вспышка, крышка открывается -> награда
export default function ChestOpening({ chest, reward, onClose, onAgain, canAgain }) {
  const [stage, setStage] = useState("shake"); // shake | burst | reveal

  useEffect(() => {
    setStage("shake");
    const t1 = setTimeout(() => setStage("burst"), 1700);
    const t2 = setTimeout(() => setStage("reveal"), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reward]);

  const rarity = RARITIES[reward.rarity] || RARITIES.common;
  const glow = stage === "shake" ? chest.colors.glow : rarity.glow;

  return createPortal(
    <div className="fixed inset-0 z-[900] flex items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md anim-fade-in">
      <style>{`
        @keyframes chestShake { 0%,100%{transform:translate(0,0) rotate(0)} 20%{transform:translate(-5px,1px) rotate(-3deg)} 40%{transform:translate(5px,-1px) rotate(3deg)} 60%{transform:translate(-4px,0) rotate(-2deg)} 80%{transform:translate(4px,1px) rotate(2deg)} }
        @keyframes raysSpin { to { transform: rotate(360deg) } }
        @keyframes chestFlash { 0%{opacity:0} 25%{opacity:.9} 100%{opacity:0} }
        @keyframes sparkOut { from { transform: translate(0,0) scale(1); opacity: 1 } to { transform: translate(var(--x), var(--y)) scale(.2); opacity: 0 } }
      `}</style>

      {/* Вращающиеся лучи цвета редкости */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700"
        style={{ opacity: stage === "shake" ? 0.3 : 0.95 }}
      >
        <div className="relative h-full w-full" style={{ animation: "raysSpin 18s linear infinite" }}>
          {RAYS.map((deg) => (
            <div
              key={deg}
              className="absolute left-1/2 top-1/2 h-1/2 w-28 -translate-x-1/2"
              style={{
                transformOrigin: "50% 0",
                transform: `rotate(${deg}deg)`,
                background: `linear-gradient(${glow}, transparent 70%)`,
                clipPath: "polygon(42% 0,58% 0,100% 100%,0 100%)"
              }}
            />
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${glow}, transparent 45%)` }} />
      {stage === "burst" && <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: "chestFlash .7s ease-out both" }} />}

      <div className="relative flex flex-col items-center px-6">
        {stage !== "reveal" ? (
          <>
            <p className="eyebrow mb-6">{chest.name}</p>
            <div style={{ animation: stage === "shake" ? "chestShake .25s linear infinite" : "none" }}>
              <ChestSVG colors={chest.colors} open={stage === "burst"} className="h-56 w-64 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" />
            </div>
            {stage === "burst" &&
              SPARKS.map((s, i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                  style={{ background: rarity.color, boxShadow: `0 0 10px ${rarity.color}`, "--x": `${s.x}px`, "--y": `${s.y}px`, animation: `sparkOut ${s.d}s ease-out both` }}
                />
              ))}
          </>
        ) : (
          <>
            <RewardCard reward={reward} />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={onClose} className="btn btn-gold min-w-[180px]">Забрать</button>
              {canAgain && (
                <button onClick={onAgain} className="btn btn-ghost min-w-[180px]">
                  Ещё раз · {chest.price} <img src="/tokens.png" alt="" className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
