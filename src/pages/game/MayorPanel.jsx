import { useState } from "react";

export default function MayorPanel({
  roomCode,
  phase,
  players = [],
  nightInfo,
  morningResults = [],
  readyCount,
  onBeginNight,
  onMorning,
  onBeginVote,
  onNextNight,
  onKill,
  onForceWin
}) {
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");

  if (phase === "night_end") {
    return (
      <div
        className="fixed inset-0 z-[300] overflow-hidden flex flex-col items-center justify-center text-center px-8"
        style={{
          background:
            "linear-gradient(180deg, #05070f 0%, #0c1224 55%, #05070f 100%)"
        }}
      >
        <style>{`
          @keyframes driftCloud1 { from { transform: translateX(-20%); } to { transform: translateX(120%); } }
          @keyframes driftCloud2 { from { transform: translateX(-30%); } to { transform: translateX(130%); } }
          @keyframes driftCloud3 { from { transform: translateX(-15%); } to { transform: translateX(115%); } }
        `}</style>

        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div
            className="absolute top-[15%] w-72 h-16 bg-white/40 rounded-full blur-2xl"
            style={{ animation: "driftCloud1 38s linear infinite" }}
          />
          <div
            className="absolute top-[35%] w-96 h-20 bg-white/30 rounded-full blur-2xl"
            style={{ animation: "driftCloud2 52s linear infinite" }}
          />
          <div
            className="absolute top-[60%] w-64 h-14 bg-white/25 rounded-full blur-2xl"
            style={{ animation: "driftCloud3 45s linear infinite" }}
          />
        </div>

        <h1
          className="relative text-3xl md:text-5xl text-yellow-200 font-black mb-12"
          style={{ textShadow: "0 0 25px rgba(255,255,255,0.25)" }}
        >
          Эта ночь будет весёлой...
        </h1>

        <button
          type="button"
          onClick={onMorning}
          className="relative bg-yellow-500 hover:bg-yellow-400 text-black px-10 py-4 rounded-xl text-xl font-bold"
        >
          Наступает утро
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-[#0a0503] text-white overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl text-yellow-400 font-black mb-2">Панель мэра</h1>
        <p className="text-gray-400 mb-6">
          Комната {roomCode} · фаза: {phase}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {players.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border p-3 ${
                p.alive === false
                  ? "opacity-40 border-red-900"
                  : "border-yellow-700"
              }`}
            >
              <p className="font-bold">{p.name}</p>
              <p className="text-xs text-gray-500">
                {p.alive === false ? "мёртв" : "жив"}
              </p>
            </div>
          ))}
        </div>

        {phase === "waiting_ready" && (
          <div className="mb-6">
            <p className="text-xl mb-2">
              Готовность игроков: {readyCount}
            </p>
            <button
              type="button"
              onClick={onBeginNight}
              className="mt-4 bg-red-800 px-6 py-3 rounded-xl font-bold"
            >
              Начать ночь
            </button>
          </div>
        )}

        {phase === "night" && nightInfo && (
          <div className="mb-6 border border-yellow-700 rounded-2xl p-6">
            <h2 className="text-2xl text-yellow-400 mb-2">
              Ход: {nightInfo.step?.label}
            </h2>
            <p className="text-gray-400 mb-4">
              Ходят:{" "}
              {(nightInfo.actors || [])
                .map((a) => a.name || a.id)
                .join(", ")}
            </p>
            <button
              type="button"
              onClick={onNextNight}
              className="bg-yellow-600 text-black px-6 py-3 rounded-xl font-bold"
            >
              Следующий ход →
            </button>
          </div>
        )}

        {phase === "morning" && (
          <div className="mb-6">
            <h2 className="text-2xl text-yellow-400 mb-3">Результаты ночи</h2>
            <ul className="space-y-1 mb-4">
              {morningResults.map((r, i) => (
                <li key={i}>{r.text}</li>
              ))}
              {morningResults.length === 0 && (
                <li className="text-gray-400">Ночь прошла спокойно</li>
              )}
            </ul>
            <button
              type="button"
              onClick={onBeginVote}
              className="bg-red-700 px-8 py-4 rounded-xl font-bold"
            >
              Начать голосование
            </button>
          </div>
        )}

        <div className="mt-12 border border-red-900 rounded-2xl p-6 bg-black/50">
          <h3 className="text-xl text-red-400 font-bold mb-4">
            Полномочия мэра
          </h3>
          <input
            className="w-full mb-3 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2"
            placeholder="Причина (обязательно)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <select
            className="w-full mb-3 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Игрок...</option>
            {players
              .filter((p) => p.alive !== false)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!target || !reason}
              onClick={() => onKill(target, reason)}
              className="bg-red-800 px-4 py-2 rounded-lg disabled:opacity-40"
            >
              Ликвидировать
            </button>
            <button
              type="button"
              onClick={() => onForceWin("town", reason)}
              className="bg-green-800 px-4 py-2 rounded-lg"
            >
              Победа жителей
            </button>
            <button
              type="button"
              onClick={() => onForceWin("mafia", reason)}
              className="bg-red-900 px-4 py-2 rounded-lg"
            >
              Победа мафии
            </button>
            <button
              type="button"
              onClick={() => onForceWin("neutral", reason)}
              className="bg-purple-900 px-4 py-2 rounded-lg"
            >
              Победа нейтрала
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}