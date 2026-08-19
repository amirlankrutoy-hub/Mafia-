import { useEffect, useRef, useState } from "react";
import { socket } from "../../socket";
import MayorPanel from "./MayorPanel";
import PlayerNight from "./PlayerNight";
import VotingScreen from "./VotingScreen";
import BlackPhrase from "./BlackPhrase";
import DeathScreamer from "./DeathScreamer";
import MayorExecutionScreen from "./MayorExecutionScreen";
import roles from "../../data/roles";
import { WIN_REWARDS } from "../../data/shopData";
import { credit } from "../../services/wallet";
import { useLanguage } from "../../context/LanguageContext";

export default function GameRoom({
  roomCode,
  isMayor,
  players: initialPlayers,
  myRole,
  onLeaveToLobby
}) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("waiting_ready");
  const [players, setPlayers] = useState(initialPlayers || []);
  const [nightInfo, setNightInfo] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [morningResults, setMorningResults] = useState([]);
  const [voteData, setVoteData] = useState(null);
  const [pendingCandidate, setPendingCandidate] = useState(null);
  const [voteResult, setVoteResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const [mvp, setMvp] = useState(null);
  const [mvpShown, setMvpShown] = useState(false);
  const [readyCount, setReadyCount] = useState(0);
  const [loadingText, setLoadingText] = useState("");
  const [privateInfo, setPrivateInfo] = useState(null);
  const [readySent, setReadySent] = useState(false);
  const [dying, setDying] = useState(null);
  const [earnedReward, setEarnedReward] = useState(0);
  const [playAgainState, setPlayAgainState] = useState("idle");
  const rewardGivenRef = useRef(false);

  useEffect(() => {
    const onPhase = (data) => {
      setPhase(data.phase);
      if (data.players) setPlayers(data.players);
      if (data.phrase) setPhrase(data.phrase);
      if (data.nightInfo) {
        setNightInfo(data.nightInfo);
        const actorIds = (data.nightInfo.actors || []).map((a) => a.id);
        setIsMyTurn(!isMayor && actorIds.includes(socket.id));
      } else {
        setIsMyTurn(false);
      }
      if (data.results) setMorningResults(data.results);
      if (data.vote) setVoteData(data.vote);
      if (data.phase === "vote_pending") {
        setPendingCandidate(data.candidate || null);
      }
      if (data.voteResult) setVoteResult(data.voteResult);
      if (data.winner) setWinner(data.winner);
      if (data.phase === "ended") setMvp(data.mvp || null);
      if (data.readyCount != null) setReadyCount(data.readyCount);
      if (data.loadingText) setLoadingText(data.loadingText);
    };

    const onYouDied = (data) => setDying(data);

    socket.on("game-phase", onPhase);
    socket.on("private-info", (info) => setPrivateInfo(info));
    socket.on("you-died", onYouDied);

    return () => {
      socket.off("game-phase", onPhase);
      socket.off("private-info");
      socket.off("you-died", onYouDied);
    };
  }, [isMayor]);

  // Награда Мафио за победу: выдаётся один раз, только реальным игрокам
  // (у мэра нет роли и он не считается участником). Хук должен стоять
  // до любых ранних return, иначе нарушается порядок вызова хуков.
  useEffect(() => {
    if (!winner || isMayor || !myRole || rewardGivenRef.current) return;

    const rule = WIN_REWARDS[winner.winner];
    if (!rule) return;

    const roleInfo = roles.find((r) => r.id === myRole);
    if (!roleInfo || !rule.categories.includes(roleInfo.category)) return;

    const amount = rule.exceptions?.[myRole] ?? rule.amount;
    rewardGivenRef.current = true;
    credit(amount);
    setEarnedReward(amount);
  }, [winner, isMayor, myRole]);

  // Экран "Игрок матча" держим 5 секунд, потом у мэра появляется "Играть снова".
  useEffect(() => {
    if (!winner) {
      setMvpShown(false);
      return;
    }
    const delay = mvp ? 5000 : 0;
    const t = setTimeout(() => setMvpShown(true), delay);
    return () => clearTimeout(t);
  }, [winner, mvp]);

  // Игрока убили (ночью, на голосовании или рукой мэра) —
  // показываем скример, затем отправляем его в лобби.
  // Мэра это не касается: у него роли и смерти нет.
  if (dying) {
    return (
      <DeathScreamer
        reason={dying.reason}
        variant={dying.killedBy === "mafia" ? "mafia" : "generic"}
        onEnd={() => {
          setDying(null);
          if (!isMayor) onLeaveToLobby?.();
        }}
      />
    );
  }

  if (winner) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-5xl text-yellow-400 font-black mb-4">
          {t("game_over")}
        </h1>
        <p className="text-3xl text-white">
          {t("victory")}: {winner.label || winner.winner}
        </p>
        {winner.reason && (
          <p className="text-gray-400 mt-4">{winner.reason}</p>
        )}
        {earnedReward > 0 && (
          <p className="mt-6 text-xl text-[#d4af37] font-bold">
            + {earnedReward} Мафио начислено на ваш счёт
          </p>
        )}

        {mvp && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.6)]">
              <img
                src={mvp.avatar || "/avatars/avatar1.svg"}
                alt={mvp.name}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="text-2xl font-bold text-white">{mvp.name}</p>
            <p className="mvp-blink text-3xl font-black uppercase tracking-widest">
              {t("player_of_match")}
            </p>
            <style>{`
              .mvp-blink {
                animation: mvpBlink 1s infinite alternate;
              }
              @keyframes mvpBlink {
                0% { color: #8b0000; text-shadow: 0 0 10px #8b0000, 0 0 20px #8b0000; }
                100% { color: #d4af37; text-shadow: 0 0 14px #d4af37, 0 0 28px #d4af37; }
              }
            `}</style>
          </div>
        )}

        {isMayor && !mvpShown && (
          <p className="mt-10 text-sm text-gray-500 animate-pulse">
            Определяем игрока матча...
          </p>
        )}

        {isMayor && mvpShown && (
          <button
            type="button"
            disabled={playAgainState === "sending"}
            onClick={() => {
              setPlayAgainState("sending");
              let answered = false;

              socket.emit("play-again", roomCode, (res) => {
                answered = true;
                if (res?.success) {
                  setPlayAgainState("idle");
                } else {
                  setPlayAgainState("idle");
                  alert(
                    res?.message ||
                      "Не удалось начать игру заново. Попробуйте ещё раз."
                  );
                }
              });

              // Если сервер вообще не ответил за 5 секунд — значит
              // событие даже не дошло (сервер не тот/не перезапущен/
              // разрыв соединения), а не то что мэра не узнали.
              setTimeout(() => {
                if (!answered) {
                  setPlayAgainState("idle");
                  alert(
                    "Сервер не ответил. Проверьте соединение или что бэкенд перезапущен с последним кодом."
                  );
                }
              }, 5000);
            }}
            className="mt-10 rounded-xl bg-gradient-to-r from-[#8b0000] to-[#5c0000] border border-[#d4af37] px-10 py-4 text-xl font-bold text-[#f3e5ab] hover:brightness-125 disabled:opacity-50"
          >
            {playAgainState === "sending" ? t("sending") : t("play_again")}
          </button>
        )}
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl text-yellow-400 mb-4">
            {loadingText || "Загрузка..."}
          </h2>
          <div className="h-2 w-64 bg-zinc-800 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-yellow-500 animate-pulse w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "vote_result" && voteResult) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
        <h1
          className="text-5xl font-black text-red-600 tracking-widest text-center px-6"
          style={{ textShadow: "0 0 20px #8b0000" }}
        >
          {voteResult.executed
            ? `${voteResult.executed.name} был казнён`
            : "Никто не был казнён"}
        </h1>
      </div>
    );
  }

  if ((phase === "voting" || phase === "voting_runoff") && voteData) {
    const blocked = (voteData.blockedVoters || []).includes(socket.id);
    return (
      <VotingScreen
        round={voteData.round}
        players={voteData.candidates || []}
        endsAt={voteData.endsAt}
        isMayor={isMayor}
        blocked={blocked}
        onVote={(tid) => socket.emit("cast-vote", roomCode, tid)}
        onForceEnd={() => socket.emit("finish-voting", roomCode)}
      />
    );
  }

  if (phase === "vote_pending") {
    if (isMayor) {
      const candidate = pendingCandidate
        ? {
            ...pendingCandidate,
            avatar: players.find((p) => p.id === pendingCandidate.id)?.avatar
          }
        : null;
      return (
        <MayorExecutionScreen
          candidate={candidate}
          onExecute={() => socket.emit("mayor-execute", roomCode)}
        />
      );
    }
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
        <p className="text-2xl text-yellow-400 animate-pulse">
          Мэр выносит приговор...
        </p>
      </div>
    );
  }

  if (phase === "night_end" && !isMayor) {
    return (
      <BlackPhrase text="Ночь подходит к концу... мэр решает, когда наступит утро" />
    );
  }

  if (isMayor) {
    return (
      <MayorPanel
        roomCode={roomCode}
        phase={phase}
        players={players}
        nightInfo={nightInfo}
        morningResults={morningResults}
        readyCount={readyCount}
        onBeginNight={() => socket.emit("begin-night", roomCode)}
        onMorning={() => socket.emit("mayor-morning", roomCode)}
        onBeginVote={() => socket.emit("begin-voting", roomCode)}
        onNextNight={() => socket.emit("night-next", roomCode)}
        onKill={(id, reason) =>
          socket.emit("mayor-kill", roomCode, id, reason)
        }
        onForceWin={(side, reason) =>
          socket.emit("mayor-force-win", roomCode, side, reason)
        }
      />
    );
  }

  if (phase === "waiting_ready") {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center gap-6">
        <h2 className="text-3xl text-yellow-400">Ваша роль получена</h2>
        {myRole && (
          <p className="text-xl text-white">
            Вы: <span className="text-yellow-500 font-bold">{myRole}</span>
          </p>
        )}
        <button
          type="button"
          disabled={readySent}
          onClick={() => {
            if (readySent) return;
            setReadySent(true);
            socket.emit("game-player-ready", roomCode);
          }}
          className={`px-10 py-4 rounded-xl text-xl font-bold transition ${
            readySent
              ? "bg-green-700 text-white cursor-default"
              : "bg-red-700 hover:bg-red-600 text-white"
          }`}
        >
          {readySent ? t("waiting_for_players") : t("ready")}
        </button>
        <p className="text-gray-500">{t("ready_count")}: {readyCount}</p>
      </div>
    );
  }

  if (phase === "night" || phase === "night_wait") {
    if (isMyTurn && nightInfo) {
      return (
        <PlayerNight
          step={nightInfo.step}
          targets={nightInfo.targets}
          onAction={(targetId, mode) =>
            socket.emit("night-action", roomCode, { targetId, mode })
          }
          onDone={() => socket.emit("night-next", roomCode)}
        />
      );
    }
    return <BlackPhrase text={phrase || nightInfo?.phrase} />;
  }

  if (phase === "morning") {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-8">
        <h2 className="text-4xl text-yellow-400 mb-6">Утро</h2>
        <ul className="text-white text-xl space-y-2 max-w-lg">
          {morningResults
            .filter((r) => r.type === "death" || r.type === "saved")
            .map((r, i) => (
              <li
                key={i}
                className={
                  r.type === "death" ? "text-red-400" : "text-green-400"
                }
              >
                {r.text}
              </li>
            ))}
          {morningResults.length === 0 && (
            <li className="text-gray-400">Ночь прошла спокойно</li>
          )}
        </ul>
        {privateInfo && (
          <p className="mt-6 text-yellow-300">Инфо: {privateInfo.text}</p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center text-white">
      <p>Фаза: {phase}</p>
    </div>
  );
}
