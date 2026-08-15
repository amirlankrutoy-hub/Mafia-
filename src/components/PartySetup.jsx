import { useMemo, useState } from "react";
import roles from "../data/roles";
import { ROLE_PRICES } from "../data/shopData";
import { ownsRole } from "../services/wallet";

export default function PartySetup({
    players,
    onStart
}) {

    const [selectedRoles, setSelectedRoles] = useState({});
    const [abilitiesEnabled, setAbilitiesEnabled] = useState(true);

    const totalSelected = useMemo(() => {

        return Object.values(selectedRoles).reduce(
            (sum, value) => sum + value,
            0
        );

    }, [selectedRoles]);

    function increase(roleId) {

        setSelectedRoles(prev => ({
            ...prev,
            [roleId]: (prev[roleId] || 0) + 1
        }));

    }

    function decrease(roleId) {

        setSelectedRoles(prev => ({

            ...prev,

            [roleId]: Math.max(
                0,
                (prev[roleId] || 0) - 1
            )

        }));

    }

    return (
  <div className="fixed inset-0 z-[200] bg-black overflow-y-auto">
    <div className="max-w-7xl mx-auto p-10 text-white">

      <h1 className="text-5xl font-black text-center text-yellow-400">
        ⚙ Настройка партии
      </h1>

      <div className="mt-10 flex justify-between text-2xl">
        <div>
          Игроков:
          <span className="text-yellow-400 ml-2">{players.length}</span>
        </div>
        <br />
        <div>
          Выбрано ролей:
          <span
            className={`ml-2 font-bold ${
              totalSelected === players.length
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {totalSelected}/{players.length}
          </span>
        </div>
      </div>

      {/* сетка ролей — как была */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mt-12">
        {roles.map(role => {
          const owned = ownsRole(role.id);
          return (
          <div
            key={role.id}
            className="relative rounded-2xl overflow-hidden border border-yellow-500 bg-[#111]"
          >
            <img
              src={role.image}
              alt={role.name}
              className={`w-full h-80 object-cover ${owned ? "" : "opacity-30 grayscale"}`}
            />
            {!owned && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
                <span className="text-6xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">🔒</span>
                <span className="rounded-md bg-black/70 border border-yellow-500/60 px-3 py-1 text-sm font-bold text-yellow-400">
                  {ROLE_PRICES[role.id] ?? 0}{" "}<img src="/mafio.png" alt="" className="inline h-4 w-4 object-contain align-[-2px]" /> — купить в магазине
                </span>
              </div>
            )}
            <div className="p-4">
              <h2 className="text-2xl font-bold">{role.name}</h2>
              <p className="text-gray-300 mt-2 text-sm">{role.team}</p>

              <div className="flex justify-between items-center mt-6">
                <button
                  type="button"
                  onClick={() => decrease(role.id)}
                  disabled={!owned}
                  className="w-12 h-12 rounded-full bg-red-700 text-2xl disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span className="text-3xl font-bold">
                  {selectedRoles[role.id] || 0}
                </span>
                <button
                  type="button"
                  onClick={() => increase(role.id)}
                  disabled={!owned}
                  className="w-12 h-12 rounded-full bg-green-700 text-2xl disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4 mt-16 pb-10">
        <label className="flex items-center gap-3 bg-zinc-900/80 border border-yellow-700/40 rounded-xl px-5 py-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={abilitiesEnabled}
            onChange={(e) => setAbilitiesEnabled(e.target.checked)}
            className="w-5 h-5 accent-yellow-500"
          />
          <span className="text-sm font-bold text-gray-200">
            Разрешить способности в этой игре
          </span>
        </label>

        <button
          type="button"
          onClick={() => onStart(selectedRoles, abilitiesEnabled)}
          disabled={totalSelected !== players.length}
          className={`px-12 py-5 rounded-xl text-2xl font-bold transition ${
            totalSelected === players.length
              ? "bg-red-700 hover:bg-red-800"
              : "bg-gray-700 cursor-not-allowed"
          }`}
        >
          ▶ Начать игру
        </button>
      </div>
    </div>
  </div>
);
}