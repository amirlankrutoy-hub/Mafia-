import { useState } from "react";

export default function PlayerNight({ step, targets = [], onAction, onDone }) {
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(step?.modes ? null : "default");
  const [done, setDone] = useState(false);

  const needMode = step?.modes?.length > 0;

  const submit = () => {
    if (!selected) return;
    if (needMode && !mode) return;
    onAction(selected, mode === "default" ? null : mode);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#0a0503] flex flex-col items-center p-8 overflow-y-auto">
      <h2 className="text-4xl text-yellow-400 font-bold mb-2">
        {step?.label || "Ночь"}
      </h2>
      <p className="text-gray-400 mb-6">Выберите цель</p>

      {needMode && (
        <div className="flex gap-4 mb-6">
          {step.modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-6 py-3 rounded-xl font-bold ${
                mode === m
                  ? "bg-yellow-500 text-black"
                  : "bg-zinc-800 text-white"
              }`}
            >
              {m === "check" ? "Проверить" : "Убить"}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full">
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            className={`rounded-2xl border-2 p-4 bg-[#1c100b] ${
              selected === t.id ? "border-yellow-400" : "border-yellow-800"
            }`}
          >
            <img
              src={t.avatar || "/avatars/avatar1.svg"}
              alt=""
              className="w-full h-28 object-cover rounded-xl mb-2"
            />
            <p className="text-white font-bold">{t.name}</p>
          </button>
        ))}
      </div>

      {!done ? (
        <button
          type="button"
          disabled={!selected || (needMode && !mode)}
          onClick={submit}
          className="mt-8 bg-red-700 disabled:bg-gray-700 text-white px-10 py-4 rounded-xl text-xl font-bold"
        >
          Подтвердить
        </button>
      ) : (
        <button
          type="button"
          onClick={onDone}
          className="mt-8 bg-yellow-600 text-black px-10 py-4 rounded-xl text-xl font-bold"
        >
          Следующий →
        </button>
      )}
    </div>
  );
}