import { useEffect, useRef, useState } from "react";

// Экран смерти игрока.
//  - Убит ночью (или устранён мэром): коридор, дверь с табличкой "YOUR ROOM",
//    5 ударов в дверь, дверь распахивается -> "ВАС УБИЛИ".
//  - Казнён на голосовании: площадь, виселица, барабанная дробь, люк -> "ВЫ МЕРТВЫ".
// Звуки синтезируются через Web Audio API, без файлов.

const KNOCKS = [1000, 1750, 2500, 3250, 4000];

function useAudio() {
  const ref = useRef(null);
  useEffect(() => {
    try {
      ref.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ref.current = null;
    }
    return () => {
      try {
        ref.current?.close();
      } catch (_) {}
    };
  }, []);

  const noise = (dur, gainValue, filterFreq, when = 0) => {
    const ctx = ref.current;
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainValue, t);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  };

  const tone = (freq, dur, gainValue, type = "sine", when = 0, slideTo = null) => {
    const ctx = ref.current;
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gainValue, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  return {
    knock: () => {
      tone(70, 0.25, 0.9, "sine", 0, 40);
      noise(0.12, 0.6, 900);
    },
    slam: () => {
      tone(55, 0.6, 1, "sawtooth", 0, 30);
      noise(0.5, 0.9, 2500);
    },
    sting: () => {
      tone(880, 1.4, 0.15, "sawtooth", 0, 220);
      tone(932, 1.4, 0.12, "sawtooth", 0, 233);
    },
    drumroll: (dur) => {
      for (let i = 0; i < dur / 0.06; i++) noise(0.05, 0.18 + (i / (dur / 0.06)) * 0.4, 700, i * 0.06);
    },
    drop: () => {
      tone(90, 0.5, 1, "square", 0, 35);
      noise(0.35, 0.8, 1200);
    }
  };
}

function DoorScene({ stage, knocks }) {
  const open = stage === "open" || stage === "dead";
  return (
    <div className={`relative flex h-full w-full items-end justify-center ${stage === "knock" ? "death-knock-shake" : ""}`} key={knocks}>
      {/* Коридор */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#2b1a10_0%,#0b0604_55%,#000_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-b from-[#1a0f08] to-black [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]" />
      {/* Лампа над дверью */}
      <div className="death-lamp absolute left-1/2 top-[6%] h-[55%] w-[60vmin] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,214,140,0.35),transparent_65%)]" />

      <div className="relative mb-[30%] flex flex-col items-center sm:mb-[12%]">
        {/* Табличка YOUR ROOM */}
        <div className="death-plaque mb-4 rounded-md border-2 border-[#8b6b12] bg-gradient-to-b from-[#f6dc8f] via-[#d4af37] to-[#8b6b12] px-6 py-1.5 font-display text-xl font-black tracking-[0.3em] text-[#2a1606] shadow-[0_0_30px_rgba(212,175,55,0.5)] sm:text-2xl">
          YOUR ROOM
        </div>

        {/* Дверь */}
        <div className="relative h-[52vmin] w-[30vmin] min-h-[260px] min-w-[150px] [perspective:900px]">
          <div className="absolute -inset-3 rounded-t-md bg-gradient-to-b from-[#3a2414] to-[#1a0e07] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]" />
          {/* Проём: красный свет, когда дверь открыта */}
          <div className={`absolute inset-0 transition-all duration-500 ${open ? "bg-[radial-gradient(circle_at_50%_45%,#ff3b3b,#5a0000_60%,#000_100%)]" : "bg-black"}`}>
            {open && (
              <svg viewBox="0 0 100 200" className="death-silhouette absolute inset-x-[15%] bottom-0 h-[85%] w-[70%]">
                <path d="M50 18c9 0 15 7 15 16s-6 16-15 16-15-7-15-16 6-16 15-16zM22 20h56l-4 6H26z M30 60c6-6 34-6 40 0l10 70-12 2-4 68H36l-4-68-12-2z" fill="#000" />
              </svg>
            )}
          </div>
          {/* Полотно двери */}
          <div
            className="absolute inset-0 origin-left rounded-t-sm transition-transform duration-[450ms] ease-[cubic-bezier(.6,.05,.4,1.3)]"
            style={{ transform: open ? "rotateY(-105deg)" : "rotateY(0)", transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 rounded-t-sm bg-[linear-gradient(90deg,#4a2c17,#6b4023_30%,#5a351c_70%,#3b2212)] shadow-[inset_0_0_25px_rgba(0,0,0,0.8)]">
              {[0, 1].map((r) => (
                <div key={r} className="absolute left-[14%] right-[14%] rounded-sm border-2 border-[#2e1a0c]/80 shadow-[inset_0_0_12px_rgba(0,0,0,0.6)]" style={{ top: r ? "54%" : "8%", height: r ? "38%" : "40%" }} />
              ))}
              <div className="absolute right-[10%] top-[52%] h-4 w-4 rounded-full bg-gradient-to-br from-[#fff3c4] to-[#8b6b12] shadow-[0_0_8px_rgba(243,210,122,0.8)]" />
              <div className="absolute right-[11.5%] top-[57%] h-2 w-1 rounded-full bg-black" />
            </div>
          </div>
          {/* Свет из-под двери */}
          <div className={`absolute -bottom-1 left-0 right-0 h-1.5 blur-[2px] transition-colors duration-300 ${knocks > 0 && !open ? "death-under-light" : ""}`} />
        </div>
      </div>

      {/* Счётчик ударов */}
      {stage === "knock" || stage === "wait" ? (
        <div className="absolute bottom-[6%] left-1/2 flex -translate-x-1/2 gap-3">
          {KNOCKS.map((_, i) => (
            <span key={i} className={`h-3 w-3 rounded-full transition-all duration-200 ${i < knocks ? "scale-125 bg-red-600 shadow-[0_0_12px_#ef4444]" : "bg-white/10"}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GallowsScene({ stage }) {
  const dropped = stage === "drop" || stage === "dead";
  return (
    <div className={`relative flex h-full w-full items-end justify-center ${stage === "drop" ? "death-knock-shake" : ""}`}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#2a0c08_0%,#5a1a0c_45%,#1a0905_75%,#000_100%)]" />
      <div className="absolute left-1/2 top-[18%] h-[40vmin] w-[40vmin] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ff9a4a,#c2410c_45%,transparent_70%)] opacity-60 blur-sm" />
      {/* Силуэты города */}
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[22%] h-[18%] w-full">
        <path d="M0 100V60h20V40h15v20h25V30h10l5-15 5 15h10v70h20V50h30v50h15V35h20v65h25V55h18V25h12v75h30V45h25v55h20V60h22v40z" fill="#0d0503" />
      </svg>

      <svg viewBox="0 0 300 300" className="relative mb-[16%] h-[62vmin] w-[62vmin] min-h-[280px] min-w-[280px]">
        {/* Помост */}
        <rect x="40" y="230" width="220" height="16" fill="#2a160a" />
        <rect x="55" y="246" width="10" height="54" fill="#1f1007" />
        <rect x="235" y="246" width="10" height="54" fill="#1f1007" />
        {/* Люк */}
        <g style={{ transformOrigin: "130px 230px", transform: dropped ? "rotate(80deg)" : "none", transition: "transform .35s cubic-bezier(.6,0,.9,1.4)" }}>
          <rect x="130" y="228" width="40" height="6" fill="#3d2010" />
        </g>
        {/* Столб и перекладина */}
        <rect x="70" y="40" width="14" height="190" fill="#24130a" />
        <rect x="70" y="40" width="120" height="12" fill="#24130a" />
        <path d="M84 70 L110 52" stroke="#24130a" strokeWidth="8" />
        {/* Верёвка */}
        <g className={dropped ? "death-rope-swing" : "death-rope-idle"} style={{ transformOrigin: "150px 52px" }}>
          <line x1="150" y1="52" x2="150" y2={dropped ? 190 : 150} stroke="#c9a46a" strokeWidth="3" style={{ transition: "all .3s cubic-bezier(.5,0,.5,1.6)" }} />
          <ellipse cx="150" cy={dropped ? 202 : 162} rx="10" ry="13" fill="none" stroke="#c9a46a" strokeWidth="3" style={{ transition: "all .3s cubic-bezier(.5,0,.5,1.6)" }} />
        </g>
        {/* Рычаг */}
        <g style={{ transformOrigin: "225px 230px", transform: dropped ? "rotate(-40deg)" : "rotate(20deg)", transition: "transform .3s" }}>
          <rect x="222" y="190" width="6" height="40" fill="#3d2010" />
          <circle cx="225" cy="190" r="6" fill="#8b6b12" />
        </g>
      </svg>

      {/* Толпа */}
      <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="death-crowd absolute inset-x-0 bottom-0 h-[24%] w-full">
        {Array.from({ length: 22 }, (_, i) => (
          <g key={i} transform={`translate(${i * 19 - 5}, ${8 + (i % 3) * 6})`}>
            <circle cx="10" cy="10" r="8" fill="#050201" />
            <rect x="0" y="16" width="20" height="50" rx="9" fill="#050201" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function DeathScreamer({ reason, killedBy, onEnd }) {
  const isExecution = killedBy === "execution";
  const [stage, setStage] = useState(isExecution ? "drum" : "silence"); // door: silence|knock|wait|open|dead ; gallows: drum|drop|dead
  const [knocks, setKnocks] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const audio = useAudio();
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    if (isExecution) {
      at(200, () => audio.drumroll(3));
      at(3400, () => {
        setStage("drop");
        audio.drop();
      });
      at(4400, () => {
        setStage("dead");
        audio.sting();
      });
      at(5800, () => setShowButton(true));
      at(14000, () => endRef.current?.());
    } else {
      KNOCKS.forEach((ms, i) =>
        at(ms, () => {
          setStage("knock");
          setKnocks(i + 1);
          audio.knock();
          if (navigator.vibrate) navigator.vibrate(60);
        })
      );
      at(4500, () => setStage("wait"));
      at(5400, () => {
        setStage("open");
        audio.slam();
        if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
      });
      at(6200, () => {
        setStage("dead");
        audio.sting();
      });
      at(7600, () => setShowButton(true));
      at(16000, () => endRef.current?.());
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dead = stage === "dead";

  return (
    <div className="fixed inset-0 z-[950] overflow-hidden bg-black">
      <style>{`
        .death-knock-shake { animation: deathKnock .35s ease-out; }
        @keyframes deathKnock { 0%{transform:translate(0,0) scale(1)} 15%{transform:translate(-6px,3px) scale(1.012)} 30%{transform:translate(5px,-3px)} 45%{transform:translate(-3px,2px)} 60%{transform:translate(2px,-1px)} 100%{transform:translate(0,0) scale(1)} }
        .death-lamp { animation: deathLamp 3.5s linear infinite; }
        @keyframes deathLamp { 0%,18%,22%,62%,64%,100%{opacity:1} 20%,63%{opacity:.35} }
        .death-plaque { animation: deathPlaque 3.5s linear infinite; }
        @keyframes deathPlaque { 0%,18%,22%,62%,64%,100%{filter:brightness(1)} 20%,63%{filter:brightness(.5)} }
        .death-under-light { animation: deathUnder .75s ease-in-out infinite alternate; }
        @keyframes deathUnder { from{background:rgba(255,200,120,.15)} to{background:rgba(255,40,40,.75); box-shadow:0 0 18px rgba(255,40,40,.8)} }
        .death-silhouette { animation: deathSil 1.2s ease-out both; }
        @keyframes deathSil { from{transform:translateY(20%) scale(.8);opacity:0} to{transform:none;opacity:1} }
        .death-rope-idle { animation: deathRopeIdle 2.2s ease-in-out infinite; }
        @keyframes deathRopeIdle { 0%,100%{transform:rotate(2deg)} 50%{transform:rotate(-2deg)} }
        .death-rope-swing { animation: deathRopeSwing 1.6s ease-out infinite; }
        @keyframes deathRopeSwing { 0%,100%{transform:rotate(7deg)} 50%{transform:rotate(-7deg)} }
        .death-crowd { animation: deathCrowd 1.4s ease-in-out infinite; transform-origin: bottom; }
        @keyframes deathCrowd { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.04)} }
        @keyframes deathFlash { 0%{opacity:0} 15%{opacity:.85} 100%{opacity:0} }
        @keyframes deathTitle { 0%{opacity:0;transform:scale(2.2);filter:blur(12px)} 60%{opacity:1;transform:scale(.95);filter:blur(0)} 100%{transform:scale(1)} }
        @keyframes deathDrip { from{height:0} to{height:var(--h)} }
      `}</style>

      <div className={`absolute inset-0 transition-[filter,transform] duration-[1500ms] ${dead ? "scale-105 blur-[3px] brightness-[.35]" : ""}`}>
        {isExecution ? <GallowsScene stage={stage} /> : <DoorScene stage={stage} knocks={knocks} />}
      </div>

      {/* Подписи до смерти */}
      {!dead && (
        <div className="pointer-events-none absolute inset-x-0 top-[7%] text-center">
          <p className="font-display text-2xl italic text-[#e6d5bc]/80 sm:text-3xl anim-fade-in">
            {isExecution
              ? stage === "drum"
                ? "Город вынес приговор…"
                : ""
              : stage === "silence"
              ? "Тишина…"
              : stage === "wait"
              ? "Они уже здесь…"
              : knocks > 0 && stage === "knock"
              ? "Кто-то стучит…"
              : ""}
          </p>
        </div>
      )}

      {(stage === "open" || stage === "drop") && (
        <div className="pointer-events-none absolute inset-0 bg-red-700" style={{ animation: "deathFlash .7s ease-out both" }} />
      )}

      {/* Финал */}
      {dead && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-around">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="w-2 rounded-b-full bg-gradient-to-b from-[#8b0000] to-[#c0151f]" style={{ "--h": `${60 + ((i * 37) % 140)}px`, animation: `deathDrip ${1.2 + (i % 4) * 0.4}s ease-in both` }} />
            ))}
          </div>
          <h1
            className="font-display text-6xl font-black tracking-wide text-[#e0242e] sm:text-8xl"
            style={{ textShadow: "0 0 30px rgba(192,21,31,0.9), 0 0 80px rgba(139,0,0,0.8)", animation: "deathTitle 1.1s cubic-bezier(.2,.9,.3,1) both" }}
          >
            {isExecution ? "ВЫ МЕРТВЫ" : "ВАС УБИЛИ"}
          </h1>
          <p className="mt-5 max-w-md text-lg text-[#e6d5bc]/85 anim-fade-up" style={{ "--i": 6 }}>
            {reason || (isExecution ? "Город приговорил вас к казни." : "Этой ночью к вам пришли гости.")}
          </p>
          {showButton && (
            <button type="button" onClick={() => endRef.current?.()} className="btn btn-ghost mt-10 anim-fade-up">
              Наблюдать за игрой
            </button>
          )}
        </div>
      )}
    </div>
  );
}
