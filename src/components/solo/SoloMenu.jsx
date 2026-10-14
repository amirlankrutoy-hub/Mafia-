import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faShuffle, faPlus, faUsers, faDice, faLock, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import roles from "../../data/roles";
import { TEAMS, TEAM_ORDER } from "../../data/teams";
import { ownsRole } from "../../services/wallet";
import { soloInfo, SOLO_MIN_PLAYERS } from "../../services/solo";
import "../../solo.css";

const RULES = [
  { n: "4–6", m: 1, x: 1 },
  { n: "7–10", m: 2, x: 1 },
  { n: "11–15", m: 3, x: 2 },
  { n: "16–20", m: 4, x: 3 }
];

/** Главный экран «Одиночного режима»: Играть (случайная комната) или Создать */
export default function SoloMenu({ busy, onPlay, onCreate, onBack }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => soloInfo().then((r) => alive && r && r.rooms !== undefined && setInfo(r));
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const noRooms = info && info.rooms === 0;

  return (
    <div className="solo-menu">
      <div className="solo-menu__glow" />
      <button type="button" onClick={onBack} className="solo-back">
        <FontAwesomeIcon icon={faArrowLeft} /> Назад
      </button>

      <header className="relative text-center">
        <div className="solo-dice">
          <FontAwesomeIcon icon={faDice} />
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.35em] text-[#9fb4ff]">Без мэра · случайные роли</p>
        <h1 className="solo-title font-display text-4xl font-black sm:text-6xl">Одиночный режим</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[#c9c3e6]">
          Никакого ведущего и настроек: заходите в комнату, а судьба сама раздаст роли. Ночь, утро и голосование идут
          автоматически.
        </p>
      </header>

      <div className="relative mt-6 flex flex-wrap justify-center gap-2 text-xs">
        <span className="solo-stat">
          <span className={`solo-stat__dot ${info?.rooms ? "solo-stat__dot--on" : ""}`} />
          Открытых комнат: <b>{info ? info.rooms : "…"}</b>
        </span>
        <span className="solo-stat">
          <FontAwesomeIcon icon={faUsers} /> Ждут игры: <b>{info ? info.waiting : "…"}</b>
        </span>
        <span className="solo-stat">
          <FontAwesomeIcon icon={faDice} /> Идёт партий: <b>{info ? info.playing : "…"}</b>
        </span>
      </div>

      <div className="relative mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
        <button type="button" disabled={busy} onClick={onPlay} className="solo-cta solo-cta--play">
          <span className="solo-cta__icon">
            <FontAwesomeIcon icon={faShuffle} />
          </span>
          <span className="text-left">
            <span className="block font-display text-2xl font-black">{busy === "play" ? "Ищем комнату…" : "Играть"}</span>
            <span className="block text-xs opacity-80">Перенесём в случайную открытую комнату</span>
          </span>
        </button>
        <button type="button" disabled={busy} onClick={onCreate} className="solo-cta solo-cta--create">
          <span className="solo-cta__icon">
            <FontAwesomeIcon icon={faPlus} />
          </span>
          <span className="text-left">
            <span className="block font-display text-2xl font-black">{busy === "create" ? "Создаём…" : "Создать комнату"}</span>
            <span className="block text-xs opacity-80">Другие игроки попадут к вам через «Играть»</span>
          </span>
        </button>
      </div>
      {noRooms && (
        <p className="relative mt-3 text-center text-xs text-[#fca5a5]">
          <FontAwesomeIcon icon={faCircleInfo} className="mr-1" />
          Сейчас нет открытых комнат — «Играть» не сработает. Создайте свою, и к вам присоединятся.
        </p>
      )}

      <div className="relative mx-auto mt-8 grid max-w-4xl gap-4 lg:grid-cols-[1fr_1.3fr]">
        <section className="solo-panel">
          <h2 className="font-display text-lg font-black text-[#e0e7ff]">Сколько кого будет</h2>
          <p className="mt-1 text-[11px] text-[#9aa3c7]">Начать можно от {SOLO_MIN_PLAYERS} игроков. Остальные — мирные жители.</p>
          <div className="mt-3 space-y-1.5">
            {RULES.map((r) => (
              <div key={r.n} className="solo-rule">
                <span className="w-14 font-mono font-bold text-[#e0e7ff]">{r.n}</span>
                <span className="solo-rule__pill" style={{ "--c": TEAMS.mafia.color }}>
                  {r.m} мафия
                </span>
                <span className="solo-rule__pill" style={{ "--c": TEAMS.neutrals.color }}>
                  {r.x} нейтрал
                </span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-[#9aa3c7]">и дальше: каждые 5 игроков +1 мафия и +1 нейтрал</p>
          </div>
        </section>

        <section className="solo-panel">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-black text-[#e0e7ff]">Роли, которые могут вам выпасть</h2>
            <Link to="/shop?tab=chests" className="text-[11px] font-bold text-[#9fb4ff] hover:underline">
              Открыть ещё →
            </Link>
          </div>
          <p className="mt-1 text-[11px] text-[#9aa3c7]">Только открытые в вашей коллекции. Мафиози и Обыватель есть у всех.</p>
          {TEAM_ORDER.map((t) => (
            <div key={t} className="mt-3">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: TEAMS[t].color }}>
                {TEAMS[t].label}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {roles
                  .filter((r) => r.category === t)
                  .map((r) => {
                    const own = ownsRole(r.id);
                    return (
                      <span key={r.id} className={`solo-own ${own ? "" : "solo-own--locked"}`} style={{ "--c": TEAMS[t].color }}>
                        <img src={r.image} alt="" />
                        {r.name}
                        {!own && <FontAwesomeIcon icon={faLock} className="text-[9px]" />}
                      </span>
                    );
                  })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
