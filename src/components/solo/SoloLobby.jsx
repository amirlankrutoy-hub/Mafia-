import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faCheck, faArrowLeft, faPlay, faUserSecret, faFire, faUserShield, faCopy, faHourglassHalf } from "@fortawesome/free-solid-svg-icons";
import Avatar from "../ui/Avatar";
import ChatPanel from "../ChatPanel";
import { socket } from "../../socket";
import { soloFactionCounts, SOLO_MIN_PLAYERS } from "../../services/solo";
import { toast } from "../../services/toast";
import { TEAMS } from "../../data/teams";
import "../../solo.css";

const MAX_PLAYERS = 30;

function Countdown({ endsAt }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))), 200);
    return () => clearInterval(t);
  }, [endsAt]);
  return (
    <div className="solo-countdown">
      <div className="solo-countdown__num" key={left}>
        {left}
      </div>
      <p>Игра начинается — приготовьтесь к раздаче ролей</p>
    </div>
  );
}

/** Лобби одиночного режима: все — игроки, мэра нет, хозяин может начать игру */
export default function SoloLobby({ roomCode, players, hostId, countdownEndsAt, onReady, onStart, onLeave, starting }) {
  const me = players.find((p) => p.id === socket.id);
  const amHost = hostId === socket.id;
  const online = players.filter((p) => p.connected !== false);
  const n = online.length;
  const f = soloFactionCounts(Math.max(n, SOLO_MIN_PLAYERS));
  const civ = Math.max(0, Math.max(n, SOLO_MIN_PLAYERS) - f.mafia - f.neutral);
  const enough = n >= SOLO_MIN_PLAYERS;
  const readyCount = online.filter((p) => p.ready).length;

  const copy = () =>
    navigator.clipboard?.writeText(roomCode).then(() => toast({ kind: "success", text: "Код скопирован" }), () => {});

  return (
    <div className="solo-lobby">
      <div className="solo-menu__glow" />
      <header className="relative flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onLeave} className="solo-back !static">
          <FontAwesomeIcon icon={faArrowLeft} /> Выйти
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9fb4ff]">Одиночный режим</p>
          <button type="button" onClick={copy} className="mt-0.5 inline-flex items-center gap-2 font-mono text-2xl font-black tracking-[0.25em] text-[#e0e7ff]">
            {roomCode} <FontAwesomeIcon icon={faCopy} className="text-xs opacity-60" />
          </button>
        </div>
        <span className="solo-stat">
          Игроков: <b>{n}</b>/{MAX_PLAYERS}
        </span>
      </header>

      {/* Расклад фракций */}
      <section className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { t: "mafia", icon: faUserSecret, v: f.mafia, label: "Мафия" },
          { t: "neutrals", icon: faFire, v: f.neutral, label: "Нейтралы" },
          { t: "civilians", icon: faUserShield, v: civ, label: "Мирные" }
        ].map((x) => (
          <div key={x.t} className="solo-faction" style={{ "--c": TEAMS[x.t].color }}>
            <FontAwesomeIcon icon={x.icon} />
            <b>{x.v}</b>
            <span>{x.label}</span>
          </div>
        ))}
      </section>
      <p className="relative mt-2 text-center text-[11px] text-[#9aa3c7]">
        {enough
          ? `Расклад на ${n} игроков. Роли выпадут случайно — каждому из его коллекции.`
          : `Нужно ещё ${SOLO_MIN_PLAYERS - n} — минимум ${SOLO_MIN_PLAYERS} игрока. Пока ждём, позовите друзей по коду.`}
      </p>

      {/* Места */}
      <section className="relative mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {players.map((p, i) => (
          <div
            key={p.id}
            className={`solo-seat anim-scale-in ${p.ready ? "solo-seat--ready" : ""} ${p.connected === false ? "opacity-40" : ""}`}
            style={{ "--i": Math.min(i, 12) }}
          >
            {p.id === hostId && (
              <span className="solo-seat__host" title="Хозяин комнаты">
                <FontAwesomeIcon icon={faCrown} />
              </span>
            )}
            <Avatar src={p.avatar} size={58} ring={false} />
            <span className="mt-2 w-full truncate text-xs font-bold text-[#e0e7ff]" translate="no">
              {p.name}
              {p.id === socket.id ? " (вы)" : ""}
            </span>
            <span className={`solo-seat__state ${p.ready ? "solo-seat__state--on" : ""}`}>
              {p.connected === false ? "Переподключается…" : p.ready ? "Готов" : "Ждёт"}
            </span>
          </div>
        ))}
        {Array.from({ length: Math.max(0, SOLO_MIN_PLAYERS - players.length) }).map((_, i) => (
          <div key={`empty${i}`} className="solo-seat solo-seat--empty">
            <span className="solo-seat__wait">
              <FontAwesomeIcon icon={faHourglassHalf} />
            </span>
            <span className="mt-2 text-[11px] text-[#7d86ad]">Ждём игрока…</span>
          </div>
        ))}
      </section>

      {/* Действия */}
      <div className="solo-actions">
        <button type="button" onClick={onReady} className={`solo-ready ${me?.ready ? "solo-ready--on" : ""}`}>
          <FontAwesomeIcon icon={faCheck} /> {me?.ready ? "Готов!" : "Я готов"}
        </button>
        {amHost && (
          <button type="button" disabled={!enough || starting || !!countdownEndsAt} onClick={onStart} className="solo-start">
            <FontAwesomeIcon icon={faPlay} /> Начать игру
          </button>
        )}
        <p className="w-full text-center text-[11px] text-[#9aa3c7]">
          Готовы {readyCount} из {n}. {amHost ? "Вы хозяин: можете начать сами." : "Когда все готовы — игра начнётся сама."}
        </p>
      </div>

      {countdownEndsAt && <Countdown endsAt={countdownEndsAt} />}
      <ChatPanel roomCode={roomCode} channels={[{ id: "room", label: "Лобби" }]} className="bottom-28 right-4 lg:bottom-28 lg:right-8" />
    </div>
  );
}
