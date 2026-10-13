import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faXmark, faPaperPlane, faUserSecret, faCrown } from "@fortawesome/free-solid-svg-icons";
import { socket } from "../socket";

/**
 * Чат комнаты.
 * channels: [{ id: "room" | "mafia", label, disabledReason? }]
 * Общий канал — лобби и голосование, "mafia" — личный канал мафии во время игры.
 */
export default function ChatPanel({ roomCode, channels, className = "bottom-24 right-4" }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState(channels[0]?.id || "room");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState({});
  const listRef = useRef(null);
  const openRef = useRef(open);
  const channelRef = useRef(channel);
  openRef.current = open;
  channelRef.current = channel;

  // Канал исчез (например, напарник по мафии погиб) — переключаемся на доступный
  useEffect(() => {
    if (!channels.some((c) => c.id === channel)) setChannel(channels[0]?.id || "room");
  }, [channels, channel]);

  useEffect(() => {
    if (!roomCode) return;
    socket.emit("chat:history", roomCode, (list) => setMessages((prev) => (prev.length ? prev : list || [])));
    const onMsg = (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m].slice(-120)));
      if (!openRef.current || channelRef.current !== m.channel) {
        if (m.fromId !== socket.id) setUnread((u) => ({ ...u, [m.channel]: (u[m.channel] || 0) + 1 }));
      }
    };
    socket.on("chat:message", onMsg);
    return () => socket.off("chat:message", onMsg);
  }, [roomCode]);

  useEffect(() => {
    if (open) setUnread((u) => ({ ...u, [channel]: 0 }));
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, channel, messages]);

  const visible = messages.filter((m) => m.channel === channel);
  const current = channels.find((c) => c.id === channel);
  const totalUnread = channels.reduce((s, c) => s + (unread[c.id] || 0), 0);
  const isMafia = channel === "mafia";

  const send = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    socket.emit("chat:send", { roomCode, text: value, channel }, (res) => {
      if (res?.success) {
        setText("");
        setError("");
      } else setError(res?.message || "Не отправлено");
    });
  };

  if (!channels.length) return null;

  return (
    <div className={`fixed z-[660] ${className}`}>
      {open ? (
        <div className="noir-card flex h-[min(70vh,460px)] w-[min(92vw,360px)] flex-col overflow-hidden anim-scale-in" style={{ transformOrigin: "bottom right" }}>
          <div className="flex items-center gap-2 border-b border-[#d4af37]/15 p-2.5">
            <div className="tabs flex-1 !p-1">
              {channels.map((c) => (
                <button key={c.id} type="button" className="tab !px-3 !py-1.5" aria-selected={channel === c.id} onClick={() => setChannel(c.id)}>
                  {c.id === "mafia" && <FontAwesomeIcon icon={faUserSecret} className="mr-1" />}
                  {c.label}
                  {unread[c.id] > 0 && channel !== c.id && (
                    <span className="ml-1 rounded-full bg-[#c0151f] px-1.5 text-[9px] text-white">{unread[c.id]}</span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 text-[#a8916c] hover:text-[#f3d27a]" aria-label="Закрыть чат">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          {isMafia && (
            <p className="bg-red-950/40 px-3 py-1.5 text-center text-[11px] text-red-200">Видят только члены вашей семьи</p>
          )}

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {visible.length === 0 && <p className="pt-10 text-center text-xs text-[#a8916c]">Сообщений пока нет. Напишите первым!</p>}
            {visible.map((m) => {
              const mine = m.fromId === socket.id;
              return (
                <div key={m.id} className={`flex gap-2 anim-fade-up ${mine ? "flex-row-reverse" : ""}`}>
                  <img src={m.avatar || "/avatars/avatar1.svg"} alt="" className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-[#d4af37]/40" />
                  <div className={`max-w-[78%] ${mine ? "text-right" : ""}`}>
                    <div className="text-[10px] font-bold text-[#a8916c]">
                      {m.isMayor && <FontAwesomeIcon icon={faCrown} className="mr-1 text-[#f3d27a]" />}
                      {mine ? "Вы" : m.name}
                    </div>
                    <div
                      translate="no"
                      className={`inline-block break-words rounded-2xl px-3 py-1.5 text-left text-sm ${
                        isMafia
                          ? "bg-red-900/50 text-red-50 ring-1 ring-red-500/30"
                          : mine
                          ? "bg-[#d4af37]/20 text-[#f3e5ab] ring-1 ring-[#d4af37]/30"
                          : "bg-black/40 text-[#e6d5bc] ring-1 ring-white/5"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={send} className="border-t border-[#d4af37]/15 p-2.5">
            {(error || current?.disabledReason) && (
              <p className="mb-1.5 px-1 text-[11px] text-red-300">{current?.disabledReason || error}</p>
            )}
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
                disabled={!!current?.disabledReason}
                placeholder={isMafia ? "Шепнуть семье…" : "Сообщение…"}
                className="input-noir !py-2 text-sm"
              />
              <button type="submit" disabled={!text.trim() || !!current?.disabledReason} className={`btn btn-icon shrink-0 !rounded-xl ${isMafia ? "btn-blood" : "btn-gold"}`}>
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#f6dc8f] to-[#a8841e] text-xl text-[#1a0f05] shadow-[0_10px_30px_-8px_rgba(212,175,55,0.8)] transition hover:scale-110 active:scale-95"
          aria-label="Открыть чат"
        >
          <FontAwesomeIcon icon={faComments} />
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c0151f] px-1 text-[10px] font-black text-white ring-2 ring-[#0a0605] anim-pop">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
