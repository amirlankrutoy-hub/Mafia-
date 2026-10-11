import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faTrophy, faStar, faMagnifyingGlass, faRotate } from "@fortawesome/free-solid-svg-icons";
import { getLeaderboard } from "../services/presence";
import PlayerProfileModal from "../components/PlayerProfileModal";
import Avatar from "../components/ui/Avatar";
import useSeo from "../hooks/useSeo";

const PODIUM = {
  1: { h: "h-44 sm:h-56", ring: "from-[#fff3c4] via-[#d4af37] to-[#8b6b12]", glow: "rgba(243,210,122,0.55)", label: "text-[#f3d27a]", size: 108 },
  2: { h: "h-32 sm:h-40", ring: "from-[#f4f4f5] via-[#a1a1aa] to-[#52525b]", glow: "rgba(212,212,216,0.35)", label: "text-zinc-200", size: 88 },
  3: { h: "h-24 sm:h-32", ring: "from-[#fdba74] via-[#c2410c] to-[#7c2d12]", glow: "rgba(234,88,12,0.35)", label: "text-orange-300", size: 80 }
};

function winrate(p) {
  return p.games ? Math.round((p.wins / p.games) * 100) : 0;
}

function PodiumPlace({ p, place, onOpen }) {
  const st = PODIUM[place];
  if (!p) return <div className="flex-1" />;
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className="group flex flex-1 flex-col items-center anim-fade-up"
      style={{ "--i": place === 1 ? 2 : place === 2 ? 4 : 6 }}
    >
      <div className="relative">
        {place === 1 && (
          <FontAwesomeIcon
            icon={faCrown}
            className="absolute -top-9 left-1/2 -translate-x-1/2 text-3xl text-[#f3d27a] drop-shadow-[0_0_14px_rgba(243,210,122,0.9)] anim-float"
          />
        )}
        <div className={`rounded-full bg-gradient-to-br ${st.ring} p-[3px] transition-transform duration-500 group-hover:scale-105`} style={{ boxShadow: `0 0 40px ${st.glow}` }}>
          <div className="rounded-full bg-[#0a0605] p-1">
            <Avatar src={p.icon} size={st.size} ring={false} />
          </div>
        </div>
        <span className={`absolute -bottom-2 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br ${st.ring} font-display text-sm font-black text-black ring-4 ring-[#0a0605]`}>
          {place}
        </span>
      </div>
      <div className="mt-4 w-full max-w-[9rem] truncate text-center font-bold text-[#f3e5ab]">{p.name}</div>
      <div className={`mt-0.5 flex items-center gap-1.5 text-sm font-black ${st.label}`}>
        <FontAwesomeIcon icon={faTrophy} className="text-xs" /> {p.wins}
      </div>
      <div
        className={`relative mt-3 w-full overflow-hidden rounded-t-2xl ${st.h} border-x border-t border-[#d4af37]/25 bg-gradient-to-b from-[#d4af37]/20 via-[#2a170e]/60 to-transparent`}
        style={{ animation: `podiumRise 1s var(--ease-out) both`, animationDelay: `${0.3 + (3 - place) * 0.15}s` }}
      >
        <span className="absolute inset-x-0 top-3 text-center font-display text-5xl font-black text-[#d4af37]/15 sm:text-6xl">{place}</span>
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(255,240,200,0.12)_50%,transparent_65%)] bg-[length:250%_100%] [animation:shimmerText_4s_linear_infinite]" />
      </div>
    </button>
  );
}

export default function Leaderboard({ account }) {
  useSeo({
    title: "Мировой топ игроков в Мафию",
    description: "Рейтинг лучших игроков Mafia Play: победы, винрейт и звания «Игрок матча». Сыграйте и поднимитесь в мировом топе.",
    path: "/top"
  });

  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const load = async () => {
    setSpinning(true);
    const res = await getLeaderboard();
    setSpinning(false);
    if (!res) return setError(true);
    setError(false);
    setData(res);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const list = data?.list || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(3);
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q));
  }, [list, query]);
  const maxWins = Math.max(1, ...list.map((p) => p.wins));

  return (
    <div className="mx-auto max-w-4xl">
      <style>{`@keyframes podiumRise { from { transform: scaleY(0); transform-origin: bottom; opacity: 0 } to { transform: scaleY(1); transform-origin: bottom; opacity: 1 } }`}</style>

      <header className="relative text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] max-w-full -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(243,210,122,0.25),transparent_70%)]" />
        <p className="eyebrow anim-fade-up">Зал славы</p>
        <h1 className="mt-2 font-display text-4xl font-black sm:text-6xl anim-blur-in">
          <span className="gold-text">Мировой топ</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#a8916c] anim-fade-up" style={{ "--i": 2 }}>
          Победы засчитывает сервер в конце каждой партии. Всего в рейтинге: {data?.total ?? "—"}
        </p>
      </header>

      {error && !data ? (
        <div className="noir-card mt-10 p-10 text-center">
          <p className="text-red-300">Не удалось загрузить рейтинг — сервер не отвечает.</p>
          <button onClick={load} className="btn btn-ghost mt-4">Попробовать снова</button>
        </div>
      ) : !data ? (
        <div className="mt-16 flex items-end justify-center gap-4">
          {[2, 1, 3].map((p) => (
            <div key={p} className={`w-28 rounded-t-2xl bg-[#d4af37]/10 animate-pulse ${PODIUM[p].h}`} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="noir-card mt-10 p-10 text-center text-[#a8916c]">
          Пока никто не сыграл ни одной партии. Станьте первым в истории города!
        </div>
      ) : (
        <>
          {/* Пьедестал */}
          <div className="mt-14 flex items-end justify-center gap-2 sm:gap-5">
            <PodiumPlace p={list[1]} place={2} onOpen={setOpenId} />
            <PodiumPlace p={list[0]} place={1} onOpen={setOpenId} />
            <PodiumPlace p={list[2]} place={3} onOpen={setOpenId} />
          </div>

          {/* Моё место */}
          {data.me && (
            <div className="sticky top-16 z-20 mt-6 lg:top-4 anim-fade-up" style={{ "--i": 8 }}>
              <div className="noir-card flex items-center gap-3 border-[#d4af37] p-3 shadow-[0_0_30px_-10px_rgba(212,175,55,0.6)]">
                <span className="w-12 text-center font-display text-xl font-black gold-text">#{data.me.rank}</span>
                <Avatar src={data.me.icon} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-[#f3e5ab]">Вы · {data.me.name}</div>
                  <div className="text-[11px] text-[#a8916c]">
                    {data.me.games} игр · винрейт {winrate(data.me)}% · MVP {data.me.mvp}
                  </div>
                </div>
                <span className="flex items-center gap-1.5 font-black text-[#f3d27a]">
                  <FontAwesomeIcon icon={faTrophy} className="text-xs" /> {data.me.wins}
                </span>
              </div>
            </div>
          )}

          {/* Поиск */}
          <div className="mt-6 flex gap-2">
            <div className="relative flex-1">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a8916c]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти игрока в рейтинге" className="input-noir !pl-11" />
            </div>
            <button onClick={load} className="btn btn-ghost btn-icon !rounded-xl shrink-0" aria-label="Обновить">
              <FontAwesomeIcon icon={faRotate} className={spinning ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Таблица */}
          <div className="mt-4 space-y-2">
            {filtered.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenId(p.id)}
                className={`noir-card noir-card--flat noir-card--hover spotlight flex w-full items-center gap-3 p-3 text-left anim-slide-left ${
                  account?.id === p.id ? "!border-[#d4af37]" : ""
                }`}
                style={{ "--i": Math.min(i, 15) }}
              >
                <span className={`w-10 shrink-0 text-center font-display text-lg font-black ${p.rank <= 3 ? "gold-text" : "text-[#a8916c]"}`}>
                  {p.rank}
                </span>
                <Avatar src={p.icon} size={42} online={p.online} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-[#f3e5ab]">{p.name}</span>
                    {p.mvp > 0 && (
                      <span className="chip !px-1.5 !py-0 !text-[9px]" title="Игрок матча">
                        <FontAwesomeIcon icon={faStar} /> {p.mvp}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#8b0000] via-[#d4af37] to-[#f3d27a]"
                        style={{ width: `${(p.wins / maxWins) * 100}%`, transition: "width 1s var(--ease-out)" }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-[10px] text-[#a8916c]">
                      {p.games} игр · {winrate(p)}%
                    </span>
                  </div>
                </div>
                <span className="flex w-14 shrink-0 items-center justify-end gap-1.5 font-black text-[#f3d27a]">
                  <FontAwesomeIcon icon={faTrophy} className="text-xs" /> {p.wins}
                </span>
              </button>
            ))}
            {filtered.length === 0 && query && <p className="py-6 text-center text-sm text-[#a8916c]">Никого не нашли</p>}
          </div>
        </>
      )}

      {openId && <PlayerProfileModal accountId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
