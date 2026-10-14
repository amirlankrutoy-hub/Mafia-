import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { PRIZE_TIERS } from "../../data/courtEvent";
import DecorationSVG from "../shop/DecorationSVG";
import { soundGain } from "../../services/settings";

const C = 320; // центр viewBox 640×640
const R = 282; // радиус секторов
const SPIN_MS = 7200;

const rad = (deg) => ((deg - 90) * Math.PI) / 180;
const pt = (r, deg) => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))];

function sectorPath(i, SEG) {
  if (SEG >= 360) return `M ${C - R} ${C} A ${R} ${R} 0 1 1 ${C + R} ${C} A ${R} ${R} 0 1 1 ${C - R} ${C} Z`;
  const a0 = i * SEG;
  const a1 = a0 + SEG;
  const [x0, y0] = pt(R, a0);
  const [x1, y1] = pt(R, a1);
  return `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`;
}

// Звуки: щелчок сектора и победный аккорд
let audioCtx = null;
function tone(freq, dur, type = "triangle", vol = 0.06, when = 0) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    const g = soundGain();
    if (g <= 0) return;
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol * g, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gain).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* без звука */
  }
}
const tick = () => tone(1300, 0.04, "square", 0.035);
const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, "triangle", 0.07, i * 0.09));

function SectorContent({ prize }) {
  const tier = PRIZE_TIERS[prize.tier];
  if (prize.kind === "tokens") {
    return (
      <g>
        <image href="/tokens.png" x={-17} y={-232} width={34} height={34} />
        <text y={-184} textAnchor="middle" className="fw-amount">
          {prize.amount}
        </text>
      </g>
    );
  }
  if (prize.kind === "emoji") {
    return (
      <text y={-196} textAnchor="middle" className="fw-emoji">
        {prize.symbol}
      </text>
    );
  }
  if (prize.kind === "role") {
    return (
      <g className="fw-role">
        <rect x={-22} y={-250} width={44} height={66} rx={7} fill="#000" stroke={tier.color} strokeWidth={3} />
        <clipPath id={`clip-r-${prize.index}`}>
          <rect x={-20} y={-248} width={40} height={62} rx={6} />
        </clipPath>
        <image href={prize.image} x={-20} y={-248} width={40} height={62} clipPath={`url(#clip-r-${prize.index})`} preserveAspectRatio="xMidYMid slice" />
      </g>
    );
  }
  if (prize.kind === "decoration") {
    return (
      <foreignObject x={-26} y={-238} width={52} height={40}>
        <div className="fw-deco">
          <DecorationSVG kind={prize.deco.kind} colors={prize.deco.colors} className="h-9 w-12" />
        </div>
      </foreignObject>
    );
  }
  // аватарка
  return (
    <g>
      <clipPath id={`clip-a-${prize.index}`}>
        <circle cx={0} cy={-214} r={25} />
      </clipPath>
      <circle cx={0} cy={-214} r={28} fill={tier.color} opacity={0.9} />
      <image href={prize.image} x={-25} y={-239} width={50} height={50} clipPath={`url(#clip-a-${prize.index})`} preserveAspectRatio="xMidYMid slice" />
    </g>
  );
}

/**
 * Колесо фортуны «Суд Мафий». spinTo(index) крутит колесо и останавливает
 * указанный сектор под указателем; возвращает Promise, который
 * выполняется по окончании вращения.
 */
const FortuneWheel = forwardRef(function FortuneWheel({ prizes }, ref) {
  const N = Math.max(1, prizes.length);
  const SEG = 360 / N;
  const wheelRef = useRef(null);
  const pointerRef = useRef(null);
  const rotation = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);

  useImperativeHandle(ref, () => ({
    spinTo(index /* позиция сектора в prizes */) {
      return new Promise((resolve) => {
        const el = wheelRef.current;
        if (!el) return resolve();
        setWinner(null);
        setSpinning(true);
        const target = (360 - (index * SEG + SEG / 2)) % 360;
        const current = ((rotation.current % 360) + 360) % 360;
        const jitter = (Math.random() - 0.5) * SEG * 0.6;
        const delta = 360 * 8 + ((target - current + 360) % 360) + jitter;
        rotation.current += delta;
        el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.62, 0.06, 1)`;
        el.style.transform = `rotate(${rotation.current}deg)`;

        // щелчки, когда граница сектора проходит под указателем
        let last = null;
        let raf;
        const watch = () => {
          const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
          const deg = ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
          const seg = Math.floor(deg / SEG);
          if (last !== null && seg !== last) {
            tick();
            const p = pointerRef.current;
            if (p) {
              p.classList.remove("fw-pointer--hit");
              void p.offsetWidth;
              p.classList.add("fw-pointer--hit");
            }
          }
          last = seg;
          raf = requestAnimationFrame(watch);
        };
        raf = requestAnimationFrame(watch);

        setTimeout(() => {
          cancelAnimationFrame(raf);
          setSpinning(false);
          setWinner(index);
          fanfare();
          resolve();
        }, SPIN_MS + 80);
      });
    }
  }));

  return (
    <div className={`fw ${spinning ? "fw--spinning" : ""}`}>
      <div className="fw__rays" />
      <div className="fw__halo" />
      <div ref={pointerRef} className="fw-pointer">
        <svg viewBox="0 0 60 80" aria-hidden="true">
          <defs>
            <linearGradient id="fwPointer" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff6cf" />
              <stop offset="45%" stopColor="#f3d27a" />
              <stop offset="100%" stopColor="#8b6b12" />
            </linearGradient>
            <radialGradient id="fwRuby" cx="35%" cy="30%">
              <stop offset="0%" stopColor="#ffb3b3" />
              <stop offset="45%" stopColor="#e11d2e" />
              <stop offset="100%" stopColor="#5c0000" />
            </radialGradient>
          </defs>
          <path d="M30 78 L6 22 A26 26 0 1 1 54 22 Z" fill="url(#fwPointer)" stroke="#5c4208" strokeWidth="2" />
          <circle cx="30" cy="24" r="12" fill="url(#fwRuby)" stroke="#fff1b8" strokeWidth="2" />
        </svg>
      </div>

      <svg className="fw__svg" viewBox="0 0 640 640" role="img" aria-label="Колесо фортуны «Суд Мафий»">
        <defs>
          <radialGradient id="fwRed" cx="50%" cy="50%" r="50%">
            <stop offset="35%" stopColor="#2a0508" />
            <stop offset="100%" stopColor="#7a1018" />
          </radialGradient>
          <radialGradient id="fwBlack" cx="50%" cy="50%" r="50%">
            <stop offset="35%" stopColor="#07040a" />
            <stop offset="100%" stopColor="#1f1416" />
          </radialGradient>
          <radialGradient id="fwRoleSeg" cx="50%" cy="50%" r="50%">
            <stop offset="30%" stopColor="#3b0306" />
            <stop offset="100%" stopColor="#d4af37" />
          </radialGradient>
          <linearGradient id="fwGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff6cf" />
            <stop offset="30%" stopColor="#d4af37" />
            <stop offset="55%" stopColor="#8b6b12" />
            <stop offset="80%" stopColor="#f3d27a" />
            <stop offset="100%" stopColor="#6b4f08" />
          </linearGradient>
          <radialGradient id="fwHub" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#fff6cf" />
            <stop offset="45%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#6b4f08" />
          </radialGradient>
          <radialGradient id="fwHubInner" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#5c0a10" />
            <stop offset="100%" stopColor="#14030a" />
          </radialGradient>
        </defs>

        {/* обод (не вращается) */}
        <circle cx={C} cy={C} r={316} fill="#0b0607" />
        <circle cx={C} cy={C} r={304} fill="none" stroke="url(#fwGold)" strokeWidth={24} />
        <circle cx={C} cy={C} r={292} fill="none" stroke="#3b2a07" strokeWidth={2} />
        {Array.from({ length: 30 }).map((_, i) => {
          const [x, y] = pt(304, i * 12 + 6);
          return <circle key={i} cx={x} cy={y} r={6.5} className={`fw-bulb ${i % 2 ? "fw-bulb--b" : ""}`} />;
        })}

        {/* вращающаяся часть */}
        <g ref={wheelRef} className="fw__spin" style={{ transformOrigin: "320px 320px" }}>
          {prizes.map((p, i) => (
            <path
              key={p.index}
              d={sectorPath(i, SEG)}
              fill={p.kind === "role" ? "url(#fwRoleSeg)" : i % 2 ? "url(#fwBlack)" : "url(#fwRed)"}
              stroke="#c9971c"
              strokeWidth={1.5}
              className={winner === i ? "fw-seg--win" : ""}
            />
          ))}
          {/* цветная полоска редкости у края */}
          {N > 1 && prizes.map((p, i) => {
            const a0 = i * SEG + 1;
            const a1 = (i + 1) * SEG - 1;
            const [x0, y0] = pt(276, a0);
            const [x1, y1] = pt(276, a1);
            return (
              <path
                key={`t${p.index}`}
                d={`M ${x0} ${y0} A 276 276 0 0 1 ${x1} ${y1}`}
                stroke={PRIZE_TIERS[p.tier].color}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                opacity={0.9}
              />
            );
          })}
          {prizes.map((p, i) => (
            <g key={`c${p.index}`} transform={`translate(${C} ${C}) rotate(${i * SEG + SEG / 2})`}>
              <SectorContent prize={p} />
            </g>
          ))}
          {/* внутреннее кольцо с узором */}
          <circle cx={C} cy={C} r={112} fill="none" stroke="url(#fwGold)" strokeWidth={4} />
          {Array.from({ length: 30 }).map((_, i) => {
            const [x, y] = pt(112, i * 12);
            return <circle key={`d${i}`} cx={x} cy={y} r={3} fill="#f3d27a" />;
          })}
        </g>

        {/* ступица */}
        <circle cx={C} cy={C} r={92} fill="url(#fwHub)" stroke="#5c4208" strokeWidth={3} className="fw-hub" />
        <circle cx={C} cy={C} r={78} fill="url(#fwHubInner)" stroke="#fff1b8" strokeWidth={2} />
        <text x={C} y={C - 4} textAnchor="middle" className="fw-hub__icon">
          ⚖️
        </text>
        <text x={C} y={C + 34} textAnchor="middle" className="fw-hub__text">
          СУД МАФИЙ
        </text>
      </svg>
    </div>
  );
});

export default FortuneWheel;
