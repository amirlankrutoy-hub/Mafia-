import { useEffect, useMemo, useRef, useState } from "react";
import roles from "../../data/roles";
import { TEAMS } from "../../data/teams";
import { soundGain } from "../../services/settings";
import "../../solo.css";

const CARD_W = 132;
const GAP = 14;
const STEP = CARD_W + GAP;
const LANDING = 38; // на какой карте лента остановится
const SPIN_MS = 5200;

// Короткий «щелчок» при смене карты под рамкой — как барабан в слот-машине
function makeTicker() {
  let ctx = null;
  return (pitch = 1) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ctx = ctx || new Ctx();
      const g = soundGain();
      if (g <= 0) return;
      const o = ctx.createOscillator();
      const gain = ctx.createGain();
      o.type = "square";
      o.frequency.value = 900 * pitch;
      gain.gain.setValueAtTime(0.05 * g, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      o.connect(gain).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.06);
    } catch {
      /* без звука */
    }
  };
}

/**
 * Лента карт ролей быстро прокручивается, замедляется и останавливается
 * на вашей роли (как в «Супер Сус»), затем карта раскрывается.
 */
export default function SoloRoleReel({ role, onFinish }) {
  const finalRole = roles.find((r) => r.id === role) || roles.find((r) => r.id === "obivatel");
  const team = TEAMS[finalRole.category] || TEAMS.civilians;
  const [phase, setPhase] = useState("ready"); // ready | spin | stop | reveal
  const stripRef = useRef(null);
  const viewRef = useRef(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  // Случайная лента; соседние карты не повторяются, итоговая — на LANDING
  const strip = useMemo(() => {
    const list = [];
    for (let i = 0; i < LANDING + 6; i++) {
      let r;
      do r = roles[Math.floor(Math.random() * roles.length)];
      while (list.length && list[list.length - 1].id === r.id);
      list.push(r);
    }
    list[LANDING] = finalRole;
    if (list[LANDING - 1].id === finalRole.id) list[LANDING - 1] = roles.find((r) => r.id !== finalRole.id);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    const view = viewRef.current;
    const el = stripRef.current;
    if (!view || !el) return;
    const center = view.clientWidth / 2 - CARD_W / 2;
    // небольшой случайный сдвиг внутри карты — каждый раз останавливается чуть по-разному
    const jitter = (Math.random() - 0.5) * CARD_W * 0.5;
    const target = -(LANDING * STEP - center) + jitter;
    el.style.transform = `translateX(${center + STEP * 2}px)`;
    const tick = makeTicker();
    let raf;
    let last = null;

    const t1 = setTimeout(() => {
      setPhase("spin");
      el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.08, 0.72, 0.12, 1)`;
      el.style.transform = `translateX(${target}px)`;
      const watch = () => {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const idx = Math.round((center - m.m41) / STEP);
        if (last !== null && idx !== last) tick(1 + Math.min(idx, LANDING) / 80);
        last = idx;
        raf = requestAnimationFrame(watch);
      };
      raf = requestAnimationFrame(watch);
    }, 500);

    // доводим ровно к центру карты и раскрываем
    const t2 = setTimeout(() => {
      cancelAnimationFrame(raf);
      setPhase("stop");
      el.style.transition = "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)";
      el.style.transform = `translateX(${-(LANDING * STEP - center)}px)`;
    }, 500 + SPIN_MS);
    const t3 = setTimeout(() => setPhase("reveal"), 500 + SPIN_MS + 600);
    const t4 = setTimeout(() => finishRef.current?.(), 500 + SPIN_MS + 4600);
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [strip]);

  const revealed = phase === "reveal";

  return (
    <div className="solo-reel" style={{ "--team": team.color, "--team-glow": team.glow }}>
      <div className={`solo-reel__bg ${revealed ? "solo-reel__bg--on" : ""}`} />
      <p className="solo-reel__eyebrow">{revealed ? "Ваша роль" : "Определяем вашу роль…"}</p>

      <div ref={viewRef} className={`solo-reel__window ${revealed ? "solo-reel__window--done" : ""}`}>
        <div className="solo-reel__marker" />
        <div ref={stripRef} className="solo-reel__strip" style={{ gap: GAP }}>
          {strip.map((r, i) => {
            const t = TEAMS[r.category] || TEAMS.civilians;
            const isFinal = i === LANDING;
            return (
              <div
                key={i}
                className={`solo-reel__card ${isFinal && revealed ? "solo-reel__card--win" : ""} ${revealed && !isFinal ? "solo-reel__card--dim" : ""}`}
                style={{ width: CARD_W, "--c": t.color }}
              >
                <img src={r.image} alt="" draggable="false" />
                <span>{r.name}</span>
              </div>
            );
          })}
        </div>
        <div className="solo-reel__fade solo-reel__fade--l" />
        <div className="solo-reel__fade solo-reel__fade--r" />
      </div>

      <div className="solo-reel__info">
        {revealed ? (
          <>
            <span className="solo-reel__team">
              <span style={{ background: team.color }} /> {team.label}
            </span>
            <h1 className="solo-reel__name">{finalRole.name}</h1>
            <p className="solo-reel__desc">{finalRole.description}</p>
          </>
        ) : (
          <p className="solo-reel__hint">Роль выпадает случайно — только из тех, что открыты в вашей коллекции</p>
        )}
      </div>
    </div>
  );
}
