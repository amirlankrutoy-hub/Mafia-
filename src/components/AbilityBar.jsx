import React, { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWandMagicSparkles, faXmark, faArrowLeft, faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { socket } from "../socket";
import ABILITIES from "../data/abilities";
import { getOwnedAbilities, consumeAbility } from "../services/abilitiesShop";
import { toast } from "../services/toast";
import Avatar from "./ui/Avatar";

/**
 * Способности в игре. Если мэр их разрешил, живой игрок видит кнопку
 * «Способность» с теми способностями из своего набора (купленными в магазине),
 * которые подходят к фазе: дневные — на голосовании, ночные — ночью.
 * За игру можно использовать только одну способность; заряд списывается.
 */
export default function AbilityBar({ phase, roomCode, players = [] }) {
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [owned, setOwned] = useState(getOwnedAbilities());

  const refresh = useCallback(() => {
    socket.emit("ability:state", { roomCode }, (res) => setState(res || null));
  }, [roomCode]);

  useEffect(() => {
    refresh();
    // сервер открывает фазу чуть позже смены экрана — переспросим
    const t = setTimeout(refresh, 800);
    socket.on("ability-window", refresh);
    socket.on("connect", refresh);
    return () => {
      clearTimeout(t);
      socket.off("ability-window", refresh);
      socket.off("connect", refresh);
    };
  }, [refresh, phase]);

  useEffect(() => {
    const onOwned = () => setOwned(getOwnedAbilities());
    window.addEventListener("mafia-abilities-changed", onOwned);
    return () => window.removeEventListener("mafia-abilities-changed", onOwned);
  }, []);

  useEffect(() => {
    setOpen(false);
    setPendingTarget(null);
  }, [phase]);

  if (!state?.enabled || !state.alive || state.phase !== phase || state.usedInGame) return null;

  // только способности из своего набора
  const list = ABILITIES.filter((a) => a.type === phase && (owned[a.id] || 0) > 0);
  if (!list.length) return null;

  const activate = (ability, targetId) => {
    if (busy) return;
    setBusy(true);
    socket.emit("ability:activate", { roomCode, abilityId: ability.id, targetId }, (res) => {
      setBusy(false);
      if (!res?.success) {
        toast({ kind: "error", text: res?.message || "Не удалось использовать способность" });
        refresh();
        return;
      }
      consumeAbility(ability.id);
      toast({
        kind: "success",
        title: `${ability.name}: активировано`,
        text: res.info || undefined,
        duration: res.info ? 12000 : 5000
      });
      setOpen(false);
      setPendingTarget(null);
      refresh();
    });
  };

  const targets = players.filter((p) => p.alive !== false && p.id !== socket.id);

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="ability-launch fixed bottom-4 right-4 z-[650]">
          <span className="ability-launch__icon">
            <FontAwesomeIcon icon={faWandMagicSparkles} />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm font-black">Способность</span>
            <span className="text-[10px] font-bold opacity-75">1 раз за игру</span>
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[690] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div className="ability-sheet w-full max-w-lg anim-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              {pendingTarget ? (
                <button type="button" onClick={() => setPendingTarget(null)} className="text-[#a8916c] hover:text-[#f3e5ab]" aria-label="Назад">
                  <FontAwesomeIcon icon={faArrowLeft} />
                </button>
              ) : (
                <span className="ability-sheet__phase">
                  <FontAwesomeIcon icon={phase === "day" ? faSun : faMoon} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl font-black text-[#f3e5ab]">
                  {pendingTarget ? pendingTarget.name : phase === "day" ? "Дневные способности" : "Ночные способности"}
                </h3>
                <p className="text-[11px] text-[#a8916c]">
                  {pendingTarget
                    ? "Выберите игрока"
                    : "За игру можно использовать только одну способность — выбирайте с умом"}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-[#a8916c] hover:text-[#f3e5ab]" aria-label="Закрыть">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {pendingTarget ? (
              <div className="mt-4 grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {targets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => activate(pendingTarget, p.id)}
                    className="ability-target"
                  >
                    <Avatar src={p.avatar} size={48} />
                    <span className="mt-1.5 w-full truncate text-xs font-bold text-[#f3e5ab]">{p.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {list.map((a) => {
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={busy}
                      onClick={() => (a.needsTarget ? setPendingTarget(a) : activate(a))}
                      className="ability-option"
                    >
                      <span className="ability-option__icon">
                        <FontAwesomeIcon icon={a.icon} />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-sm font-black text-[#f3e5ab]">{a.name}</span>
                        <span className="block text-[11px] leading-snug text-[#a8916c]">{a.description}</span>
                      </span>
                      <span className="chip !text-[9px]">×{owned[a.id] || 0}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
