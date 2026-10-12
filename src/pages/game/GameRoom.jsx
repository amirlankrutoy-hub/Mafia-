import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen, faXmark, faGhost } from "@fortawesome/free-solid-svg-icons";
import { socket } from "../../socket";
import MayorPanel from "./MayorPanel";
import DeathScreamer from "./DeathScreamer";
import AbilityBar from "../../components/AbilityBar";
import ChatPanel from "../../components/ChatPanel";
import roles from "../../data/roles";
import { credit } from "../../services/wallet";
import { recordEvent } from "../../services/achievementsService";
import { toast } from "../../services/toast";
import {
  NightPublic,
  NightTurn,
  WaitScreen,
  Morning,
  Voting,
  Verdict,
  VoteResult,
  Ended,
  WaitingReady,
  Stage
} from "./screens";

// Награда за победу (Токены)
const REWARD_BY_ROLE = { poklon: 100, stukach: 100 };
const REWARD_BY_CATEGORY = { civilians: 100, mafia: 150, neutrals: 150 };

function emitAck(event, ...args) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ success: false, message: "Сервер не ответил" }), 8000);
    socket.emit(event, ...args, (res) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}

export default function GameRoom({ roomCode, isMayor, players: initialPlayers, myRole, team, resume, onLeaveToLobby }) {
  const initial = resume?.phase || null;
  const [phaseData, setPhaseData] = useState(initial || { phase: "waiting_ready" });
  const [players, setPlayers] = useState(resume?.players || initialPlayers || []);
  const [readyCount, setReadyCount] = useState(0);
  const [readySent, setReadySent] = useState(false);
  const [dying, setDying] = useState(null);
  const [alive, setAlive] = useState(resume ? resume.alive !== false : true);
  const [notes, setNotes] = useState([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [teamChoices, setTeamChoices] = useState([]);
  const [voteProgress, setVoteProgress] = useState(null);
  const [nightProgress, setNightProgress] = useState(null);
  const [mvpShown, setMvpShown] = useState(false);
  const [earned, setEarned] = useState(0);
  const [playAgainState, setPlayAgainState] = useState("idle");
  const rewardGiven = useRef(false);
  const lastNightRef = useRef(null);
  const deathCause = useRef(null);

  const phase = phaseData.phase;

  useEffect(() => {
    const onPhase = (data) => {
      if (!data?.phase) return;
      if (data.players) setPlayers(data.players);
      if (data.readyCount != null) setReadyCount(data.readyCount);
      if (data.phase === "night") {
        // Свой ход приходит отдельным сообщением после общего — не затираем его
        setPhaseData((prev) => {
          if (prev.phase === "night" && prev.nightInfo?.yourTurn && !data.nightInfo?.yourTurn && prev.nightInfo.step?.role === data.nightInfo?.step?.role && prev.nightInfo.night === data.nightInfo?.night) {
            return prev;
          }
          return data;
        });
        if (lastNightRef.current !== data.nightInfo?.step?.role) {
          lastNightRef.current = data.nightInfo?.step?.role;
          setTeamChoices([]);
          setNightProgress(null);
        }
        return;
      }
      if (data.phase === "voting") setVoteProgress(null);
      // Мэру предпросмотр ночи приходит отдельно — не затираем общим сообщением
      setPhaseData((prev) => (data.phase === "night_end" && prev.phase === "night_end" && prev.results && !data.results ? prev : data));
    };
    const onPlayers = (list) => setPlayers(list);
    const onPrivate = (info) => {
      setNotes((n) => [...n, { text: info.text, at: Date.now() }]);
      toast({ kind: "info", title: "Секретные сведения", text: info.text, duration: 12000 });
    };
    const onDied = (data) => {
      deathCause.current = data?.killedBy === "execution" ? "vote" : "night";
      setAlive(false);
      setDying(data);
    };
    const onTeamChoice = (c) => setTeamChoices((prev) => [...prev.filter((x) => x.name !== c.name), c]);
    const onVoteProgress = (p) => setVoteProgress(p);
    const onNightProgress = (p) => setNightProgress(p);
    const onToast = ({ text }) => toast({ kind: "announce", text, duration: 8000 });

    socket.on("game-phase", onPhase);
    socket.on("game-players", onPlayers);
    socket.on("private-info", onPrivate);
    socket.on("you-died", onDied);
    socket.on("team-choice", onTeamChoice);
    socket.on("vote-progress", onVoteProgress);
    socket.on("night-progress", onNightProgress);
    socket.on("game-toast", onToast);
    return () => {
      socket.off("game-phase", onPhase);
      socket.off("game-players", onPlayers);
      socket.off("private-info", onPrivate);
      socket.off("you-died", onDied);
      socket.off("team-choice", onTeamChoice);
      socket.off("vote-progress", onVoteProgress);
      socket.off("night-progress", onNightProgress);
      socket.off("game-toast", onToast);
    };
  }, []);

  // Семья мафии — в блокнот
  useEffect(() => {
    if (team && team.length > 1) {
      setNotes((n) =>
        n.some((x) => x.team) ? n : [{ team: true, text: `Ваша семья: ${team.map((m) => `${m.name} (${m.roleName})`).join(", ")}` }, ...n]
      );
    }
  }, [team]);

  // Итог игры: награда (один раз) и экран "Игрок матча"
  useEffect(() => {
    if (phase !== "ended") {
      setMvpShown(false);
      return;
    }
    if (!isMayor && myRole && !rewardGiven.current) {
      rewardGiven.current = true;
      const won = (phaseData.winners || []).includes(socket.id);
      const cat = roles.find((r) => r.id === myRole)?.category;
      recordEvent("game_played");
      recordEvent("game_result", { won, team: cat, role: myRole, alive, killedBy: deathCause.current });
      if (won) {
        const amount = REWARD_BY_ROLE[myRole] ?? REWARD_BY_CATEGORY[cat] ?? 100;
        credit(amount);
        setEarned(amount);
      }
    }
    const t = setTimeout(() => setMvpShown(true), phaseData.mvp ? 4000 : 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseData, isMayor, myRole]);

  const playAgain = async () => {
    setPlayAgainState("sending");
    const res = await emitAck("play-again", roomCode);
    setPlayAgainState("idle");
    if (!res?.success) toast({ kind: "error", text: res?.message || "Не удалось начать заново" });
  };

  // ---------- Смерть: скример, затем режим зрителя ----------
  if (dying) {
    return (
      <DeathScreamer
        reason={dying.reason}
        killedBy={dying.killedBy}
        onEnd={() => {
          setDying(null);
        }}
      />
    );
  }

  const myRoleInfo = roles.find((r) => r.id === myRole);
  const overlay = !isMayor && myRoleInfo && phase !== "ended" && (
    <>
      <button
        type="button"
        onClick={() => setNotesOpen(true)}
        className="fixed bottom-4 left-4 z-[640] flex items-center gap-2 rounded-full border border-[#d4af37]/50 bg-black/70 py-1.5 pl-1.5 pr-4 text-sm font-bold text-[#f3e5ab] backdrop-blur transition hover:border-[#f3d27a]"
      >
        <img src={myRoleInfo.image} alt="" className="h-9 w-9 rounded-full object-cover" />
        <span className="hidden sm:inline">{myRoleInfo.name}</span>
        <FontAwesomeIcon icon={faBookOpen} className="text-[#d4af37]" />
        {notes.length > 0 && <span className="rounded-full bg-[#c0151f] px-1.5 text-[10px] text-white">{notes.length}</span>}
      </button>
      {!alive && (
        <div className="fixed left-1/2 top-3 z-[640] -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
          <FontAwesomeIcon icon={faGhost} className="mr-1.5" /> Вы выбыли — наблюдайте за игрой
        </div>
      )}
      {notesOpen && (
        <div className="fixed inset-0 z-[700] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => setNotesOpen(false)}>
          <div className="noir-card w-full max-w-md p-6 anim-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-black gold-text">Блокнот</h3>
              <button onClick={() => setNotesOpen(false)} className="text-[#a8916c]"><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <div className="mt-4 flex gap-3 rounded-xl bg-black/30 p-3">
              <img src={myRoleInfo.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <div>
                <div className="font-bold text-[#f3e5ab]">{myRoleInfo.name}</div>
                <div className="text-xs text-[#a8916c]">{myRoleInfo.ability}</div>
              </div>
            </div>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-[#a8916c]">Здесь появятся сведения, которые вы узнаете ночью.</p>
              ) : (
                notes.map((n, i) => (
                  <p key={i} className="rounded-lg border border-[#d4af37]/15 bg-black/30 px-3 py-2 text-sm text-[#e6d5bc]">{n.text}</p>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {alive && (phase === "night" || phase === "voting") && (
        <AbilityBar phase={phase === "night" ? "night" : "day"} roomCode={roomCode} players={players} />
      )}
    </>
  );

  // Общий чат — только на голосовании; канал мафии — если жив хоть один напарник
  const chatChannels = [];
  if (["voting", "vote_pending", "vote_result"].includes(phase) && (isMayor || alive)) {
    chatChannels.push({ id: "room", label: "Общий" });
  }
  const teammatesAlive = (team || []).filter(
    (m) => m.id !== socket.id && players.some((p) => p.name === m.name && p.alive !== false)
  ).length;
  if (!isMayor && alive && phase !== "ended" && ["mafia", "otez", "vor"].includes(myRole) && teammatesAlive > 0) {
    chatChannels.push({ id: "mafia", label: "Семья" });
  }

  const screen = (() => {
    if (phase === "ended") {
      return (
        <Ended
          winner={phaseData.winner}
          winners={phaseData.winners}
          mvp={phaseData.mvp}
          players={phaseData.players || players}
          myId={socket.id}
          earned={earned}
          isMayor={isMayor}
          mvpShown={mvpShown}
          playAgainState={playAgainState}
          onPlayAgain={playAgain}
        />
      );
    }

    if (phase === "loading") return <WaitScreen title={phaseData.loadingText || "Загрузка…"} tone="noir" />;

    if (phase === "vote_result") return <VoteResult voteResult={phaseData.voteResult} />;

    if (phase === "voting") {
      const blocked = (phaseData.vote?.blockedVoters || []).includes(socket.id);
      return (
        <Voting
          vote={phaseData.vote}
          isMayor={isMayor}
          canVote={!isMayor && alive && !blocked}
          blockedReason={!isMayor && alive && blocked ? "Ваш голос этой ночью украли — вы не голосуете" : !isMayor && !alive ? "Вы выбыли и не голосуете" : null}
          progress={voteProgress}
          onVote={(tid) => {
            recordEvent("vote_cast");
            return emitAck("cast-vote", roomCode, tid);
          }}
          onFinish={() => socket.emit("finish-voting", roomCode)}
        />
      );
    }

    if (phase === "vote_pending") {
      const c = phaseData.candidate;
      return (
        <Verdict
          candidate={c}
          avatar={players.find((p) => p.id === c?.id)?.avatar}
          isMayor={isMayor}
          onExecute={() => socket.emit("mayor-execute", roomCode, false)}
          onPardon={() => socket.emit("mayor-execute", roomCode, true)}
        />
      );
    }

    if (isMayor) {
      return (
        <MayorPanel
          roomCode={roomCode}
          phase={phase}
          players={players}
          nightInfo={phaseData.nightInfo}
          nightProgress={nightProgress}
          morningResults={phaseData.results || []}
          readyCount={readyCount}
          onBeginNight={() => socket.emit("begin-night", roomCode)}
          onMorning={() => socket.emit("mayor-morning", roomCode)}
          onBeginVote={() => socket.emit("begin-voting", roomCode)}
          onNextNight={() => socket.emit("night-next", roomCode)}
          onKill={(id, reason) => socket.emit("mayor-kill", roomCode, id, reason)}
          onForceWin={(side, reason) => socket.emit("mayor-force-win", roomCode, side, reason)}
        />
      );
    }

    if (phase === "waiting_ready") {
      return (
        <WaitingReady
          myRole={myRole}
          team={team}
          readyCount={readyCount}
          total={players.filter((p) => p.alive !== false).length}
          readySent={readySent}
          onReady={() => {
            setReadySent(true);
            socket.emit("game-player-ready", roomCode);
          }}
        />
      );
    }

    if (phase === "night") {
      const info = phaseData.nightInfo || {};
      if (info.yourTurn && alive) {
        return (
          <NightTurn
            step={info.step}
            targets={info.targets}
            team={info.team}
            teamChoices={teamChoices}
            onAction={(targetId, mode) => {
              recordEvent("night_action", { role: myRole });
              return emitAck("night-action", roomCode, { targetId, mode });
            }}
          />
        );
      }
      return <NightPublic phrase={phaseData.phrase} label={info.step?.label} night={info.night} />;
    }

    if (phase === "night_wait") {
      return <WaitScreen title="Выбор сделан" text={phaseData.phrase || "Ждём решения остальных…"} />;
    }

    if (phase === "night_end") {
      return <WaitScreen title="Ночь подходит к концу…" text="Мэр решает, когда наступит утро" />;
    }

    if (phase === "morning") return <Morning day={phaseData.day} results={phaseData.results || []} />;

    return (
      <Stage tone="noir">
        <p className="text-[#c9b48f] animate-pulse">Синхронизация с сервером…</p>
      </Stage>
    );
  })();

  return (
    <>
      {screen}
      {overlay}
      <ChatPanel roomCode={roomCode} channels={chatChannels} className="bottom-20 right-4" />
      {phase === "ended" && !isMayor && (
        <button
          type="button"
          onClick={onLeaveToLobby}
          className="btn btn-ghost btn-sm fixed left-4 top-4 z-[640]"
        >
          ← В лобби
        </button>
      )}
    </>
  );
}
