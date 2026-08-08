import { useEffect, useState } from "react";

// Полноэкранный скример для игрока в момент его смерти.
// variant="generic" — обычная казнь/смерть ночью (стук топора + крик).
// variant="mafia"   — игрока убила мафия: более мрачный, глухой звук
//                     и другой текст/цвет, звук больше похож на выстрел.
// Звук генерируется через Web Audio API, без внешних файлов.
export default function DeathScreamer({ reason, variant = "generic", onEnd }) {
  const [stage, setStage] = useState("knock"); // knock -> hit -> done
  const isMafia = variant === "mafia";

  useEffect(() => {
    let ctx;

    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      ctx = null;
    }

    const knock = (time, freq, dur) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    };

    if (ctx) {
      const now = ctx.currentTime;
      if (isMafia) {
        // редкие, тяжёлые, низкие удары — шаги/выстрел
        [0, 0.6, 1.2].forEach((t) => knock(now + t, 40, 0.3));
      } else {
        // частые удары топора в дверь
        [0, 0.45, 0.9, 1.35, 1.8].forEach((t) => knock(now + t, 55, 0.18));
      }
    }

    const hitTimer = setTimeout(() => {
      setStage("hit");

      if (ctx) {
        const duration = isMafia ? 0.35 : 0.9;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const decay = isMafia
            ? Math.pow(1 - i / bufferSize, 3) // резкий "выстрел"
            : 1 - i / bufferSize; // затухающий "крик"
          data[i] = (Math.random() * 2 - 1) * decay;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.9, ctx.currentTime);
        noise.connect(noiseGain).connect(ctx.destination);
        noise.start();
      }
    }, 2200);

    const endTimer = setTimeout(() => {
      setStage("done");
      onEnd?.();
    }, 3900);

    return () => {
      clearTimeout(hitTimer);
      clearTimeout(endTimer);
      if (ctx) ctx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flashColor = isMafia ? "#1a1a1a" : "#4a0000";
  const titleColor = isMafia ? "#e2b13c" : "#b00000";

  return (
    <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center overflow-hidden p-8">
      <style>{`
        @keyframes deathShake {
          0% { transform: translate(0,0); }
          20% { transform: translate(-8px,5px); }
          40% { transform: translate(7px,-6px); }
          60% { transform: translate(-6px,-7px); }
          80% { transform: translate(5px,8px); }
          100% { transform: translate(0,0); }
        }
        @keyframes deathFlash {
          0%, 100% { background-color: #000000; }
          50% { background-color: ${flashColor}; }
        }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          animation: stage === "hit" ? "deathFlash 0.25s infinite" : "none"
        }}
      />

      <div
        className="relative text-center"
        style={{
          animation: stage === "hit" ? "deathShake 0.12s infinite" : "none"
        }}
      >
        <h1
          className="text-4xl md:text-6xl font-black tracking-wide"
          style={{
            color: titleColor,
            textShadow: `0 0 25px ${titleColor}, 0 0 60px ${flashColor}`,
            fontFamily: "Georgia, serif"
          }}
        >
          {stage === "knock"
            ? isMafia
              ? "К вам пришли гости..."
              : "Кто-то ломится в дверь..."
            : isMafia
            ? "МАФИЯ ЗАБРАЛА ВАС"
            : "ВЫ УБИТЫ"}
        </h1>
        {stage === "hit" && reason && (
          <p className="mt-6 text-lg text-gray-300">{reason}</p>
        )}
      </div>
    </div>
  );
}
