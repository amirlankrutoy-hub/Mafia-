import { useEffect, useRef, useState } from "react";
import roles from "../data/roles";

const TEAM_STYLE = {
  mafia: { chip: "chip--red", glow: "rgba(192,21,31,0.65)" },
  civilians: { chip: "chip--green", glow: "rgba(16,185,129,0.45)" },
  neutrals: { chip: "", glow: "rgba(212,175,55,0.55)" }
};

// Карта крутится, тормозит и переворачивается — открывая вашу роль
export default function RoleRoulette({ role, onFinish }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let delay = 70;
    let timer;
    let alive = true;
    const spin = () => {
      if (!alive) return;
      setIndex((i) => (i + 1) % roles.length);
      delay *= 1.12;
      if (delay < 420) {
        timer = setTimeout(spin, delay);
      } else {
        timer = setTimeout(() => {
          setRevealed(true);
          timer = setTimeout(() => finishRef.current?.(), 3200);
        }, 350);
      }
    };
    timer = setTimeout(spin, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const finalRole = roles.find((r) => r.id === role) || roles.find((r) => r.id === "obivatel");
  const shown = revealed ? finalRole : roles[index];
  const style = TEAM_STYLE[finalRole.category] || TEAM_STYLE.neutrals;

  return (
    <div className="fixed inset-0 z-[600] flex flex-col items-center justify-center overflow-hidden bg-[#050302] p-6">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: revealed ? 1 : 0.4,
          background: `radial-gradient(circle at 50% 45%, ${revealed ? style.glow : "rgba(212,175,55,0.25)"}, transparent 55%)`
        }}
      />
      <p className="eyebrow relative anim-fade-in">{revealed ? "Ваша роль" : "Судьба тасует карты…"}</p>

      <div className="relative mt-6 [perspective:1200px]">
        <div
          className="relative aspect-[2/3] w-[min(68vw,300px,42vh)] transition-transform duration-[900ms] [transform-style:preserve-3d]"
          style={{ transform: revealed ? "rotateY(360deg) scale(1.04)" : "rotateY(0deg)" }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-3xl ring-2 ring-[#d4af37]/70 shadow-[0_30px_80px_-20px_rgba(0,0,0,1)] [backface-visibility:hidden]">
            <img key={shown.id} src={shown.image} alt={shown.name} className={`h-full w-full object-cover ${revealed ? "" : "blur-[1px] brightness-75"}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="logo-sheen !rounded-3xl ![mask-image:none]" />
          </div>
        </div>
      </div>

      <div className="relative mt-8 min-h-[7rem] text-center">
        <h1 key={shown.id + revealed} className={`font-display text-4xl font-black sm:text-5xl ${revealed ? "gold-text anim-blur-in" : "text-[#e6d5bc]/70"}`}>
          {shown.name}
        </h1>
        {revealed && (
          <div className="anim-fade-up" style={{ "--i": 3 }}>
            <span className={`chip mt-3 ${style.chip}`}>{finalRole.team}</span>
            <p className="mx-auto mt-3 max-w-sm text-sm text-[#c9b48f]">{finalRole.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
