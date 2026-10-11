import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFaceSmile,
  faVolumeHigh,
  faVolumeXmark,
  faUserPlus,
  faCheck,
  faCopy,
  faLink,
  faCrown,
  faUserXmark,
  faPaperPlane,
  faRightFromBracket,
  faGear,
  faClock
} from "@fortawesome/free-solid-svg-icons";
import { EMOJIS, DECORATIONS, ADMIN_DECORATION } from "../data/shopData";
import { ownsEmoji } from "../services/wallet";
import { useMusic } from "../context/MusicContext";
import DecorationSVG from "./shop/DecorationSVG";
import { sendFriendRequest, getFriendsList, getFriendRequests, inviteFriend } from "../services/presence";
import { toast } from "../services/toast";
import Avatar from "./ui/Avatar";

const ALL_DECORATIONS = [...DECORATIONS, ADMIN_DECORATION];
const getDecoration = (id) => (id ? ALL_DECORATIONS.find((d) => d.id === id) || null : null);

function Seat({ p, i, emoji, isMe, isMayorView, friendState, onAddFriend, onKick }) {
  const decoration = getDecoration(p.decoration);
  return (
    <div
      className={`noir-card noir-card--flat spotlight relative flex flex-col items-center p-4 pt-6 text-center anim-scale-in ${
        p.ready ? "!shadow-[0_0_30px_-10px_rgba(52,211,153,0.6)]" : ""
      } ${p.connected === false ? "opacity-50" : ""}`}
      style={{ "--i": i }}
    >
      {emoji && (
        <span key={emoji.key} className="pointer-events-none absolute -top-4 right-3 z-20 text-3xl anim-pop">
          <span className="block animate-bounce">{emoji.symbol}</span>
        </span>
      )}
      <div className="relative">
        {decoration && (
          <div className="pointer-events-none absolute -top-5 left-1/2 z-20 -translate-x-1/2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            <DecorationSVG kind={decoration.kind} colors={decoration.colors} className="h-10 w-14" />
          </div>
        )}
        <div className={`rounded-full p-[2px] transition-all duration-500 ${p.ready ? "bg-gradient-to-br from-emerald-300 to-emerald-700" : "bg-[#d4af37]/30"}`}>
          <Avatar src={p.avatar} size={64} ring={false} />
        </div>
        {p.ready && (
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-black ring-2 ring-[#0a0605] anim-pop">
            <FontAwesomeIcon icon={faCheck} />
          </span>
        )}
      </div>
      <p className="mt-3 w-full truncate font-bold text-[#f3e5ab]">
        {p.name}
        {isMe && <span className="ml-1 text-xs font-normal text-[#a8916c]">(вы)</span>}
      </p>
      <p className={`text-[11px] font-bold uppercase tracking-wider ${p.connected === false ? "text-red-400" : p.ready ? "text-emerald-400" : "text-[#a8916c]"}`}>
        {p.connected === false ? "Переподключается…" : p.ready ? "Готов" : "Ждёт"}
      </p>

      {(friendState || isMayorView) && (
        <div className="mt-3 flex w-full flex-wrap justify-center gap-1.5">
          {friendState === "friend" && <span className="chip chip--green"><FontAwesomeIcon icon={faCheck} /> Друг</span>}
          {friendState === "sent" && <span className="chip"><FontAwesomeIcon icon={faClock} /> Заявка</span>}
          {friendState === "none" && (
            <button type="button" onClick={onAddFriend} className="btn btn-ghost btn-sm !px-2.5" title="Добавить в друзья">
              <FontAwesomeIcon icon={faUserPlus} />
            </button>
          )}
          {isMayorView && (
            <button type="button" onClick={onKick} className="btn btn-danger btn-sm !px-2.5" title="Выгнать">
              <FontAwesomeIcon icon={faUserXmark} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Lobby({
  roomCode,
  players = [],
  mayor,
  isMayor,
  playerReady,
  onPlayerReady,
  onStartSetup,
  onLeave,
  onKick,
  emojiMap = {},
  onSendEmoji,
  myAccountId,
  mayorAway
}) {
  const readyCount = players.filter((p) => p.ready).length;
  const total = players.length;
  const allReady = total > 0 && readyCount === total;
  const ownedEmojis = EMOJIS.filter((e) => ownsEmoji(e.id));

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [invited, setInvited] = useState({});
  const { lobbyMuted, toggleLobbyMute, playLobby, stopLobby } = useMusic();

  const loadFriends = async () => {
    if (!myAccountId) return;
    const [list, reqs] = await Promise.all([getFriendsList(myAccountId), getFriendRequests()]);
    setFriends(list || []);
    setOutgoing((reqs?.outgoing || []).map((r) => r.id));
  };

  useEffect(() => {
    loadFriends();
    const refresh = () => loadFriends();
    window.addEventListener("mafia-friends-changed", refresh);
    return () => window.removeEventListener("mafia-friends-changed", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAccountId]);

  useEffect(() => {
    playLobby();
    return () => stopLobby();
  }, [playLobby, stopLobby]);

  const friendState = (accountId) => {
    if (!accountId || !myAccountId || accountId === myAccountId) return null;
    if (friends.some((f) => f.id === accountId)) return "friend";
    if (outgoing.includes(accountId)) return "sent";
    return "none";
  };

  const addFriend = async (p) => {
    const res = await sendFriendRequest(p.accountId);
    if (!res?.success) return toast({ kind: "error", text: res?.message });
    toast({ kind: "success", text: res.status === "friends" ? `${p.name} теперь ваш друг` : `Заявка отправлена: ${p.name}` });
    loadFriends();
  };

  const copy = (text, msg) => {
    navigator.clipboard?.writeText(text);
    toast({ kind: "success", text: msg });
  };

  const inRoomIds = new Set([mayor?.accountId, ...players.map((p) => p.accountId)].filter(Boolean));
  const invitable = friends.filter((f) => !inRoomIds.has(f.id)).sort((a, b) => Number(b.online) - Number(a.online));
  const mayorDecoration = getDecoration(mayor?.decoration);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Шапка комнаты */}
      <div className="noir-card deco-corners overflow-hidden p-5 sm:p-7 anim-fade-up">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Код комнаты</p>
            <button
              type="button"
              onClick={() => copy(roomCode, "Код скопирован")}
              className="group mt-1 flex items-center gap-3"
              title="Скопировать код"
            >
              <span className="font-mono text-5xl font-black tracking-[0.25em] gold-text sm:text-6xl">{roomCode}</span>
              <FontAwesomeIcon icon={faCopy} className="text-[#a8916c] transition group-hover:text-[#f3d27a]" />
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy(`${window.location.origin}/online?autojoin=${roomCode}`, "Ссылка-приглашение скопирована")}
                className="btn btn-ghost btn-sm"
              >
                <FontAwesomeIcon icon={faLink} /> Ссылка
              </button>
              {myAccountId && (
                <button type="button" onClick={() => setInviteOpen((v) => !v)} className="btn btn-gold btn-sm">
                  <FontAwesomeIcon icon={faPaperPlane} /> Позвать друзей
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  toggleLobbyMute();
                  if (lobbyMuted) setTimeout(() => playLobby(), 50);
                }}
                className="btn btn-ghost btn-sm !px-3"
                title={lobbyMuted ? "Включить музыку" : "Выключить музыку"}
              >
                <FontAwesomeIcon icon={lobbyMuted ? faVolumeXmark : faVolumeHigh} />
              </button>
            </div>
          </div>

          {/* Мэр */}
          {mayor && (
            <div className="relative flex items-center gap-4 rounded-2xl border border-[#d4af37]/30 bg-black/30 p-4">
              {emojiMap[mayor.id] && (
                <span key={emojiMap[mayor.id].key} className="pointer-events-none absolute -top-5 right-3 text-3xl anim-pop">
                  {emojiMap[mayor.id].symbol}
                </span>
              )}
              <div className="relative">
                {mayorDecoration && (
                  <div className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2">
                    <DecorationSVG kind={mayorDecoration.kind} colors={mayorDecoration.colors} className="h-10 w-14" />
                  </div>
                )}
                <Avatar src={mayor.avatar} size={60} />
              </div>
              <div>
                <p className="eyebrow !text-[0.6rem] flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCrown} className="text-[#f3d27a]" /> Мэр
                </p>
                <p className="font-display text-xl font-bold text-[#f3e5ab]">{mayor.name}</p>
                {mayorAway && <p className="text-xs text-red-400 animate-pulse">Мэр переподключается…</p>}
              </div>
            </div>
          )}
        </div>

        {/* Прогресс готовности */}
        <div className="relative mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#a8916c]">Готовы к игре</span>
            <span className="font-display text-lg font-black text-[#f3d27a]">
              {readyCount}/{total}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8b0000] via-[#d4af37] to-emerald-400 transition-all duration-700"
              style={{ width: total ? `${(readyCount / total) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Пригласить друзей */}
      {inviteOpen && (
        <div className="noir-card p-5 anim-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#f3d27a]">Пригласить друзей</h3>
            <button onClick={() => setInviteOpen(false)} className="text-sm text-[#a8916c] hover:text-[#f3d27a]">Скрыть</button>
          </div>
          {invitable.length === 0 ? (
            <p className="mt-3 text-sm text-[#a8916c]">Все друзья уже здесь — или пока нет друзей. Добавляйте игроков кнопкой «+» на их карточке.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {invitable.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-black/30 p-2.5">
                  <Avatar src={f.icon} size={36} online={f.online} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-[#f3e5ab]">{f.name}</div>
                    <div className="text-[10px] text-[#a8916c]">{f.online ? (f.roomCode ? "В другой комнате" : "В сети") : "Не в сети"}</div>
                  </div>
                  <button
                    disabled={!f.online || invited[f.id]}
                    onClick={async () => {
                      const res = await inviteFriend(f.id, roomCode);
                      if (res?.success) {
                        setInvited((m) => ({ ...m, [f.id]: true }));
                        toast({ kind: "success", text: `Приглашение отправлено: ${f.name}` });
                      } else toast({ kind: "error", text: res?.message });
                    }}
                    className="btn btn-gold btn-sm"
                  >
                    {invited[f.id] ? <FontAwesomeIcon icon={faCheck} /> : "Позвать"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Стол — игроки */}
      {players.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {players.map((p, i) => (
            <Seat
              key={p.id}
              p={p}
              i={i}
              emoji={emojiMap[p.id]}
              isMe={p.accountId && p.accountId === myAccountId}
              isMayorView={isMayor}
              friendState={friendState(p.accountId)}
              onAddFriend={() => addFriend(p)}
              onKick={() => {
                if (window.confirm(`Выгнать ${p.name}?`)) onKick?.(p.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="noir-card noir-card--flat p-12 text-center anim-fade-in">
          <div className="text-4xl anim-float">🕯️</div>
          <p className="mt-3 font-display text-xl text-[#f3e5ab]">За столом пока пусто</p>
          <p className="mt-1 text-sm text-[#a8916c]">Отправьте друзьям код <b className="text-[#f3d27a]">{roomCode}</b> или ссылку-приглашение</p>
        </div>
      )}

      {/* Эмодзи */}
      {ownedEmojis.length > 0 && (
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => setEmojiOpen((v) => !v)} className="btn btn-ghost btn-sm">
            <FontAwesomeIcon icon={faFaceSmile} /> Эмодзи
          </button>
          {emojiOpen && (
            <div className="noir-card mt-3 grid max-h-44 w-full max-w-md grid-cols-6 gap-2 overflow-y-auto p-3 anim-scale-in">
              {ownedEmojis.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSendEmoji?.(e.id)}
                  className="flex aspect-square items-center justify-center rounded-xl bg-black/40 text-2xl transition hover:scale-115 hover:bg-[#d4af37]/15 active:scale-95"
                >
                  {e.symbol}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Действия */}
      <div className="sticky bottom-3 z-30 lg:bottom-5">
        <div className="noir-card flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          {isMayor ? (
            <>
              <div className="px-2 text-sm text-[#a8916c]">
                {total === 0 ? "Ждём игроков…" : allReady ? "Все готовы — можно начинать!" : `Ждём готовности: ${readyCount}/${total}`}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onLeave} className="btn btn-ghost">
                  <FontAwesomeIcon icon={faRightFromBracket} />
                </button>
                <button
                  type="button"
                  onClick={onStartSetup}
                  disabled={!allReady}
                  className={`btn btn-blood flex-1 sm:flex-none ${allReady ? "btn-pulse" : ""}`}
                >
                  <FontAwesomeIcon icon={faGear} /> Настроить игру
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={onLeave} className="btn btn-ghost order-2 sm:order-1">
                <FontAwesomeIcon icon={faRightFromBracket} /> Выйти
              </button>
              <button
                type="button"
                onClick={onPlayerReady}
                className={`btn btn-lg order-1 sm:order-2 sm:min-w-[260px] ${playerReady ? "btn-ghost" : "btn-gold btn-pulse"}`}
              >
                {playerReady ? "Отменить готовность" : "✓ Я готов"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
