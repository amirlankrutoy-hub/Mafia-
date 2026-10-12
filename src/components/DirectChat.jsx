import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { getDirectHistory, sendDirectMessage, onDirectMessage } from "../services/presence";
import { setActiveChat } from "../services/dm";
import Avatar from "./ui/Avatar";

function timeLabel(at) {
  const d = new Date(at);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Личная переписка с другом (только друзья могут писать друг другу)
export default function DirectChat({ friend, myId, onClose }) {
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setActiveChat(friend.id);
    getDirectHistory(friend.id).then((list) => setMessages(list || []));
    const off = onDirectMessage((m) => {
      if (m.from !== friend.id && m.to !== friend.id) return;
      setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
    });
    setTimeout(() => inputRef.current?.focus(), 200);
    return () => {
      off();
      setActiveChat(null);
    };
  }, [friend.id]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    const res = await sendDirectMessage(friend.id, value);
    if (!res?.success) {
      setText(value);
      setError(res?.message || "Не отправлено");
    } else setError("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[750] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm anim-fade-in" onClick={onClose} />
      <div className="noir-card relative flex h-[85vh] w-full max-w-lg flex-col overflow-hidden !rounded-b-none sm:h-[70vh] sm:!rounded-[22px] anim-fade-up">
        <div className="flex items-center gap-3 border-b border-[#d4af37]/15 p-4">
          <Avatar src={friend.icon} size={42} online={!!friend.online} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg font-bold text-[#f3e5ab]">{friend.name}</div>
            <div className="text-[11px] text-[#a8916c]">{friend.online ? "В сети" : "Не в сети — прочитает, когда зайдёт"}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[#a8916c] hover:text-[#f3d27a]" aria-label="Закрыть">
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages === null ? (
            <p className="pt-10 text-center text-sm text-[#a8916c] animate-pulse">Загрузка…</p>
          ) : messages.length === 0 ? (
            <p className="pt-10 text-center text-sm text-[#a8916c]">Напишите первое сообщение 👋</p>
          ) : (
            messages.map((m) => {
              const mine = m.from === myId;
              return (
                <div key={m.id} className={`flex anim-fade-up ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "rounded-br-md bg-gradient-to-br from-[#d4af37]/35 to-[#8b6b12]/30 text-[#f3e5ab] ring-1 ring-[#d4af37]/30"
                        : "rounded-bl-md bg-black/45 text-[#e6d5bc] ring-1 ring-white/5"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div className={`mt-0.5 text-[10px] ${mine ? "text-right text-[#f3d27a]/60" : "text-[#a8916c]/70"}`}>{timeLabel(m.at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={send} className="border-t border-[#d4af37]/15 p-3 safe-area-pb">
          {error && <p className="mb-1.5 px-1 text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Сообщение…"
              className="input-noir"
            />
            <button type="submit" disabled={!text.trim()} className="btn btn-gold btn-icon shrink-0 !rounded-xl">
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
