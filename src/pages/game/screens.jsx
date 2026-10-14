import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoon,
  faSkull,
  faHeartPulse,
  faBan,
  faCommentDots,
  faGavel,
  faCrown,
  faCheck,
  faScaleBalanced,
  faHandPeace
} from "@fortawesome/free-solid-svg-icons";
import roles from "../../data/roles";
import Avatar from "../../components/ui/Avatar";

const roleById = (id) => roles.find((r) => r.id === id);

/** Полноэкранная сцена-подложка */
export function Stage({ tone = "night", children, className = "" }) {
  const bg = {
    night: "radial-gradient(ellipse at 50% 0%, #1a2240 0%, #070a16 55%, #020308 100%)",
    morning: "radial-gradient(ellipse at 50% 110%, #7a3b12 0%, #2a1408 45%, #0a0605 100%)",
    blood: "radial-gradient(ellipse at 50% 40%, #3a0505 0%, #120202 60%, #050101 100%)",
    noir: "radial-gradient(ellipse at 50% 0%, #2a170e 0%, #0a0605 60%, #050302 100%)"
  }[tone];
  return (
    <div className={`fixed inset-0 z-[400] overflow-y-auto ${className}`} style={{ background: bg }}>
      {tone === "night" && (
        <>
          <div className="rain" />
          <div className="rain rain--2" />
          <div className="pointer-events-none absolute right-[12%] top-[8%] h-24 w-24 rounded-full bg-[#f5f0d8] opacity-80 shadow-[0_0_80px_30px_rgba(245,240,216,0.25)] anim-float sm:h-32 sm:w-32">
            <div className="absolute left-5 top-4 h-5 w-5 rounded-full bg-black/10" />
            <div className="absolute bottom-6 right-6 h-3 w-3 rounded-full bg-black/10" />
          </div>
        </>
      )}
      {tone === "morning" && (
        <div className="pointer-events-none absolute bottom-[-30vmin] left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ffcf7a,#e07a24_45%,transparent_70%)] opacity-70 blur-sm" style={{ animation: "sunrise 3s var(--ease-out) both" }} />
      )}
      <style>{`@keyframes sunrise { from { transform: translate(-50%, 40%); opacity: 0 } to { transform: translate(-50%, 0); opacity: .7 } }`}</style>
      <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-5 py-12">{children}</div>
    </div>
  );
}

export function NightPublic({ phrase, label, night }) {
  return (
    <Stage tone="night">
      <p className="eyebrow !text-[#8ea2d8] anim-fade-in">
        <FontAwesomeIcon icon={faMoon} className="mr-2" />
        Ночь {night || ""}
      </p>
      <h1 key={phrase} className="mt-5 max-w-3xl text-center font-display text-3xl font-black italic text-[#c9d3f5] sm:text-5xl anim-blur-in" style={{ textShadow: "0 0 30px rgba(120,140,255,0.35)" }}>
        «{phrase || "Город засыпает…"}»
      </h1>
      {label && (
        <p key={label} className="mt-10 rounded-full border border-[#8ea2d8]/30 bg-black/30 px-5 py-2 text-sm text-[#c9d3f5]/80 anim-fade-up">
          Просыпается: <b className="text-[#e6ecff]">{label}</b>
        </p>
      )}
      <p className="mt-8 text-xs text-[#8ea2d8]/50 anim-fade-in">Закройте глаза… и не подглядывайте</p>
    </Stage>
  );
}

export function WaitScreen({ title, text, tone = "night" }) {
  return (
    <Stage tone={tone}>
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-2 border-[#d4af37]/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#f3d27a]" />
      </div>
      <h2 className="mt-6 text-center font-display text-3xl font-black gold-text anim-blur-in">{title}</h2>
      {text && <p className="mt-3 max-w-md text-center text-[#c9b48f] anim-fade-up">{text}</p>}
    </Stage>
  );
}

/** Ход игрока ночью */
export function NightTurn({ step, targets = [], team, teamChoices = [], onAction }) {
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(step?.modes ? null : "default");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const needMode = step?.modes?.length > 0;
  const modeLabel = step?.modes?.find((m) => m.id === mode)?.label;

  useEffect(() => {
    setSelected(null);
    setMode(step?.modes ? null : "default");
    setSending(false);
    setError("");
  }, [step?.role]);

  const submit = async () => {
    if (!selected || (needMode && !mode)) return;
    setSending(true);
    const res = await onAction(selected, mode === "default" ? null : mode);
    if (!res?.success) {
      setSending(false);
      setError(res?.message || "Не удалось — попробуйте ещё раз");
    }
  };

  const roleInfo = roleById(step?.role);

  return (
    <Stage tone="night">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center text-center">
          {roleInfo && (
            <img src={roleInfo.image} alt="" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-[#f3d27a]/70 shadow-[0_0_40px_rgba(212,175,55,0.45)] anim-pop" />
          )}
          <p className="eyebrow mt-4 !text-[#8ea2d8]">Ваш ход</p>
          <h1 className="mt-1 font-display text-4xl font-black gold-text sm:text-5xl anim-blur-in">{step?.label}</h1>
          {step?.hint && <p className="mt-2 max-w-lg text-sm text-[#c9d3f5]/80">{step.hint}</p>}
        </div>

        {team && team.length > 1 && (
          <div className="mx-auto mt-5 max-w-md rounded-2xl border border-red-500/30 bg-red-950/30 p-3 text-center text-sm anim-fade-up">
            <p className="text-red-200">Семья: {team.join(", ")}</p>
            {teamChoices.map((c, i) => (
              <p key={i} className="mt-1 text-xs text-red-300/80">
                {c.name} → <b>{c.targetName}</b>
              </p>
            ))}
          </div>
        )}

        {needMode && (
          <div className="mt-6 flex justify-center">
            <div className="tabs">
              {step.modes.map((m) => (
                <button key={m.id} type="button" className="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {targets.map((t, i) => (
            <button
              key={t.id}
              type="button"
              disabled={sending}
              onClick={() => setSelected(t.id)}
              className={`group relative flex flex-col items-center rounded-2xl border p-4 transition-all duration-300 anim-scale-in ${
                selected === t.id
                  ? "scale-[1.04] border-[#f3d27a] bg-[#d4af37]/15 shadow-[0_0_30px_-5px_rgba(212,175,55,0.7)]"
                  : "border-white/10 bg-black/35 hover:border-[#d4af37]/50"
              }`}
              style={{ "--i": i }}
            >
              <Avatar src={t.avatar} size={64} />
              <span className="mt-2 w-full truncate font-bold text-[#f3e5ab]">{t.name}</span>
              {selected === t.id && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#f3d27a] text-xs text-black anim-pop">
                  <FontAwesomeIcon icon={faCheck} />
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-center text-sm text-red-400 anim-shake">{error}</p>}

        <div className="sticky bottom-4 mt-8 flex justify-center">
          <button
            type="button"
            disabled={!selected || (needMode && !mode) || sending}
            onClick={submit}
            className="btn btn-blood btn-lg min-w-[240px]"
          >
            {sending ? "Отправляем…" : needMode && modeLabel ? `${modeLabel}` : "Подтвердить"}
          </button>
        </div>
      </div>
    </Stage>
  );
}

const RESULT_STYLE = {
  death: { icon: faSkull, cls: "border-red-500/40 bg-red-950/40 text-red-200" },
  saved: { icon: faHeartPulse, cls: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200" },
  block: { icon: faBan, cls: "border-amber-500/30 bg-amber-950/25 text-amber-200" },
  info: { icon: faCommentDots, cls: "border-sky-500/30 bg-sky-950/25 text-sky-200" },
  redirect: { icon: faCommentDots, cls: "border-pink-500/30 bg-pink-950/25 text-pink-200" }
};

export function ResultList({ results = [] }) {
  if (!results.length) {
    return <p className="text-center text-lg text-[#c9b48f] anim-fade-up">Ночь прошла спокойно. Все живы.</p>;
  }
  return (
    <ul className="w-full max-w-lg space-y-2.5">
      {results.map((r, i) => {
        const st = RESULT_STYLE[r.type] || RESULT_STYLE.info;
        return (
          <li key={i} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 anim-slide-left ${st.cls}`} style={{ "--i": i * 3 + 4 }}>
            <FontAwesomeIcon icon={st.icon} className="text-lg" />
            <span className="text-[15px]">{r.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Обратный отсчёт до времени endsAt (одиночный режим — фазы идут по таймеру) */
export function useSecondsLeft(endsAt) {
  const calc = () => (endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : null);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    if (!endsAt) return setLeft(null);
    setLeft(calc());
    const t = setInterval(() => setLeft(calc()), 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  return left;
}

export function SoloTimer({ endsAt, label }) {
  const left = useSecondsLeft(endsAt);
  if (left == null) return null;
  return (
    <div className={`solo-timer ${left <= 5 ? "solo-timer--low" : ""}`}>
      ⏱ {label} {left} с
    </div>
  );
}

export function Morning({ day, results, autoVoteAt }) {
  const left = useSecondsLeft(autoVoteAt);
  return (
    <Stage tone="morning">
      <p className="eyebrow anim-fade-in">День {day || ""}</p>
      <h1 className="mt-2 font-display text-5xl font-black gold-text sm:text-6xl anim-blur-in">Город просыпается</h1>
      <div className="mt-8 flex w-full justify-center">
        <ResultList results={results} />
      </div>
      {left != null ? (
        <p className="mt-8 text-sm text-[#c9b48f] anim-fade-in" style={{ "--i": 12 }}>
          Обсуждайте! Голосование начнётся через <b className="text-[#f3d27a]">{left} с</b>
        </p>
      ) : (
        <p className="mt-8 text-sm text-[#c9b48f]/70 anim-fade-in" style={{ "--i": 12 }}>Обсуждайте! Мэр скоро объявит голосование.</p>
      )}
    </Stage>
  );
}

function TimerRing({ endsAt }) {
  const [left, setLeft] = useState(0);
  const [total] = useState(() => Math.max(1, Math.round((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [endsAt]);
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, left / total);
  const urgent = left <= 15;
  return (
    <div className={`relative h-24 w-24 ${urgent ? "anim-heartbeat" : ""}`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={urgent ? "#ef4444" : "#d4af37"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset .5s linear" }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-mono text-xl font-black ${urgent ? "text-red-400" : "text-[#f3d27a]"}`}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </span>
    </div>
  );
}

export function Voting({ vote, isMayor, canVote, blockedReason, progress, onVote, onFinish }) {
  const [selected, setSelected] = useState(null);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelected(null);
    setVoted(false);
    setError("");
  }, [vote?.round, vote?.endsAt]);

  const runoff = vote?.round === "runoff";
  const done = progress?.votedCount ?? vote?.votedCount ?? 0;
  const total = progress?.votersTotal ?? vote?.votersTotal ?? 0;

  return (
    <Stage tone="blood">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center text-center">
          <FontAwesomeIcon icon={faScaleBalanced} className="text-3xl text-[#f3d27a] anim-float" />
          <h1 className="mt-3 font-display text-4xl font-black gold-text sm:text-5xl anim-blur-in">
            {runoff ? "Переголосование" : "Суд города"}
          </h1>
          {runoff && <p className="mt-2 text-sm text-[#c9b48f]">Голоса разделились — выбирайте только среди этих игроков</p>}
          <div className="mt-5 flex items-center gap-6">
            {vote?.endsAt && <TimerRing key={vote.endsAt} endsAt={vote.endsAt} />}
            <div className="text-left">
              <div className="font-display text-3xl font-black text-[#f3e5ab]">
                {done}/{total}
              </div>
              <div className="eyebrow !text-[0.6rem]">проголосовали</div>
            </div>
          </div>
          {blockedReason && <p className="mt-4 rounded-full bg-red-950/60 px-4 py-2 text-sm font-bold text-red-300">{blockedReason}</p>}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(vote?.candidates || []).map((p, i) => (
            <button
              key={p.id}
              type="button"
              disabled={!canVote || voted}
              onClick={() => setSelected(p.id)}
              className={`relative flex flex-col items-center rounded-2xl border p-4 transition-all duration-300 anim-scale-in disabled:cursor-default ${
                selected === p.id
                  ? "scale-[1.04] border-red-400 bg-red-900/30 shadow-[0_0_30px_-5px_rgba(239,68,68,0.7)]"
                  : "border-white/10 bg-black/35 enabled:hover:border-red-400/50"
              }`}
              style={{ "--i": i }}
            >
              <Avatar src={p.avatar} size={64} />
              <span className="mt-2 w-full truncate font-bold text-[#f3e5ab]">{p.name}</span>
              {selected === p.id && <FontAwesomeIcon icon={faGavel} className="absolute right-3 top-3 text-red-300 anim-pop" />}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}

        <div className="sticky bottom-4 mt-8 flex justify-center">
          {isMayor ? (
            <button type="button" onClick={onFinish} className="btn btn-gold btn-lg">Завершить голосование</button>
          ) : canVote && !voted ? (
            <button
              type="button"
              disabled={!selected}
              onClick={async () => {
                const res = await onVote(selected);
                if (res?.success) setVoted(true);
                else setError(res?.message || "Голос не принят");
              }}
              className="btn btn-blood btn-lg min-w-[240px]"
            >
              <FontAwesomeIcon icon={faGavel} /> Голосовать
            </button>
          ) : voted ? (
            <p className="rounded-full bg-emerald-950/60 px-6 py-3 font-bold text-emerald-300 anim-pop">
              <FontAwesomeIcon icon={faCheck} /> Голос принят
            </p>
          ) : null}
        </div>
      </div>
    </Stage>
  );
}

export function Verdict({ candidate, avatar, isMayor, onExecute, onPardon, solo, judge }) {
  return (
    <Stage tone="blood">
      <p className="eyebrow anim-fade-in">Город вынес приговор</p>
      <div className="relative mt-6 anim-pop">
        <div className="absolute -inset-4 rounded-full bg-red-600/30 blur-2xl anim-heartbeat" />
        <Avatar src={avatar} size={150} />
      </div>
      <h1 className="mt-6 font-display text-5xl font-black blood-text anim-blur-in">{candidate?.name}</h1>
      {candidate?.votes && <p className="mt-2 text-[#c9b48f]">Голосов против: {candidate.votes}</p>}
      {isMayor ? (
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <button type="button" onClick={onExecute} className="btn btn-blood btn-lg btn-pulse">
            <FontAwesomeIcon icon={faGavel} /> Казнить
          </button>
          <button type="button" onClick={onPardon} className="btn btn-ghost btn-lg">
            <FontAwesomeIcon icon={faHandPeace} /> Помиловать
          </button>
        </div>
      ) : (
        <p className="mt-10 text-xl text-[#f3d27a] animate-pulse">{solo ? "Приговор приводится в исполнение…" : "Мэр выносит решение…"}</p>
      )}
      {judge && (
        <div className="mt-6 flex flex-col items-center gap-2 anim-fade-up">
          <button type="button" disabled={judge.busy} onClick={judge.onCancel} className="btn btn-gold btn-lg btn-pulse">
            <FontAwesomeIcon icon={faScaleBalanced} /> Отменить казнь (Судья)
          </button>
          <p className="text-xs text-[#c9b48f]">Вы Судья: можете один раз за игру спасти осуждённого</p>
        </div>
      )}
    </Stage>
  );
}

export function VoteResult({ voteResult }) {
  const ex = voteResult?.executed;
  const pardoned = voteResult?.pardoned;
  return (
    <Stage tone="blood">
      {ex ? (
        <>
          <FontAwesomeIcon icon={faSkull} className="text-6xl text-red-500 anim-pop" />
          <h1 className="mt-6 text-center font-display text-5xl font-black blood-text anim-blur-in">{ex.name} казнён</h1>
          {ex.roleName && <p className="mt-4 text-xl text-[#e6d5bc] anim-fade-up" style={{ "--i": 4 }}>Роль: <b className="text-[#f3d27a]">{ex.roleName}</b></p>}
        </>
      ) : pardoned ? (
        <>
          <FontAwesomeIcon icon={faHandPeace} className="text-6xl text-emerald-400 anim-pop" />
          <h1 className="mt-6 text-center font-display text-5xl font-black gold-text anim-blur-in">
            {voteResult?.judge
              ? `Судья отменил казнь: ${pardoned.name}`
              : voteResult?.alibi
                ? `У ${pardoned.name} нашлось алиби!`
                : `Мэр помиловал ${pardoned.name}`}
          </h1>
          {voteResult?.alibi && <p className="mt-4 text-lg text-[#e6d5bc] anim-fade-up" style={{ "--i": 4 }}>Способность «Алиби» спасла игрока от казни.</p>}
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faScaleBalanced} className="text-6xl text-[#f3d27a] anim-pop" />
          <h1 className="mt-6 text-center font-display text-4xl font-black gold-text anim-blur-in">
            {voteResult?.tie ? "Голоса снова разделились — никто не казнён" : "Никто не был казнён"}
          </h1>
        </>
      )}
      <p className="mt-8 text-sm text-[#c9b48f]/70">Скоро опустится ночь…</p>
    </Stage>
  );
}

const SPARK_COLORS = ["#f3d27a", "#d4af37", "#c0151f", "#fff3c4", "#8b6b12"];
const SPARKS = Array.from({ length: 36 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  d: `${2.8 + ((i * 7) % 20) / 10}s`,
  delay: `${((i * 13) % 30) / 10}s`,
  color: SPARK_COLORS[i % SPARK_COLORS.length]
}));

export function Ended({ winner, winners = [], mvp, players = [], myId, earned, isMayor, mvpShown, playAgainState, onPlayAgain }) {
  const iWon = winners.includes(myId);
  return (
    <Stage tone="noir">
      {(iWon || isMayor) && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {SPARKS.map((s, i) => (
            <span key={i} className="spark" style={{ left: s.left, background: s.color, "--d": s.d, "--delay": s.delay }} />
          ))}
        </div>
      )}
      <div className="w-full max-w-4xl text-center">
        <p className="eyebrow anim-fade-in">Игра окончена</p>
        <h1 className="mt-3 font-display text-5xl font-black sm:text-7xl anim-blur-in">
          <span className="gold-text">{winner?.label || "Финал"}</span>
        </h1>
        {winner?.reason && <p className="mt-3 text-[#c9b48f]">{winner.reason}</p>}
        {!isMayor && (
          <p className={`mt-5 inline-block rounded-full px-6 py-2 font-display text-2xl font-black anim-pop ${iWon ? "bg-emerald-900/40 text-emerald-300" : "bg-red-950/50 text-red-300"}`} style={{ "--i": 4 }}>
            {iWon ? "Вы победили!" : "Вы проиграли"}
          </p>
        )}
        {earned > 0 && <p className="mt-3 font-bold text-[#f3d27a] anim-fade-up">+{earned} Токенов на ваш счёт</p>}

        {mvp && (
          <div className="mt-10 flex flex-col items-center anim-fade-up" style={{ "--i": 6 }}>
            <div className="relative">
              <FontAwesomeIcon icon={faCrown} className="absolute -top-8 left-1/2 -translate-x-1/2 text-3xl text-[#f3d27a] anim-float" />
              <div className="rounded-full bg-gradient-to-br from-[#fff3c4] via-[#d4af37] to-[#8b6b12] p-1 shadow-[0_0_50px_rgba(212,175,55,0.6)]">
                <Avatar src={mvp.avatar} size={110} ring={false} />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-[#f3e5ab]">{mvp.name}</p>
            <p className="eyebrow mt-1 !text-[#f3d27a] anim-flicker">Игрок матча</p>
          </div>
        )}

        {/* Раскрытие ролей */}
        <div className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {players.map((p, i) => {
            const r = roleById(p.role);
            const won = winners.includes(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left anim-scale-in ${won ? "border-[#d4af37]/60 bg-[#d4af37]/10" : "border-white/10 bg-black/30"} ${p.alive ? "" : "opacity-60"}`}
                style={{ "--i": i + 8 }}
              >
                {r ? <img src={r.image} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <Avatar src={p.avatar} size={44} />}
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[#f3e5ab]">
                    {p.name} {!p.alive && "☠"}
                  </div>
                  <div className="truncate text-[11px] text-[#a8916c]">{r?.name || "—"}</div>
                </div>
                {won && <FontAwesomeIcon icon={faCrown} className="ml-auto text-xs text-[#f3d27a]" />}
              </div>
            );
          })}
        </div>

        <div className="mt-10 pb-6">
          {isMayor ? (
            mvpShown ? (
              <button type="button" disabled={playAgainState === "sending"} onClick={onPlayAgain} className="btn btn-blood btn-lg btn-pulse">
                {playAgainState === "sending" ? "Отправляем…" : "Играть снова"}
              </button>
            ) : (
              <p className="text-sm text-[#a8916c] animate-pulse">Подводим итоги…</p>
            )
          ) : (
            <p className="text-sm text-[#a8916c]">Мэр может начать новую партию в этой же комнате</p>
          )}
        </div>
      </div>
    </Stage>
  );
}

export function WaitingReady({ myRole, readyCount, total, readySent, onReady, isMayor, team }) {
  const r = roleById(myRole);
  return (
    <Stage tone="noir">
      {isMayor ? (
        <>
          <FontAwesomeIcon icon={faCrown} className="text-5xl text-[#f3d27a] anim-float" />
          <h1 className="mt-4 font-display text-4xl font-black gold-text anim-blur-in">Роли розданы</h1>
          <p className="mt-2 text-[#c9b48f]">Игроки знакомятся со своими картами</p>
        </>
      ) : (
        r && (
          <>
            <p className="eyebrow anim-fade-in">Ваша роль</p>
            <img src={r.image} alt={r.name} className="mt-4 aspect-[2/3] w-44 rounded-3xl object-cover ring-2 ring-[#f3d27a]/70 shadow-[0_0_60px_-10px_rgba(212,175,55,0.7)] anim-pop" />
            <h1 className="mt-4 font-display text-4xl font-black gold-text">{r.name}</h1>
            <p className="mt-2 max-w-md text-center text-sm text-[#c9b48f]">{r.description}</p>
            {team && team.length > 1 && (
              <p className="mt-3 rounded-full bg-red-950/50 px-4 py-1.5 text-sm text-red-200">
                Ваша семья: {team.map((m) => `${m.name} (${m.roleName})`).join(", ")}
              </p>
            )}
          </>
        )
      )}
      <div className="mt-8 flex flex-col items-center gap-3">
        {!isMayor && (
          <button type="button" disabled={readySent} onClick={onReady} className={`btn btn-lg ${readySent ? "btn-ghost" : "btn-gold btn-pulse"}`}>
            {readySent ? "Ждём остальных…" : "Я запомнил роль"}
          </button>
        )}
        <p className="text-sm text-[#a8916c]">
          Готовы: <b className="text-[#f3d27a]">{readyCount}</b>
          {total ? ` / ${total}` : ""}
        </p>
      </div>
    </Stage>
  );
}
