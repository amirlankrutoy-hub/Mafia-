import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faMoon, faSun, faForward, faScaleBalanced, faSkull, faFlag } from "@fortawesome/free-solid-svg-icons";
import roles from "../../data/roles";
import Avatar from "../../components/ui/Avatar";
import Modal from "../../components/ui/Modal";
import { ResultList, Stage } from "./screens";

const PHASE_TITLE = {
  waiting_ready: "Раздача ролей",
  night: "Ночь",
  night_wait: "Ночь",
  night_end: "Ночь подходит к концу",
  morning: "Утро",
  loading: "Переход…"
};

export default function MayorPanel({
  roomCode,
  phase,
  players = [],
  nightInfo,
  nightProgress,
  morningResults = [],
  readyCount,
  onBeginNight,
  onMorning,
  onBeginVote,
  onNextNight,
  onKill,
  onForceWin
}) {
  const [killOpen, setKillOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const alive = players.filter((p) => p.alive !== false);
  const tone = phase === "morning" ? "morning" : phase === "waiting_ready" ? "noir" : "night";

  return (
    <Stage tone={tone} className="!items-start">
      <div className="w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f6dc8f] to-[#8b6b12] text-xl text-black shadow-[0_0_25px_rgba(212,175,55,0.5)]">
              <FontAwesomeIcon icon={faCrown} />
            </span>
            <div>
              <p className="eyebrow !text-[0.6rem]">Панель мэра · {roomCode}</p>
              <h1 className="font-display text-3xl font-black gold-text">{PHASE_TITLE[phase] || phase}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setKillOpen(true)} className="btn btn-danger btn-sm">
              <FontAwesomeIcon icon={faSkull} /> Устранить
            </button>
            <button onClick={() => setWinOpen(true)} className="btn btn-ghost btn-sm">
              <FontAwesomeIcon icon={faFlag} /> Завершить
            </button>
          </div>
        </div>

        {/* Главное действие фазы */}
        <div className="noir-card mt-6 p-6 text-center anim-fade-up">
          {phase === "waiting_ready" && (
            <>
              <p className="text-[#c9b48f]">
                Игроки запоминают роли: готовы <b className="text-[#f3d27a]">{readyCount}</b> из {alive.length}
              </p>
              <p className="mt-1 text-xs text-[#a8916c]">Ночь начнётся сама, когда все будут готовы</p>
              <button onClick={onBeginNight} className="btn btn-blood btn-lg mt-5">
                <FontAwesomeIcon icon={faMoon} /> Начать ночь сейчас
              </button>
            </>
          )}

          {(phase === "night" || phase === "night_wait") && nightInfo && (
            <>
              <p className="eyebrow">Ночь {nightInfo.night}</p>
              <h2 className="mt-2 font-display text-3xl font-black text-[#c9d3f5]">Ходит: {nightInfo.step?.label}</h2>
              <p className="mt-2 text-sm text-[#a8916c]">
                {nightProgress
                  ? `Сделали выбор: ${nightProgress.acted} из ${nightProgress.total}`
                  : `Игроков в этом ходе: ${nightInfo.actorsCount ?? "?"}`}
              </p>
              <div className="progress-run mx-auto mt-4 h-1 w-56 rounded-full" />
              <button onClick={onNextNight} className="btn btn-ghost btn-sm mt-5">
                <FontAwesomeIcon icon={faForward} /> Пропустить ход (если игрок не отвечает)
              </button>
            </>
          )}

          {phase === "night_end" && (
            <>
              <h2 className="font-display text-3xl font-black text-[#c9d3f5]">Эта ночь будет весёлой…</h2>
              <p className="mt-2 text-sm text-[#a8916c]">Итоги ночи (видите только вы):</p>
              <div className="mt-4 flex justify-center">
                <ResultList results={morningResults} />
              </div>
              <button onClick={onMorning} className="btn btn-gold btn-lg btn-pulse mt-6">
                <FontAwesomeIcon icon={faSun} /> Наступает утро
              </button>
            </>
          )}

          {phase === "morning" && (
            <>
              <div className="flex justify-center">
                <ResultList results={morningResults} />
              </div>
              <p className="mt-4 text-sm text-[#a8916c]">Дайте городу обсудить ночь, затем начните суд</p>
              <button onClick={onBeginVote} className="btn btn-blood btn-lg btn-pulse mt-4">
                <FontAwesomeIcon icon={faScaleBalanced} /> Начать голосование
              </button>
            </>
          )}

          {phase === "loading" && <p className="text-[#c9b48f] animate-pulse">Город готовится…</p>}
        </div>

        {/* Игроки */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {players.map((p, i) => {
            const r = roles.find((x) => x.id === p.role);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 anim-scale-in ${
                  p.alive === false ? "border-red-900/50 bg-red-950/20 opacity-60" : "border-white/10 bg-black/35"
                }`}
                style={{ "--i": i }}
              >
                <Avatar src={p.avatar} size={36} online={p.alive !== false ? p.connected !== false : undefined} />
                <div className="min-w-0">
                  <div className={`truncate text-sm font-bold ${p.alive === false ? "text-red-300 line-through" : "text-[#f3e5ab]"}`}>{p.name}</div>
                  <div className="text-[10px] text-[#a8916c]">{p.alive === false ? (r ? `☠ ${r.name}` : "☠ выбыл") : p.connected === false ? "не в сети" : "жив"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={killOpen} onClose={() => setKillOpen(false)}>
        <h3 className="font-display text-2xl font-black blood-text">Устранить игрока</h3>
        <p className="mt-1 text-xs text-[#a8916c]">Например, за нарушение правил. Причину увидят все.</p>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="input-noir mt-4">
          <option value="">Выберите игрока…</option>
          {alive.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина (обязательно)" className="input-noir mt-3" />
        <button
          disabled={!target || !reason.trim()}
          onClick={() => {
            onKill(target, reason.trim());
            setKillOpen(false);
            setTarget("");
            setReason("");
          }}
          className="btn btn-blood mt-4 w-full"
        >
          Устранить
        </button>
      </Modal>

      <Modal open={winOpen} onClose={() => setWinOpen(false)}>
        <h3 className="font-display text-2xl font-black gold-text">Досрочно завершить игру</h3>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина" className="input-noir mt-4" />
        <div className="mt-4 grid gap-2">
          {[
            ["town", "Победа мирных", "btn-gold"],
            ["mafia", "Победа мафии", "btn-blood"],
            ["neutral", "Победа нейтралов", "btn-ghost"]
          ].map(([side, label, cls]) => (
            <button
              key={side}
              onClick={() => {
                onForceWin(side, reason.trim() || "Решение мэра");
                setWinOpen(false);
              }}
              className={`btn ${cls} w-full`}
            >
              {label}
            </button>
          ))}
        </div>
      </Modal>
    </Stage>
  );
}
