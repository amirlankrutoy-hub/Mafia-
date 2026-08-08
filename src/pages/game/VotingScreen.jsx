import { useEffect, useState } from "react";

export default function VotingScreen({
  players = [],
  endsAt,
  isMayor,
  blocked,
  round,
  onVote,
  onForceEnd
}) {
  const [left, setLeft] = useState(0);
  const [selected, setSelected] = useState(null);
  const [voted, setVoted] = useState(false);

  // Новый раунд (например переголосование) — сбрасываем локальный выбор
  useEffect(() => {
    setSelected(null);
    setVoted(false);
  }, [round, endsAt]);

  useEffect(() => {
    let finished = false;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setLeft(remaining);
      // Автозавершение по таймеру — только мэр
      if (remaining === 0 && endsAt && isMayor && onForceEnd && !finished) {
        finished = true;
        onForceEnd();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, isMayor, onForceEnd]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center p-8 overflow-y-auto">
      <h1 className="text-4xl text-yellow-400 font-black mb-2">
        {round === "runoff" ? "Переголосование" : "Голосование"}
      </h1>
      <p className="text-2xl text-red-400 font-mono mb-2">
        {mm}:{ss}
      </p>

      {round === "runoff" && (
        <p className="text-gray-400 mb-4 text-center max-w-md">
          Голоса разделились поровну — теперь выбирайте только среди этих
          игроков
        </p>
      )}

      {blocked && !isMayor && (
        <p className="text-red-500 font-bold mb-4">
          Ваш голос заблокирован Крёстным отцом
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={isMayor || blocked || voted}
            onClick={() => setSelected(p.id)}
            className={`rounded-2xl border-2 p-4 bg-[#1c100b] disabled:opacity-70 ${
              selected === p.id ? "border-yellow-400" : "border-yellow-800"
            }`}
          >
            <img
              src={p.avatar || "/avatars/avatar1.svg"}
              className="w-full h-28 object-cover rounded-xl mb-2"
              alt=""
            />
            <p className="text-white font-bold">{p.name}</p>
          </button>
        ))}
      </div>

      {!isMayor && !blocked && !voted && (
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            onVote(selected);
            setVoted(true);
          }}
          className="mt-8 bg-red-700 text-white px-10 py-4 rounded-xl text-xl font-bold disabled:bg-gray-700"
        >
          Голосовать
        </button>
      )}

      {!isMayor && voted && (
        <p className="mt-8 text-green-400 text-xl">Голос принят</p>
      )}

      {isMayor && (
        <button
          type="button"
          onClick={onForceEnd}
          className="mt-8 bg-yellow-600 text-black px-8 py-3 rounded-xl font-bold"
        >
          Завершить голосование
        </button>
      )}
    </div>
  );
}
