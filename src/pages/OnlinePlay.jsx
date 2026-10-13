import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faDoorOpen, faArrowRight, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

import Lobby from "../components/Lobby";
import PartySetup from "../components/PartySetup";
import RoleRoulette from "../components/RoleRoulette";
import BackgroundVideo from "../components/BackgroundVideo";
import LoadingSpinner from "../components/LoadingSpinner";
import Logo from "../components/ui/Logo";
import Modal from "../components/ui/Modal";
import Avatar from "../components/ui/Avatar";
import GameRoom from "./game/GameRoom";

import { createRoom, joinRoom, setupRoles, setAbilitiesEnabled, setDifficulty, startGame, beginLobbyConfig } from "../services/roomService";
import { socket } from "../socket";
import { EMOJIS } from "../data/shopData";
import { getEquippedDecoration } from "../services/wallet";
import { onIncomingFriendRequest, respondToFriendRequest } from "../services/presence";
import { noteRecentPlayers } from "../services/friends";
import { recordEvent } from "../services/achievementsService";
import { getSelectedAvatar } from "../services/profile";
import { toast } from "../services/toast";
import useSeo from "../hooks/useSeo";

const SESSION_KEY = "mafia_lobby";

function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return s?.roomCode ? s : null;
  } catch {
    return null;
  }
}

function dedupe(list) {
  const seen = new Set();
  return (list || []).filter((p) => p && p.id && !seen.has(p.id) && seen.add(p.id));
}

export default function OnlinePlay({ account }) {
  useSeo({
    title: "Играть в Мафию онлайн",
    description: "Создайте комнату и пригласите друзей по коду или войдите в комнату друга — Мафия онлайн прямо в браузере.",
    path: "/online"
  });
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState("menu"); // menu | lobby
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [mayor, setMayor] = useState(null);
  const [emojiMap, setEmojiMap] = useState({});
  const [incomingRequest, setIncomingRequest] = useState(null);

  const [myRole, setMyRole] = useState(null);
  const [team, setTeam] = useState(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [showPartySetup, setShowPartySetup] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [inGame, setInGame] = useState(false);
  const [resume, setResume] = useState(null); // начальное состояние GameRoom после F5
  const [mayorAway, setMayorAway] = useState(false);

  const roomRef = useRef("");
  roomRef.current = roomCode;
  const isMayor = !!mayor && mayor.id === socket.id;

  const resetToMenu = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setView("menu");
    setRoomCode("");
    setPlayers([]);
    setMayor(null);
    setShowPartySetup(false);
    setLoadingStart(false);
    setLoadingGame(false);
    setInGame(false);
    setShowRoulette(false);
    setMyRole(null);
    setTeam(null);
    setResume(null);
  }, []);

  const enterLobby = useCallback((res, name, avatar, asMayor) => {
    setRoomCode(res.roomCode);
    setPlayers(dedupe(res.players));
    setMayor(res.mayor || null);
    setView("lobby");
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ roomCode: res.roomCode, playerName: name, avatar, isMayor: asMayor })
    );
  }, []);

  // ---------- Вход в комнату ----------
  const join = useCallback(
    async (rawCode, { silent = false } = {}) => {
      const code = String(rawCode || "").trim().toUpperCase();
      if (!code) return false;
      const avatar = getSelectedAvatar();
      const name = account?.name || "Игрок";
      // Уже сидим в другой комнате — сначала выходим из неё
      if (roomRef.current && roomRef.current !== code) socket.emit("leave-room", roomRef.current);
      setBusy(true);
      const res = await joinRoom(code, name, avatar, account?.id);
      setBusy(false);
      if (!res?.success) {
        if (!silent) toast({ kind: "error", title: "Не удалось войти", text: res?.message || "Комната не найдена" });
        return false;
      }
      enterLobby(res, name, avatar, !!res.isMayor);
      if (!res.started) recordEvent("room_joined");
      return true;
    },
    [account, enterLobby]
  );

  const handleCreate = async () => {
    const avatar = getSelectedAvatar();
    const name = account?.name || "Мэр";
    setBusy(true);
    const res = await createRoom(name, avatar, account?.id);
    setBusy(false);
    if (!res?.success) {
      toast({ kind: "error", title: "Не удалось создать комнату", text: res?.message });
      return;
    }
    enterLobby(res, name, avatar, true);
    recordEvent("room_created");
  };

  // ?autojoin=CODE — приглашение/ссылка. Ждём аккаунт, потом входим и чистим адрес.
  useEffect(() => {
    if (!account) return;
    const params = new URLSearchParams(location.search);
    const auto = params.get("autojoin");
    if (auto) {
      navigate("/online", { replace: true });
      join(auto);
      return;
    }
    // Восстановление после F5
    const session = readSession();
    if (session && !roomRef.current) {
      join(session.roomCode, { silent: true }).then((ok) => {
        if (!ok) localStorage.removeItem(SESSION_KEY);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, location.search]);

  // ---------- События сокета (все с отпиской) ----------
  useEffect(() => {
    // Тихий повторный вход после обрыва связи
    const onReconnect = () => {
      const session = readSession();
      if (session && roomRef.current) {
        joinRoom(session.roomCode, account?.name || session.playerName, session.avatar, account?.id);
      }
    };

    const onPlayers = (list) => setPlayers(dedupe(list));
    const onMayor = (m) => m && setMayor(m);
    const onGameReset = ({ players: fresh, mayor: m }) => {
      setInGame(false);
      setResume(null);
      setPlayers(dedupe(fresh));
      if (m) setMayor(m);
      setMyRole(null);
      setTeam(null);
      setShowRoulette(false);
      setLoadingGame(false);
      setLoadingStart(false);
      setShowPartySetup(false);
    };
    const onEmoji = ({ playerId, emojiId }) => {
      const emoji = EMOJIS.find((e) => e.id === emojiId);
      if (!emoji) return;
      const key = `${playerId}-${Date.now()}`;
      setEmojiMap((prev) => ({ ...prev, [playerId]: { id: emoji.id, symbol: emoji.symbol, key } }));
      setTimeout(() => {
        setEmojiMap((prev) => {
          if (prev[playerId]?.key !== key) return prev;
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
      }, 3000);
    };
    const onLoadingGame = () => setLoadingGame(true);
    const onRole = (role) => {
      setMyRole(role);
      setLoadingStart(false);
      setLoadingGame(true);
      recordEvent("role_played", { role });
      setTimeout(() => {
        setLoadingGame(false);
        setShowRoulette(true);
      }, 1800);
    };
    const onTeam = (list) => setTeam(list);
    const onPhase = (data) => {
      // Мэр без роли входит в игру сразу
      if (data?.phase === "waiting_ready" && mayor?.id === socket.id) {
        setLoadingStart(false);
        setInGame(true);
      }
    };
    const onResume = (payload) => {
      setMyRole(payload.role || null);
      setTeam(payload.team || null);
      setResume(payload);
      setShowRoulette(false);
      setLoadingGame(false);
      setLoadingStart(false);
      setInGame(true);
    };
    const onKicked = (data) => {
      toast({ kind: "error", title: "Вы покинули комнату", text: data?.reason || "Вас выгнали" });
      resetToMenu();
    };
    const onClosed = (data) => {
      toast({ kind: "error", title: "Комната закрыта", text: data?.reason || data?.message });
      resetToMenu();
    };
    const onEveryoneReady = () => toast({ kind: "success", title: "Все готовы!", text: "Можно настраивать партию" });
    const onMayorAway = () => setMayorAway(true);
    const onMayorBack = () => setMayorAway(false);
    const onGameError = ({ message }) => {
      setLoadingStart(false);
      toast({ kind: "error", text: message });
    };

    const handlers = {
      connect: onReconnect,
      "players-updated": onPlayers,
      "mayor-updated": onMayor,
      "game-reset": onGameReset,
      "emoji-sent": onEmoji,
      "loading-game": onLoadingGame,
      "your-role": onRole,
      "your-team": onTeam,
      "game-phase": onPhase,
      "resume-game": onResume,
      kicked: onKicked,
      "room-closed": onClosed,
      "everyone-ready": onEveryoneReady,
      "mayor-disconnected": onMayorAway,
      "mayor-reconnected": onMayorBack,
      "game-error": onGameError
    };
    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    const offKnock = onIncomingFriendRequest((req) => setIncomingRequest(req));
    return () => {
      Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
      offKnock();
    };
  }, [account, mayor, resetToMenu]);

  // Недавние игроки (для вкладки "Друзья")
  useEffect(() => {
    if (!account || !players.length) return;
    noteRecentPlayers(
      players.filter((p) => p.accountId).map((p) => ({ id: p.accountId, name: p.name })),
      account.id
    );
  }, [players, account]);

  // Своё украшение — всем в комнате
  useEffect(() => {
    if (!roomCode) return;
    const send = () => socket.emit("set-decoration", roomCode, getEquippedDecoration());
    send();
    window.addEventListener("mafia-wallet-changed", send);
    return () => window.removeEventListener("mafia-wallet-changed", send);
  }, [roomCode]);

  const respondIncoming = (accepted) => {
    if (!incomingRequest) return;
    respondToFriendRequest({
      roomCode: incomingRequest.roomCode,
      requesterSocketId: incomingRequest.requesterSocketId,
      requesterAccountId: incomingRequest.requesterAccountId,
      accepted
    });
    setIncomingRequest(null);
  };

  const handlePartyStart = (roles, abilitiesEnabled = true, difficulty = "easy") => {
    setupRoles(roomCode, roles);
    setAbilitiesEnabled(roomCode, abilitiesEnabled);
    setDifficulty(roomCode, difficulty);
    beginLobbyConfig(roomCode);
    setShowPartySetup(false);
    setLoadingStart(true);
    setTimeout(() => startGame(roomCode), 2000);
  };

  const handlePlayerReady = () => {
    if (!roomCode) return;
    setPlayers((prev) => prev.map((p) => (p.id === socket.id ? { ...p, ready: !p.ready } : p)));
    socket.emit("player-ready", roomCode);
  };

  const leaveLobby = () => {
    if (isMayor && players.length && !window.confirm("Вы мэр — если выйти, комната закроется для всех. Выйти?")) return;
    if (roomCode) socket.emit("leave-room", roomCode);
    resetToMenu();
  };

  // ---------- Экраны ----------
  if (inGame) {
    return (
      <GameRoom
        roomCode={roomCode}
        isMayor={isMayor}
        players={players}
        myRole={myRole}
        team={team}
        resume={resume}
        account={account}
        onLeaveToLobby={() => {
          setInGame(false);
          setResume(null);
        }}
      />
    );
  }

  if (showRoulette && myRole) {
    return (
      <RoleRoulette
        role={myRole}
        onFinish={() => {
          setShowRoulette(false);
          setInGame(true);
        }}
      />
    );
  }

  const me = players.find((p) => p.id === socket.id);

  return (
    <>
      {view === "menu" && (
        <div className="relative overflow-hidden rounded-[28px] ring-1 ring-[#d4af37]/20">
          <BackgroundVideo>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-black/60 px-4 py-2 text-sm font-bold text-[#f3e5ab] backdrop-blur transition hover:border-[#f3d27a] lg:hidden"
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Назад
            </button>
            <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center gap-8 px-5 py-14 text-center">
              <Logo size={190} intro float />
              <div>
                <p className="eyebrow anim-fade-up">Город ждёт</p>
                <h1 className="mt-2 font-display text-4xl font-black sm:text-6xl anim-blur-in">
                  <span className="gold-text">Займите место за столом</span>
                </h1>
              </div>
              <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busy || !account}
                  onClick={handleCreate}
                  className="noir-card noir-card--hover spotlight group p-6 text-left anim-fade-up disabled:opacity-60"
                  style={{ "--i": 3 }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c0151f] to-[#5c0000] text-xl text-[#fbe9c4] shadow-[0_8px_25px_-6px_rgba(192,21,31,0.8)] transition group-hover:scale-110 group-hover:rotate-6">
                    <FontAwesomeIcon icon={faCrown} />
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-bold text-[#f3e5ab]">Создать комнату</h2>
                  <p className="mt-1 text-sm text-[#a8916c]">Станьте мэром: соберите друзей и ведите игру</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#f3d27a]">
                    Создать <FontAwesomeIcon icon={faArrowRight} className="transition group-hover:translate-x-1" />
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy || !account}
                  onClick={() => setCodeOpen(true)}
                  className="noir-card noir-card--hover spotlight group p-6 text-left anim-fade-up disabled:opacity-60"
                  style={{ "--i": 4 }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f6dc8f] to-[#a8841e] text-xl text-[#1a0f05] shadow-[0_8px_25px_-6px_rgba(212,175,55,0.8)] transition group-hover:scale-110 group-hover:-rotate-6">
                    <FontAwesomeIcon icon={faDoorOpen} />
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-bold text-[#f3e5ab]">Войти по коду</h2>
                  <p className="mt-1 text-sm text-[#a8916c]">Введите код комнаты, который дал мэр</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#f3d27a]">
                    Ввести код <FontAwesomeIcon icon={faArrowRight} className="transition group-hover:translate-x-1" />
                  </span>
                </button>
              </div>
              {!account && <p className="text-sm text-[#a8916c]">Сначала выберите имя</p>}
            </div>
          </BackgroundVideo>
        </div>
      )}

      <Modal open={codeOpen} onClose={() => setCodeOpen(false)}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await join(codeInput)) setCodeOpen(false);
          }}
          className="text-center"
        >
          <p className="eyebrow">Вход в комнату</p>
          <h2 className="mt-2 font-display text-3xl font-black gold-text">Код комнаты</h2>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="ABCDE"
            maxLength={8}
            autoFocus
            className="input-noir mt-6 text-center font-mono text-3xl font-black tracking-[0.4em]"
          />
          <button disabled={busy || !codeInput} className="btn btn-blood btn-lg mt-4 w-full">
            {busy ? "Входим…" : "Войти"}
          </button>
          <button type="button" onClick={() => setCodeOpen(false)} className="btn btn-ghost mt-2 w-full">
            <FontAwesomeIcon icon={faArrowLeft} /> Назад
          </button>
        </form>
      </Modal>

      {view === "lobby" && (
        <Lobby
          roomCode={roomCode}
          players={players}
          mayor={mayor}
          isMayor={isMayor}
          playerReady={!!me?.ready}
          onPlayerReady={handlePlayerReady}
          onStartSetup={() => setShowPartySetup(true)}
          onLeave={leaveLobby}
          onKick={(playerId) => socket.emit("kick-player", roomCode, playerId)}
          emojiMap={emojiMap}
          onSendEmoji={(id) => {
            socket.emit("send-emoji", roomCode, id);
            recordEvent("emoji_sent");
          }}
          myAccountId={account?.id}
          mayorAway={mayorAway}
        />
      )}

      {showPartySetup && (
        <PartySetup players={players} onStart={handlePartyStart} onClose={() => setShowPartySetup(false)} />
      )}

      {(loadingStart || loadingGame) && (
        <LoadingSpinner text={loadingStart ? "Раздаём роли и готовим город…" : "Мэр раздаёт роли. Секундочку…"} />
      )}

      {/* Друг стучится в комнату (видит только мэр) */}
      <Modal open={!!incomingRequest} onClose={() => respondIncoming(false)}>
        {incomingRequest && (
          <div className="text-center">
            <Avatar src={incomingRequest.requesterIcon} size={84} className="mx-auto anim-pop" />
            <p className="eyebrow mt-4">Стук в дверь</p>
            <h3 className="mt-1 font-display text-2xl font-black text-[#f3e5ab]">
              {incomingRequest.requesterName} хочет войти
            </h3>
            <div className="mt-6 flex gap-3">
              <button onClick={() => respondIncoming(true)} className="btn btn-gold flex-1">Впустить</button>
              <button onClick={() => respondIncoming(false)} className="btn btn-ghost flex-1">Отказать</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
