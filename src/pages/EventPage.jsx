import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel, faRightLeft, faCheck, faXmark, faRotate, faScaleBalanced, faArrowRight, faTrophy } from "@fortawesome/free-solid-svg-icons";
import FortuneWheel from "../components/event/FortuneWheel";
import TeniExchangeModal from "../components/shop/TeniExchangeModal";
import DecorationSVG from "../components/shop/DecorationSVG";
import { WHEEL, PRIZE_TIERS, SPIN_PRICE, SPIN5_PRICE, DUPLICATE_TOKENS, chanceOf } from "../data/courtEvent";
import roles from "../data/roles";
import { spinCourt, getEventState, remainingPrizes } from "../services/courtEvent";
import { getTeniBalance } from "../services/teniWallet";
import { getWallet } from "../services/wallet";
import { toast } from "../services/toast";
import useSeo from "../hooks/useSeo";
import "../event.css";
import "../achievements.css";

/** Флаг «Поздравляем, вы выбили главный приз!!» — когда выпала роль события */
function JackpotFlag({ prize, onDone }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 6500);
    const t2 = setTimeout(() => onDone?.(), 7200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[900] flex justify-center" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className={`ach-flag-wrap ach-flag-wrap--gold jackpot-flag ${leaving ? "ach-flag-wrap--leave" : ""}`}>
        <div className="ach-flag__aura" />
        <div className="ach-flag__rays" />
        <button type="button" className="ach-flag pointer-events-auto" onClick={() => setLeaving(true)} aria-label="Закрыть">
          <span className="ach-flag__rod" />
          <span className="ach-flag__body">
            <span className="ach-flag__sheen" />
            <span className="ach-flag__label">Главный приз</span>
            <span className="ach-flag__medal jackpot-flag__medal">
              <img src={prize.image} alt="" />
            </span>
            <span className="ach-flag__title">Поздравляем, вы выбили главный приз!!</span>
            <span className="ach-flag__reward">Роль «{prize.name}»</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function PrizeArt({ prize, size = "md" }) {
  const cls = `prize-art prize-art--${size} prize-art--${prize.kind}`;
  if (prize.kind === "tokens")
    return (
      <span className={cls}>
        <img src="/tokens.png" alt="" />
      </span>
    );
  if (prize.kind === "emoji") return <span className={`${cls} prize-art__emoji`}>{prize.symbol}</span>;
  if (prize.kind === "decoration")
    return (
      <span className={cls}>
        <DecorationSVG kind={prize.deco.kind} colors={prize.deco.colors} className="h-full w-full" />
      </span>
    );
  return (
    <span className={cls}>
      <img src={prize.image} alt="" />
    </span>
  );
}

const CONFETTI_COLORS = ["#f3d27a", "#ef4444", "#fff1b8", "#d4af37", "#fb923c", "#60a5fa"];

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
        drift: (Math.random() - 0.5) * 200
      })),
    []
  );
  return (
    <div className="ev-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, "--rot": `${b.rot}deg`, "--drift": `${b.drift}px` }}
        />
      ))}
    </div>
  );
}

function ResultModal({ results, onClose, onAgain, canAgain }) {
  const best = results.reduce((a, r) => (r.prize.weight < a.prize.weight ? r : a), results[0]);
  const many = results.length > 1;
  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md anim-fade-in" onClick={onClose} />
      <Confetti />
      <div className="ev-result anim-scale-in" style={{ "--c": PRIZE_TIERS[best.prize.tier].color }}>
        <div className="ev-result__rays" />
        <button onClick={onClose} className="topup__close" aria-label="Закрыть">
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <p className="relative text-[10px] font-black uppercase tracking-[0.35em] text-[#f3d27a]">{many ? "Ваши награды" : "Ваша награда"}</p>
        <div className={`relative mt-4 grid gap-3 ${many ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-1"}`}>
          {results.map((r, i) => {
            const tier = PRIZE_TIERS[r.prize.tier];
            return (
              <div
                key={i}
                className={`ev-prize ${many ? "" : "ev-prize--big"} ${r.prize === best.prize && many ? "ev-prize--best" : ""}`}
                style={{ "--c": tier.color, "--i": i, animationDelay: `${i * 0.18}s` }}
              >
                <PrizeArt prize={r.prize} size={many ? "md" : "xl"} />
                <span className="ev-prize__tier">{tier.label}</span>
                <b className="ev-prize__name">{r.prize.name}</b>
                {r.duplicate ? (
                  <span className="ev-prize__dup">Уже есть → +{DUPLICATE_TOKENS} Токенов</span>
                ) : r.prize.kind === "role" ? (
                  <span className="ev-prize__new">Новая роль в коллекции!</span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="relative mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Забрать
          </button>
          {canAgain && (
            <button type="button" onClick={onAgain} className="btn btn-gold">
              <FontAwesomeIcon icon={faRotate} /> Ещё раз
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventPage() {
  useSeo({ title: "Суд Мафий", description: "Событие «Суд Мафий»: колесо фортуны с ролями Судья и Адвокат, аватарками и наградами.", path: "/event" });
  const wheel = useRef(null);
  const [teni, setTeni] = useState(getTeniBalance());
  const [wallet, setWallet] = useState(getWallet());
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [lastCount, setLastCount] = useState(1);
  const [exchange, setExchange] = useState(false);
  const [ev, setEv] = useState(getEventState());
  // Колесо обновляем только после закрытия окна награды — чтобы сектор не исчез во время показа
  const [shown, setShown] = useState(() => remainingPrizes());
  const [jackpot, setJackpot] = useState(null);

  useEffect(() => {
    const refresh = () => {
      setTeni(getTeniBalance());
      setWallet(getWallet());
      setEv(getEventState());
    };
    ["mafia-teni-changed", "mafia-wallet-changed", "mafia-event-changed"].forEach((e) => window.addEventListener(e, refresh));
    return () => ["mafia-teni-changed", "mafia-wallet-changed", "mafia-event-changed"].forEach((e) => window.removeEventListener(e, refresh));
  }, []);

  const spin = async (count) => {
    if (busy) return;
    // колесо должно показывать актуальный набор секторов до начала вращения
    const list = remainingPrizes();
    if (list.length !== shown.length) {
      setShown(list);
      await new Promise((r) => setTimeout(r, 80));
    }
    const res = spinCourt(count);
    if (!res.success) {
      const noTeni = /теней/.test(res.message || "");
      toast({
        kind: "error",
        title: noTeni ? "Не хватает теней" : "Нельзя крутить",
        text: noTeni ? "Обменяйте Токены на Тени — кнопка рядом с балансом." : res.message
      });
      return;
    }
    setBusy(true);
    setLastCount(count);
    // колесо останавливается на самой редкой из выпавших наград
    const best = res.results.reduce((a, r) => (r.prize.weight < a.prize.weight ? r : a), res.results[0]);
    await wheel.current?.spinTo(Math.max(0, list.findIndex((p) => p.index === best.prize.index)));
    setBusy(false);
    setResults(res.results);
    const role = res.results.find((r) => r.prize.kind === "role");
    if (role) setJackpot(role.prize);
  };

  const eventRoles = roles.filter((r) => r.event);
  const left = remainingPrizes(ev);
  const complete = left.length === 0 && shown.length === 0;
  const wonSet = new Set(ev.won || []);
  const groups = Object.keys(PRIZE_TIERS).map((t) => ({ tier: t, list: WHEEL.filter((p) => p.tier === t) }));
  const recent = (ev.history || []).slice(0, 8).map((h) => ({ ...h, prize: WHEEL[h.index] })).filter((h) => h.prize);

  return (
    <div className="mx-auto max-w-6xl py-4">
      <section className="ev-stage">
        <div className="ev-curtain ev-curtain--l" />
        <div className="ev-curtain ev-curtain--r" />
        <div className="ev-dust" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.7}s`, animationDuration: `${7 + (i % 5)}s` }} />
          ))}
        </div>

        <header className="relative z-[2] text-center">
          <span className="ev-badge">
            <FontAwesomeIcon icon={faGavel} /> Событие
          </span>
          <h1 className="ev-title font-display">Суд Мафий</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#e8cfc0]">
            Крутите колесо правосудия: 30 наград, редкие аватарки и две роли, которые нельзя получить больше нигде — <b className="text-[#fca5a5]">Судья</b> и{" "}
            <b className="text-[#fca5a5]">Адвокат</b>.
          </p>
        </header>

        <div className="relative z-[2] mt-6 grid items-center gap-6 lg:grid-cols-[1fr_300px]">
          {complete ? (
            <div className="ev-complete">
              <div className="ev-complete__trophy">
                <FontAwesomeIcon icon={faTrophy} />
              </div>
              <h2 className="ev-title font-display">Вы закончили событие!</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-[#e8cfc0]">
                Все 30 наград «Суда Мафий» забраны. Колесо правосудия больше не крутится — вы прошли событие до конца.
              </p>
              <span className="ev-badge mt-4">
                <FontAwesomeIcon icon={faCheck} /> Собрано 30 из 30
              </span>
            </div>
          ) : (
            <FortuneWheel ref={wheel} prizes={shown} />
          )}

          <aside className="ev-panel">
            <div className="ev-balance">
              <img src="/krital.svg" alt="" />
              <div className="min-w-0 flex-1">
                <span>Ваши тени</span>
                <b>{teni.toLocaleString("ru-RU")}</b>
              </div>
              <button type="button" onClick={() => setExchange(true)} className="ev-balance__btn" title="Обменять Токены на Тени">
                <FontAwesomeIcon icon={faRightLeft} />
              </button>
            </div>

            <div className="ev-left">
              <span>Осталось на колесе</span>
              <b>
                {left.length} <small>/ {WHEEL.length}</small>
              </b>
              <div className="ev-left__bar">
                <i style={{ width: `${((WHEEL.length - left.length) / WHEEL.length) * 100}%` }} />
              </div>
            </div>
            <button type="button" disabled={busy || complete || teni < SPIN_PRICE || !left.length} onClick={() => spin(1)} className="ev-spin">
              <span className="ev-spin__label">{busy ? "Крутится…" : "Крутить"}</span>
              <span className="ev-spin__price">
                <img src="/krital.svg" alt="" /> {SPIN_PRICE}
              </span>
            </button>
            <button type="button" disabled={busy || complete || teni < SPIN5_PRICE || left.length < 5} onClick={() => spin(5)} className="ev-spin ev-spin--x5">
              <span className="ev-spin__label">Крутить ×5</span>
              <span className="ev-spin__price">
                <img src="/krital.svg" alt="" /> {SPIN5_PRICE}
                <s className="ml-1 opacity-60">{SPIN_PRICE * 5}</s>
              </span>
            </button>
            <p className="text-center text-[11px] text-[#c9a99a]">
              Выпавшая награда исчезает с колеса. Если она у вас уже была — вместо неё {DUPLICATE_TOKENS} Токенов. Прокручено:{" "}
              <b className="text-[#f3d27a]">{ev.spins || 0}</b>
            </p>

            {recent.length > 0 && (
              <div className="ev-recent">
                <p>Последние награды</p>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((h, i) => (
                    <span key={i} className="ev-recent__item" style={{ "--c": PRIZE_TIERS[h.prize.tier].color }} title={h.prize.name}>
                      <PrizeArt prize={h.prize} size="xs" />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Эксклюзивные роли */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {eventRoles.map((r) => {
          const own = (wallet.ownedRoles || []).includes(r.id);
          const prize = WHEEL.find((p) => p.kind === "role" && p.id === r.id);
          return (
            <Link key={r.id} to={`/role/${r.id}`} className="ev-role">
              <img src={r.image} alt={r.name} />
              <div className="min-w-0 flex-1">
                <span className="ev-badge !text-[9px]">
                  <FontAwesomeIcon icon={faScaleBalanced} /> Только в событии
                </span>
                <h3 className="mt-2 font-display text-2xl font-black text-[#fff1e6]">{r.name}</h3>
                <p className="text-xs font-bold" style={{ color: r.category === "mafia" ? "#f87171" : "#34d399" }}>
                  {r.team}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#e8cfc0]">{r.ability}</p>
                <p className="mt-2 text-[11px] text-[#c9a99a]">
                  {own ? (
                    <span className="text-emerald-300">
                      <FontAwesomeIcon icon={faCheck} /> У вас есть
                    </span>
                  ) : (
                    <>{wonSet.has(prize.index) ? "Забрано" : `Шанс за прокрутку: ${chanceOf(prize, left).toFixed(2)}%`}</>
                  )}
                </p>
              </div>
              <FontAwesomeIcon icon={faArrowRight} className="text-[#fca5a5]" />
            </Link>
          );
        })}
      </section>

      {/* Все награды и шансы */}
      <section className="ev-prizes mt-6">
        <h2 className="font-display text-2xl font-black text-[#fff1e6]">Награды колеса и шансы</h2>
        <p className="mt-1 text-xs text-[#c9a99a]">
          Сектора на колесе одинаковые, но у каждой награды свой шанс — он указан здесь и пересчитывается, когда награды исчезают с колеса.
        </p>
        <div className="mt-4 space-y-4">
          {groups.map((g) => (
            <div key={g.tier}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: PRIZE_TIERS[g.tier].color }}>
                {PRIZE_TIERS[g.tier].label}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {g.list.map((p) => {
                  const taken = wonSet.has(p.index);
                  return (
                    <div key={p.index} className={`ev-cell ${taken ? "ev-cell--taken" : ""}`} style={{ "--c": PRIZE_TIERS[p.tier].color }}>
                      <PrizeArt prize={p} size="sm" />
                      <div className="min-w-0">
                        <b className="block truncate text-xs text-[#fff1e6]">{p.name}</b>
                        <span className="text-[11px] text-[#c9a99a]">{taken ? "Забрано" : `${chanceOf(p, left).toFixed(2)}%`}</span>
                      </div>
                      {taken && <FontAwesomeIcon icon={faCheck} className="ml-auto text-[10px] text-emerald-300" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {results && (
        <ResultModal
          results={results}
          onClose={() => {
            setResults(null);
            setShown(remainingPrizes());
          }}
          canAgain={teni >= (lastCount === 5 ? SPIN5_PRICE : SPIN_PRICE) && left.length >= lastCount}
          onAgain={() => {
            setResults(null);
            setShown(remainingPrizes());
            setTimeout(() => spin(lastCount), 250);
          }}
        />
      )}
      {jackpot && <JackpotFlag prize={jackpot} onDone={() => setJackpot(null)} />}
      {exchange && <TeniExchangeModal onClose={() => setExchange(false)} />}
    </div>
  );
}
