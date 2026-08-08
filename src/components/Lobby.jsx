import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFaceSmile,
  faVolumeHigh,
  faVolumeXmark,
  faChevronDown,
  faChevronUp
} from "@fortawesome/free-solid-svg-icons";
import { EMOJIS, DECORATIONS, ADMIN_DECORATION } from "../data/shopData";
import { ownsEmoji } from "../services/wallet";
import { useMusic } from "../context/MusicContext";
import DecorationSVG from "./shop/DecorationSVG";

const ALL_DECORATIONS = [...DECORATIONS, ADMIN_DECORATION];

export default function Lobby({
  roomCode,
  players = [],
  mayor,
  isMayor,
  playerReady,
  onPlayerReady,
  canSetupGame,
  onStartSetup,
  onLeave,
  onKick,
  emojiMap = {},
  onSendEmoji,
  isAdminViewer,
  onAdminGive
}) {
  const guestPlayers = players.filter((p) => !p.isMayor);
  const readyCount = guestPlayers.filter((p) => p.ready).length;
  const totalGuests = guestPlayers.length;
  const ownedEmojis = EMOJIS.filter((e) => ownsEmoji(e.id));

  const [emojiOpen, setEmojiOpen] = useState(false);
  const { lobbyMuted, toggleLobbyMute, playLobby, stopLobby } = useMusic();

  // Cowboy-тема в лобби
  useEffect(() => {
    playLobby();
    return () => stopLobby();
  }, [playLobby, stopLobby]);

  const handleLobbyMusic = () => {
    toggleLobbyMute();
    if (lobbyMuted) {
      setTimeout(() => playLobby(), 50);
    }
  };

  const handleGiveMafio = (player) => {
    if (!onAdminGive || !player?.id) return;
    const amount = window.prompt(
      `Сколько Мафио выдать игроку «${player.name}»?`,
      "1000"
    );
    const value = Number(amount);
    if (value > 0) {
      onAdminGive(player.id, value);
    }
  };

  const getDecoration = (decorationId) => {
    if (!decorationId) return null;
    return ALL_DECORATIONS.find((d) => d.id === decorationId) || null;
  };

  const mayorDecoration = mayor ? getDecoration(mayor.decoration) : null;

  return (
    <div className="w-full min-h-screen flex justify-center items-start px-3 py-3 sm:px-6 sm:py-8">
      <div className="w-full max-w-md sm:max-w-3xl lg:max-w-5xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#080402] rounded-3xl p-4 sm:p-8 shadow-2xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:justify-between justify-between items-start sm:items-center mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl text-white font-bold">Комната</h1>
            <p className="text-yellow-400 font-bold tracking-widest text-4xl sm:text-5xl break-all">
              {roomCode}
            </p>
            {isMayor && (
              <button
                onClick={() => {
                  const link = `${window.location.origin}/online?autojoin=${roomCode}`;
                  navigator.clipboard?.writeText(link);
                  alert("Ссылка комнаты скопирована");
                }}
                className="mt-2 bg-yellow-500 text-black px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold active:scale-95"
              >
                Скопировать ссылку/код
              </button>
            )}
            <button
              type="button"
              onClick={handleLobbyMusic}
              title={lobbyMuted ? "Включить музыку лобби" : "Выключить музыку лобби"}
              className={`mt-2 h-11 w-11 rounded-full border-2 flex items-center justify-center ${
                lobbyMuted
                  ? "border-zinc-600 bg-black/80 text-zinc-400"
                  : "border-[#d4af37] bg-[#1c100b]/95 text-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.4)]"
              }`}
            >
              <FontAwesomeIcon
                icon={lobbyMuted ? faVolumeXmark : faVolumeHigh}
                className="text-lg"
              />
            </button>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-gray-400 text-sm">Игроков</p>
            <p className="text-3xl sm:text-4xl text-white font-bold">{totalGuests}</p>
          </div>
        </div>

        {/* Мэр — с пином/украшением */}
        {mayor && (
          <div className="mb-5 sm:mb-6 rounded-2xl border border-yellow-500/40 bg-yellow-400/5 p-3 sm:p-4 text-white flex items-center gap-3 sm:gap-4 relative overflow-visible">
            {/* Пин / украшение над аватаром мэра */}
            {mayorDecoration && (
              <div className="absolute -top-5 left-6 sm:left-8 z-20 pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                <DecorationSVG
                  kind={mayorDecoration.kind}
                  colors={mayorDecoration.colors}
                  className="w-14 h-10 sm:w-16 sm:h-12"
                />
              </div>
            )}
            {/* Эмодзи над мэром */}
            {emojiMap[mayor.id] && (
              <span className="absolute top-1 right-3 text-2xl animate-bounce pointer-events-none z-20">
                {emojiMap[mayor.id]}
              </span>
            )}
            <div className="flex-shrink-0 h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-2xl bg-black border border-yellow-500 relative z-10">
              <img
                src={mayor.avatar || "/avatars/avatar1.svg"}
                alt={mayor.name || "Мэр"}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-sm uppercase tracking-[0.2em] text-yellow-300">
                Мэр
              </div>
              <div className="mt-1 text-base sm:text-lg font-bold truncate flex items-center gap-2">
                {mayor.name}
                <span className="text-yellow-400 text-xl">👑</span>
              </div>
            </div>
          </div>
        )}

        {/* Сетка игроков */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {guestPlayers.length > 0 ? (
            guestPlayers.map((p) => {
              const decoration = getDecoration(p.decoration);
              return (
                <div
                  key={p.id || p.name}
                  className="rounded-2xl border border-zinc-700 bg-zinc-950/80 p-3 sm:p-4 text-white flex flex-col gap-2 relative overflow-visible"
                >
                  {/* Пин / украшение */}
                  {decoration && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                      <DecorationSVG
                        kind={decoration.kind}
                        colors={decoration.colors}
                        className="w-16 h-12"
                      />
                    </div>
                  )}
                  {/* Летающий эмодзи над карточкой */}
                  {emojiMap[p.id] && (
                    <span className="absolute top-1 right-2 text-2xl animate-bounce pointer-events-none z-20">
                      {emojiMap[p.id]}
                    </span>
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-black border border-zinc-600 shrink-0">
                      <img
                        src={p.avatar || "/avatars/avatar1.svg"}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-sm sm:text-base">{p.name}</p>
                      <p
                        className={`text-[10px] sm:text-xs font-bold ${
                          p.ready ? "text-emerald-400" : "text-zinc-500"
                        }`}
                      >
                        {p.ready ? "✓ Готов" : "Ожидание..."}
                      </p>
                    </div>
                  </div>
                  {isMayor && (
                    <button
                      type="button"
                      onClick={() => onKick?.(p.id)}
                      className="mt-1 w-full bg-red-900/80 hover:bg-red-800 text-white py-1.5 rounded-lg text-xs font-bold"
                    >
                      Выгнать
                    </button>
                  )}
                  {isAdminViewer && onAdminGive && (
                    <button
                      type="button"
                      onClick={() => handleGiveMafio(p)}
                      className="w-full bg-yellow-700/80 text-black py-1.5 rounded-lg text-xs font-bold"
                    >
                      + Мафио
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-6 sm:p-8 text-center text-base sm:text-lg text-zinc-300">
              Пока никто не присоединился.
            </div>
          )}
        </div>

        {/* Кнопка эмодзи + выезжающая панель */}
        {ownedEmojis.length > 0 && (
          <div className="mt-5 sm:mt-6">
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              className="mx-auto flex items-center gap-2 rounded-xl border-2 border-[#d4af37]/60 bg-[#1c100b] px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-[#d4af37] hover:border-[#d4af37] hover:bg-[#2a170e] active:scale-95 transition shadow-md"
            >
              <FontAwesomeIcon icon={faFaceSmile} className="text-lg" />
              Эмодзи
              <FontAwesomeIcon
                icon={emojiOpen ? faChevronUp : faChevronDown}
                className="text-xs opacity-70"
              />
            </button>

            {emojiOpen && (
              <div className="mt-3 mx-auto max-w-md rounded-2xl border border-[#d4af37]/40 bg-black/70 p-3 shadow-inner">
                <div className="max-h-40 overflow-y-auto overscroll-contain pr-1 grid grid-cols-5 sm:grid-cols-6 gap-2 scrollbar-thin">
                  {ownedEmojis.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        onSendEmoji?.(e.id);
                      }}
                      className="text-2xl sm:text-3xl rounded-xl border border-yellow-700/40 bg-[#120a07] aspect-square flex items-center justify-center hover:border-yellow-400 hover:scale-110 active:scale-95 transition"
                      title="Отправить эмодзи"
                    >
                      {e.symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Кнопки внизу */}
        {isMayor ? (
          <div className="mt-6 sm:mt-8 flex flex-col items-center gap-3">
            {canSetupGame || (totalGuests > 0 && readyCount === totalGuests) ? (
              <button
                onClick={onStartSetup}
                className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-xl active:scale-95 transition"
              >
                ⚙ Настроить игру
              </button>
            ) : (
              <div className="text-center text-gray-300 text-sm sm:text-lg">
                ⏳ Ожидание готовности игроков... ({readyCount}/{totalGuests})
              </div>
            )}
            <button
              type="button"
              onClick={onLeave}
              className="text-xs text-zinc-500 underline"
            >
              Выйти из комнаты
            </button>
          </div>
        ) : (
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-6">
            <button
              className="bg-gradient-to-r from-[#8b0000] to-[#5c0000] w-full sm:w-[220px] h-14 sm:h-[70px] rounded-xl text-white font-bold hover:opacity-90 active:scale-95 transition border border-[#d4af37]/40"
              onClick={onPlayerReady}
            >
              {playerReady ? "ОТМЕНА" : "ГОТОВО"}
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="bg-amber-700 hover:bg-amber-800 text-white w-full sm:w-[200px] py-4 rounded-xl border border-zinc-600 font-bold active:scale-95 transition"
            >
              Выйти из комнаты
            </button>
          </div>
        )}
      </div>
    </div>
  );
}