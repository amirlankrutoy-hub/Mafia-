import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSmile, faXmark } from "@fortawesome/free-solid-svg-icons";
import { EMOJIS } from "../data/shopData";
import { ownsEmoji } from "../services/wallet";
import AnimatedEmoji from "./AnimatedEmoji";

const RECENT_KEY = "mafia_recent_emojis_v1";
const COOLDOWN_MS = 900; // сервер принимает не чаще раза в 800 мс

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Круглая кнопка эмодзи (рядом с чатом). Открывает сетку: сверху — недавние,
 * ниже — все купленные. После отправки — короткая полоска перезарядки.
 */
export default function EmojiButton({ onSend, className = "bottom-28 right-24" }) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(readRecent);
  const [cooling, setCooling] = useState(false);
  const [sentKey, setSentKey] = useState(0);
  const boxRef = useRef(null);
  const owned = EMOJIS.filter((e) => ownsEmoji(e.id));
  const recentList = recent.map((id) => owned.find((e) => e.id === id)).filter(Boolean).slice(0, 6);

  // Закрываем по клику вне панели
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const send = (emoji) => {
    if (cooling) return;
    onSend?.(emoji.id);
    const next = [emoji.id, ...recent.filter((id) => id !== emoji.id)].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch (_) {}
    setCooling(true);
    setSentKey((k) => k + 1);
    setTimeout(() => setCooling(false), COOLDOWN_MS);
  };

  const Cell = ({ e, big }) => (
    <button
      type="button"
      onClick={() => send(e)}
      disabled={cooling}
      title="Отправить"
      className={`flex aspect-square items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/5 transition hover:scale-110 hover:bg-[#d4af37]/15 hover:ring-[#d4af37]/50 active:scale-90 disabled:opacity-50 ${
        big ? "text-3xl" : "text-2xl"
      }`}
    >
      <AnimatedEmoji id={e.id} symbol={e.symbol} />
    </button>
  );

  return (
    <div ref={boxRef} className={`fixed z-[660] ${className}`}>
      {open && (
        <div
          className="noir-card fixed inset-x-3 bottom-[11.5rem] p-3 anim-scale-in sm:absolute sm:inset-x-auto sm:bottom-[4.25rem] sm:right-0 sm:w-[320px]"
          style={{ transformOrigin: "bottom right" }}
        >
          <div className="flex items-center justify-between px-1">
            <span className="eyebrow !text-[0.6rem]">Эмодзи</span>
            <button onClick={() => setOpen(false)} className="p-1 text-[#a8916c] hover:text-[#f3d27a]" aria-label="Закрыть">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          {owned.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-[#a8916c]">
              У вас пока нет эмодзи.
              <Link to="/shop" className="btn btn-gold btn-sm mt-3 w-full">В магазин</Link>
            </div>
          ) : (
            <>
              {recentList.length > 0 && (
                <>
                  <p className="mt-2 px-1 text-[10px] font-bold uppercase tracking-wider text-[#a8916c]">Недавние</p>
                  <div className="mt-1.5 grid grid-cols-6 gap-1.5">
                    {recentList.map((e) => (
                      <Cell key={e.id} e={e} big />
                    ))}
                  </div>
                </>
              )}
              <p className="mt-3 px-1 text-[10px] font-bold uppercase tracking-wider text-[#a8916c]">Все</p>
              <div className="mt-1.5 grid max-h-44 grid-cols-6 gap-1.5 overflow-y-auto pr-0.5">
                {owned.map((e) => (
                  <Cell key={e.id} e={e} />
                ))}
              </div>
            </>
          )}

          {/* Полоска перезарядки после отправки */}
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/5">
            {cooling && (
              <div
                key={sentKey}
                className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#f3d27a]"
                style={{ animation: `emojiCooldown ${COOLDOWN_MS}ms linear both` }}
              />
            )}
          </div>
          <style>{`@keyframes emojiCooldown { from { width: 100% } to { width: 0% } }`}</style>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Эмодзи"
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)] ring-2 transition hover:scale-110 active:scale-95 ${
          open ? "bg-[#d4af37] text-black ring-[#f3d27a]" : "bg-[#1c100b] text-[#f3d27a] ring-[#d4af37]/60"
        }`}
      >
        {recentList[0] && !open ? (
          <AnimatedEmoji id={recentList[0].id} symbol={recentList[0].symbol} />
        ) : (
          <FontAwesomeIcon icon={faFaceSmile} />
        )}
      </button>
    </div>
  );
}
