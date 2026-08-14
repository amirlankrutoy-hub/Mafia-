import React, { useEffect, useState } from "react";
import { socket } from "../../socket";
import ABILITIES from "../../data/abilities";
import { getOwnedAbilities, consumeAbility } from "../../services/abilitiesShop";

/**
 * Плавающая панель способностей — появляется на 10 секунд в начале
 * дневного голосования ("day") или ночи ("night").
 */
export default function AbilityBar({ phase, roomCode, players = [] }) {
  const [windowInfo, setWindowInfo] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [owned, setOwned] = useState(getOwnedAbilities());

  useEffect(() => {
    const onWindow = (info) => setWindowInfo(info);
    socket.on("ability-window", onWindow);
    return () => socket.off("ability-window", onWindow);
  }, []);

  useEffect(() => {
    const refresh = () => setOwned(getOwnedAbilities());
    window.addEventListener("mafia-abilities-changed", refresh);
    return () => window.removeEventListener("mafia-abilities-changed", refresh);
  }, []);

  useEffect(() => {
    if (!windowInfo) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((windowInfo.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setWindowInfo(null);
    };
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, [windowInfo]);

  const isOpen = windowInfo && windowInfo.phase === phase && secondsLeft > 0;
  const usable = ABILITIES.filter((a) => a.type === phase && (owned[a.id] || 0) > 0);

  if (!isOpen || !usable.length) return null;

  const activate = (ability, targetId) => {
    socket.emit(
      "ability:activate",
      { roomCode, abilityId: ability.id, targetId },
      (res) => {
        if (!res?.success) {
          alert(res?.message || "Не удалось использовать способность");
          return;
        }
        consumeAbility(ability.id);
        if (res.info) alert(res.info);
        setPendingTarget(null);
      }
    );
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[250] w-[min(92vw,480px)]">
      <div className="rounded-2xl border-2 border-[#d4af37] bg-[#0d0705]/95 backdrop-blur-md p-3 shadow-[0_0_30px_rgba(212,175,55,0.35)]">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
            Способности
          </span>
          <span className="text-xs font-mono text-[#f3e5ab]">{secondsLeft}с</span>
        </div>

        {pendingTarget ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <p className="text-[11px] text-[#c5a059] px-1">Выберите цель:</p>
            {players
              .filter((p) => p.alive !== false)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => activate(pendingTarget, p.id)}
                  className="w-full text-left px-3 py-1.5 rounded-lg bg-[#180e0a] border border-[#d4af37]/30 text-sm text-[#f3e5ab] hover:border-[#d4af37]"
                >
                  {p.name}
                </button>
              ))}
            <button
              onClick={() => setPendingTarget(null)}
              className="w-full text-center px-3 py-1 rounded-lg text-xs text-[#8b6b12]"
            >
              Отмена
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {usable.map((a) => (
              <button
                key={a.id}
                onClick={() => (a.needsTarget ? setPendingTarget(a) : activate(a))}
                title={a.description}
                className="rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] px-3 py-1.5 text-xs font-bold text-[#f3e5ab] border border-[#d4af37]/60"
              >
                {a.name} ({owned[a.id]})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
