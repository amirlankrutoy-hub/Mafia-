import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGem,
  faUserAstronaut,
  faFaceGrinStars,
  faHatCowboy,
  faWandMagicSparkles,
  faTicket,
  faPlus,
  faRightLeft,
  faCheck,
  faSun,
  faMoon,
  faGift,
  faCrown
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useMemo, useState } from "react";
import roles from "../data/roles";
import { EMOJIS, DECORATIONS, ADMIN_DECORATION } from "../data/shopData";
import { CHESTS, RARITIES, RARITY_ORDER, ROLE_RARITY, BASE_ROLES, roleChance } from "../data/chests";
import { openChest } from "../services/chests";
import ChestSVG from "../components/shop/ChestSVG";
import ChestOpening from "../components/shop/ChestOpening";
import TopUpModal from "../components/shop/TopUpModal";
import TeniExchangeModal from "../components/shop/TeniExchangeModal";
import AnimatedEmoji from "../components/AnimatedEmoji";
import Avatar from "../components/ui/Avatar";
import { AVATARS } from "../data/avatars";
import { canUseAvatar, getSelectedAvatar, setSelectedAvatar } from "../services/profile";
import { getMyAccount } from "../services/accounts";
import { toast } from "../services/toast";
import {
  getWallet,
  purchase,
  ownsEmoji,
  ownsDecoration,
  setEquippedDecoration,
  redeemPromoCode
} from "../services/wallet";
import DecorationSVG from "../components/shop/DecorationSVG";
import ABILITIES from "../data/abilities";
import { getOwnedAbilities, buyAbility } from "../services/abilitiesShop";
import { getTeniBalance } from "../services/teniWallet";
import useSeo from '../hooks/useSeo';
import "../shop.css";

const TABS = [
  { id: "chests", label: "Сундуки", hint: "Роли и награды", icon: faGem },
  { id: "avatars", label: "Аватарки", hint: "Ваш образ", icon: faUserAstronaut },
  { id: "emojis", label: "Эмодзи", hint: "Реакции в лобби", icon: faFaceGrinStars },
  { id: "decor", label: "Украшения", hint: "Шляпы и короны", icon: faHatCowboy },
  { id: "abilities", label: "Способности", hint: "Козырь в игре", icon: faWandMagicSparkles },
  { id: "promo", label: "Промокод", hint: "Подарки", icon: faTicket }
];

const Tokens = ({ className = "h-4 w-4" }) => <img src="/tokens.png" alt="" className={`inline object-contain ${className}`} />;
const Teni = ({ className = "h-4 w-4" }) => <img src="/krital.svg" alt="" className={`inline object-contain ${className}`} />;

export default function Shop() {
  useSeo({ title: 'Магазин', description: 'Сундуки с ролями, эмодзи, украшения и способности для игры Mafia Play.', path: '/shop' });
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return TABS.some((x) => x.id === t) ? t : "chests";
  });
  const [wallet, setWallet] = useState(getWallet());
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState(null);
  const [owned, setOwned] = useState(getOwnedAbilities());
  const [teni, setTeni] = useState(getTeniBalance());
  const [topUp, setTopUp] = useState(false);
  const [exchange, setExchange] = useState(false);
  const account = getMyAccount();

  useEffect(() => {
    const refresh = () => setWallet(getWallet());
    window.addEventListener("mafia-wallet-changed", refresh);
    return () => window.removeEventListener("mafia-wallet-changed", refresh);
  }, []);

  useEffect(() => {
    const refreshAbilities = () => {
      setOwned(getOwnedAbilities());
      setTeni(getTeniBalance());
    };
    window.addEventListener("mafia-abilities-changed", refreshAbilities);
    window.addEventListener("mafia-teni-changed", refreshAbilities);
    return () => {
      window.removeEventListener("mafia-abilities-changed", refreshAbilities);
      window.removeEventListener("mafia-teni-changed", refreshAbilities);
    };
  }, []);

  function buyAbilityItem(a) {
    const res = buyAbility(a.id);
    if (!res.success) return toast({ kind: "error", text: res.message });
    setOwned(getOwnedAbilities());
    setTeni(getTeniBalance());
    toast({ kind: "success", title: `${a.name}: +1`, text: "Способность добавлена в ваш набор" });
  }

  function buy(kind, id, price, label) {
    const res = purchase({ kind, id, price });
    if (!res.success) return toast({ kind: "error", text: res.message });
    setWallet(getWallet());
    toast({ kind: "success", title: "Покупка совершена", text: label || undefined });
  }

  function submitPromo(e) {
    e.preventDefault();
    const res = redeemPromoCode(promoInput);
    setPromoMsg(res);
    if (res.success) setPromoInput("");
  }

  const decorationList = wallet.isAdmin ? [...DECORATIONS, ADMIN_DECORATION] : DECORATIONS;

  return (
    <div className="mx-auto max-w-6xl space-y-7 py-6">
      {/* Шапка: чёрный рынок и кошелёк */}
      <section className="shop-hero anim-fade-up">
        <div className="shop-hero__glow" />
        <div className="shop-hero__smoke" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="text-center lg:text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#a8916c]">Чёрный рынок семьи</p>
            <h1 className="ach-title mt-1 font-display text-5xl font-black sm:text-6xl">Магазин</h1>
            <p className="mt-3 max-w-md text-sm text-[#c9b48f] lg:max-w-none">
              Сундуки с редкими ролями, аватарки, украшения и способности, которые переворачивают игру.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="shop-wallet">
              <span className="shop-wallet__label">Токены</span>
              <span className="shop-wallet__value">
                <Tokens className="h-7 w-7" />
                {wallet.balance.toLocaleString("ru-RU")}
              </span>
              <button type="button" onClick={() => setTopUp(true)} className="btn btn-gold btn-sm w-full">
                <FontAwesomeIcon icon={faPlus} /> Пополнить
              </button>
            </div>
            <div className="shop-wallet shop-wallet--teni">
              <span className="shop-wallet__label">Тени</span>
              <span className="shop-wallet__value">
                <Teni className="h-7 w-7" />
                {teni.toLocaleString("ru-RU")}
              </span>
              <button type="button" onClick={() => setExchange(true)} className="btn btn-ghost btn-sm w-full">
                <FontAwesomeIcon icon={faRightLeft} /> Обменять
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Вкладки */}
      <nav className="shop-tabs" aria-label="Разделы магазина">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shop-tab ${tab === t.id ? "shop-tab--active" : ""}`}
            aria-pressed={tab === t.id}
          >
            <span className="shop-tab__icon">
              <FontAwesomeIcon icon={t.icon} />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-black">{t.label}</span>
              <span className="block text-[10px] opacity-70">{t.hint}</span>
            </span>
          </button>
        ))}
      </nav>

      <div key={tab} className="anim-fade-in">
        {tab === "chests" && <ChestsTab wallet={wallet} />}
        {tab === "avatars" && <AvatarsTab wallet={wallet} onBuy={(a) => buy("avatar", a.id, a.price, a.name)} />}
        {tab === "emojis" && <EmojisTab wallet={wallet} onBuy={(e) => buy("emoji", e.id, e.price, `Эмодзи ${e.symbol}`)} />}
        {tab === "decor" && (
          <DecorTab
            wallet={wallet}
            list={decorationList}
            avatar={getSelectedAvatar()}
            name={account?.name}
            onBuy={(d) => buy("decoration", d.id, d.price, d.name)}
          />
        )}
        {tab === "abilities" && <AbilitiesTab owned={owned} teni={teni} onBuy={buyAbilityItem} />}
        {tab === "promo" && (
          <form onSubmit={submitPromo} className="promo-ticket mx-auto max-w-lg anim-scale-in">
            <div className="promo-ticket__stub">
              <FontAwesomeIcon icon={faGift} className="text-3xl" />
            </div>
            <div className="flex-1 space-y-3 p-5 text-center">
              <h2 className="font-display text-2xl font-black text-[#f3e5ab]">Промокод</h2>
              <p className="text-xs text-[#a8916c]">Введите код из наших соцсетей или от администрации. Каждый код срабатывает один раз.</p>
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="MAFIA-XXXX"
                className="input-noir text-center font-mono text-lg uppercase tracking-[0.3em]"
              />
              <button type="submit" disabled={!promoInput.trim()} className="btn btn-blood w-full">
                Активировать
              </button>
              {promoMsg && <p className={`text-sm ${promoMsg.success ? "text-emerald-400" : "text-red-400"}`}>{promoMsg.message}</p>}
            </div>
          </form>
        )}
      </div>

      {topUp && <TopUpModal onClose={() => setTopUp(false)} playerName={account?.name} accountId={account?.id} />}
      {exchange && <TeniExchangeModal onClose={() => setExchange(false)} />}
    </div>
  );
}

function SectionHead({ title, text, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-black text-[#f3e5ab] sm:text-3xl">{title}</h2>
        {text && <p className="mt-1 max-w-2xl text-sm text-[#a8916c]">{text}</p>}
      </div>
      {right}
    </div>
  );
}

function PriceButton({ price, currency = "tokens", disabled, onClick, children }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="shop-price">
      {children || (
        <>
          {price.toLocaleString("ru-RU")} {currency === "teni" ? <Teni /> : <Tokens />}
        </>
      )}
    </button>
  );
}

function EmojisTab({ wallet, onBuy }) {
  const list = [...EMOJIS].sort((a, b) => a.price - b.price);
  const ownedCount = list.filter((e) => wallet.ownedEmojis?.includes(e.id) || ownsEmoji(e.id)).length;
  return (
    <section>
      <SectionHead
        title="Эмодзи"
        text="Живые реакции для лобби и голосования. Купленные эмодзи появляются в кнопке со смайликом."
        right={<span className="chip">Ваших: {ownedCount} / {list.length}</span>}
      />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {list.map((emoji, i) => {
          const owned = wallet.ownedEmojis?.includes(emoji.id) || ownsEmoji(emoji.id);
          const legendary = emoji.price >= 500;
          return (
            <div
              key={emoji.id}
              className={`shop-item anim-scale-in ${owned ? "shop-item--owned" : ""} ${legendary ? "shop-item--legend" : ""}`}
              style={{ "--i": Math.min(i, 14) }}
            >
              {legendary && <span className="shop-ribbon">Легенда</span>}
              <div className="shop-item__stage">
                <span className="text-5xl">
                  <AnimatedEmoji id={emoji.id} symbol={emoji.symbol} />
                </span>
              </div>
              {owned ? (
                <span className="shop-owned">
                  <FontAwesomeIcon icon={faCheck} /> Ваше
                </span>
              ) : (
                <PriceButton price={emoji.price} disabled={wallet.balance < emoji.price} onClick={() => onBuy(emoji)} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DecorTab({ wallet, list, avatar, name, onBuy }) {
  const kinds = useMemo(() => {
    const map = new Map();
    list.forEach((d) => {
      if (!map.has(d.kind)) map.set(d.kind, []);
      map.get(d.kind).push(d);
    });
    return [...map.values()];
  }, [list]);
  const isOwned = (d) => wallet.ownedDecorations?.includes(d.id) || ownsDecoration(d.id) || d.price == null;
  const [pick, setPick] = useState({});

  return (
    <section>
      <SectionHead
        title="Украшения"
        text="Надеваются поверх аватарки — их видят все за столом. Выберите вид и цвет камней."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kinds.map((variants, i) => {
          const equippedVariant = variants.find((v) => v.id === wallet.equippedDecoration);
          const current = variants.find((v) => v.id === pick[variants[0].kind]) || equippedVariant || variants[0];
          const owned = isOwned(current);
          const equipped = wallet.equippedDecoration === current.id;
          const baseName = current.name.replace(/\s*\(.*\)$/, "");
          const colorName = (current.name.match(/\((.*)\)$/) || [])[1];
          return (
            <div key={current.kind} className="shop-decor anim-scale-in" style={{ "--i": i, "--gem": current.colors.main }}>
              <div className="shop-decor__stage">
                <div className="relative mt-6">
                  <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                    <DecorationSVG kind={current.kind} colors={current.colors} className="h-16 w-24" />
                  </div>
                  <Avatar src={avatar} size={88} />
                </div>
                {equipped && <span className="shop-owned absolute right-3 top-3 !text-[10px]">Надето</span>}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-black text-[#f3e5ab]">{baseName}</h3>
                    <p className="text-[11px] text-[#a8916c]">{colorName || (name ? `для ${name}` : "")}</p>
                  </div>
                  {current.price == null && (
                    <span className="chip !text-[9px]">
                      <FontAwesomeIcon icon={faCrown} className="mr-1" /> Админ
                    </span>
                  )}
                </div>
                {variants.length > 1 && (
                  <div className="mt-3 flex gap-2">
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        title={v.name}
                        onClick={() => setPick((p) => ({ ...p, [v.kind]: v.id }))}
                        className={`shop-swatch ${v.id === current.id ? "shop-swatch--active" : ""}`}
                        style={{ "--c1": v.colors.main, "--c2": v.colors.dark || v.colors.main }}
                      >
                        {isOwned(v) && <FontAwesomeIcon icon={faCheck} className="text-[9px] text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  {owned ? (
                    <button
                      type="button"
                      onClick={() => setEquippedDecoration(equipped ? null : current.id)}
                      className={`btn btn-sm w-full ${equipped ? "btn-ghost" : "btn-gold"}`}
                    >
                      {equipped ? "Снять" : "Надеть"}
                    </button>
                  ) : (
                    <PriceButton price={current.price} disabled={wallet.balance < current.price} onClick={() => onBuy(current)} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AbilitiesTab({ owned, teni, onBuy }) {
  return (
    <section>
      <SectionHead
        title="Способности"
        text="Покупаются за тени. В игре вы увидите только свои способности — и сможете использовать одну за всю игру: дневную на голосовании или ночную ночью."
        right={
          <span className="chip">
            <Teni className="mr-1 h-3.5 w-3.5" /> {teni} теней
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ABILITIES.map((a, i) => {
          const count = owned[a.id] || 0;
          return (
            <div key={a.id} className={`ability-card ability-card--${a.type} anim-scale-in`} style={{ "--i": i }}>
              <span className="ability-card__type">
                <FontAwesomeIcon icon={a.type === "day" ? faSun : faMoon} /> {a.type === "day" ? "День" : "Ночь"}
              </span>
              {count > 0 && <span className="ability-card__count">×{count}</span>}
              <div className="ability-card__medal">
                <FontAwesomeIcon icon={a.icon} />
              </div>
              <h3 className="mt-4 font-display text-xl font-black text-[#f3e5ab]">{a.name}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[#c9b48f]">{a.description}</p>
              <div className="mt-4 w-full">
                <PriceButton price={a.price} currency="teni" disabled={teni < a.price} onClick={() => onBuy(a)} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const DROP_LABELS = { tokens: "Токены", teni: "Тени", emoji: "Эмодзи", role: "Роль" };

function ChestCard({ chest, i, balance, onOpen }) {
  const [showOdds, setShowOdds] = useState(false);
  const r = RARITIES[chest.rarity];
  const canBuy = balance >= chest.price;
  return (
    <div
      className="noir-card spotlight relative flex flex-col items-center overflow-hidden p-5 text-center anim-fade-up"
      style={{ "--i": i, boxShadow: `0 20px 50px -25px ${chest.colors.glow}` }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: `radial-gradient(ellipse at 50% 0%, ${chest.colors.glow}, transparent 70%)` }} />
      <span className="chip relative" style={{ color: r.color, borderColor: r.color }}>{r.label}</span>
      <div className="relative mt-3 anim-float" style={{ animationDelay: `${i * 0.7}s` }}>
        <ChestSVG colors={chest.colors} className="h-36 w-44 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:scale-110 hover:-rotate-3" />
      </div>
      <h3 className="relative mt-2 font-display text-2xl font-black" style={{ color: r.color }}>{chest.name}</h3>

      <div className="relative mt-3 grid w-full grid-cols-4 gap-1.5 text-[10px]">
        {RARITY_ORDER.map((rar) => (
          <div key={rar} className="rounded-lg bg-black/40 px-1 py-1.5">
            <div className="font-black" style={{ color: RARITIES[rar].color }}>
              {roleChance(chest, rar).toFixed(rar === "mythic" || rar === "epic" ? 1 : 0)}%
            </div>
            <div className="text-[#a8916c]">{RARITIES[rar].label.slice(0, 4)}.</div>
          </div>
        ))}
      </div>
      <p className="relative mt-1 text-[10px] text-[#a8916c]">шанс выбить роль каждой редкости</p>

      <button type="button" onClick={() => setShowOdds((v) => !v)} className="relative mt-2 text-xs text-[#f3d27a] underline-offset-4 hover:underline">
        {showOdds ? "Скрыть шансы" : "Все шансы"}
      </button>
      {showOdds && (
        <div className="relative mt-2 w-full space-y-1 rounded-xl bg-black/40 p-3 text-left text-xs anim-fade-in">
          {Object.entries(chest.drops).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[#c9b48f]">
                {DROP_LABELS[k]}
                {k === "tokens" && ` (${chest.tokens[0]}–${chest.tokens[1]})`}
                {k === "teni" && ` (${chest.teni[0]}–${chest.teni[1]})`}
              </span>
              <b className="text-[#f3e5ab]">{v}%</b>
            </div>
          ))}
        </div>
      )}

      <button type="button" disabled={!canBuy} onClick={() => onOpen(chest)} className={`btn mt-4 w-full ${canBuy ? "btn-blood" : "btn-ghost"}`}>
        {canBuy ? "Открыть" : "Не хватает"} · {chest.price.toLocaleString("ru-RU")}
        <img src="/tokens.png" alt="" className="h-4 w-4" />
      </button>
    </div>
  );
}

function ChestsTab({ wallet }) {
  const [opening, setOpening] = useState(null); // { chest, reward }

  const open = (chest) => {
    const res = openChest(chest.id);
    if (!res.success) {
      toast({ kind: "error", text: res.message });
      return;
    }
    setOpening({ chest, reward: res.reward });
  };

  const collection = roles
    .filter((r) => ROLE_RARITY[r.id])
    .sort((a, b) => RARITY_ORDER.indexOf(ROLE_RARITY[a.id]) - RARITY_ORDER.indexOf(ROLE_RARITY[b.id]));
  const ownedCount = collection.filter((r) => wallet.ownedRoles?.includes(r.id)).length;

  return (
    <div className="space-y-10">
      <div>
        <SectionHead
          title="Сундуки"
          text="Роли выпадают из сундуков вместе с Токенами, Тенями и эмодзи. Чем дороже сундук — тем выше шанс на редкие роли. Повторная роль превращается в 500 Токенов."
        />
      <div className="grid gap-5 md:grid-cols-3">
        {CHESTS.map((c, i) => (
          <ChestCard key={c.id} chest={c} i={i} balance={wallet.balance} onOpen={open} />
        ))}
      </div>
      </div>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-black text-[#f3e5ab]">Коллекция ролей</h2>
          <span className="text-sm text-[#a8916c]">
            Открыто <b className="text-[#f3d27a]">{ownedCount}</b> из {collection.length}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {collection.map((role, i) => {
            const rar = RARITIES[ROLE_RARITY[role.id]];
            const owned = wallet.ownedRoles?.includes(role.id);
            return (
              <div
                key={role.id}
                className="relative overflow-hidden rounded-2xl anim-scale-in"
                style={{ "--i": i, outline: `2px solid ${owned ? rar.color : "rgba(255,255,255,0.08)"}`, boxShadow: owned ? `0 0 25px -5px ${rar.glow}` : "none" }}
              >
                <img src={role.image} alt={role.name} className={`aspect-[2/3] w-full object-cover ${owned ? "" : "grayscale opacity-35"}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                {!owned && <span className="absolute left-1/2 top-1/3 -translate-x-1/2 text-3xl">🔒</span>}
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: rar.color }}>
                    {BASE_ROLES.includes(role.id) ? "Базовая · есть у всех" : rar.label}
                  </div>
                  <div className="font-display text-base font-bold text-[#f3e5ab]">{role.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {opening && (
        <ChestOpening
          chest={opening.chest}
          reward={opening.reward}
          canAgain={getWallet().balance >= opening.chest.price}
          onClose={() => setOpening(null)}
          onAgain={() => {
            const res = openChest(opening.chest.id);
            if (res.success) setOpening({ chest: opening.chest, reward: res.reward });
            else setOpening(null);
          }}
        />
      )}
    </div>
  );
}


const TIER_LABEL = { admin: "Только для администраторов", support: "Только для саппортов" };

function AvatarsTab({ wallet, onBuy }) {
  const [selected, setSelected] = useState(getSelectedAvatar());
  const [, force] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setSelected(getSelectedAvatar());
      force((n) => n + 1);
    };
    window.addEventListener("mafia-avatar-changed", refresh);
    window.addEventListener("mafia-status-changed", refresh);
    window.addEventListener("mafia-admin-changed", refresh);
    return () => {
      window.removeEventListener("mafia-avatar-changed", refresh);
      window.removeEventListener("mafia-status-changed", refresh);
      window.removeEventListener("mafia-admin-changed", refresh);
    };
  }, []);

  const Card = ({ a, i }) => {
    const available = canUseAvatar(a);
    const owned = a.tier !== "shop" || (wallet.ownedAvatars || []).includes(a.id);
    const equipped = selected === a.src;
    const exclusive = a.tier === "admin" || a.tier === "support";
    return (
      <div
        className={`noir-card noir-card--hover spotlight flex flex-col items-center p-4 text-center anim-scale-in ${equipped ? "!border-[#d4af37]" : ""}`}
        style={{ "--i": i }}
      >
        <div className="relative">
          <img
            src={a.src}
            alt={a.name}
            className={`h-32 w-32 object-contain transition duration-500 hover:scale-105 ${!available && exclusive ? "grayscale opacity-40" : ""}`}
            style={a.tier === "support" ? { filter: available ? "drop-shadow(0 0 14px rgba(52,211,153,0.6))" : undefined } : a.tier === "admin" ? { filter: available ? "drop-shadow(0 0 14px rgba(243,210,122,0.6))" : undefined } : undefined}
          />
          {!available && exclusive && <span className="absolute inset-0 flex items-center justify-center text-3xl">🔒</span>}
        </div>
        <p className="mt-2 text-sm font-bold text-[#f3e5ab]">{a.name}</p>
        {exclusive && <span className={`chip mt-1 !text-[9px] ${a.tier === "support" ? "chip--green" : ""}`}>{TIER_LABEL[a.tier]}</span>}
        <div className="mt-3 w-full">
          {available && owned ? (
            <button
              type="button"
              disabled={equipped}
              onClick={() => setSelectedAvatar(a.src)}
              className={`btn btn-sm w-full ${equipped ? "btn-ghost" : "btn-gold"}`}
            >
              {equipped ? "Выбрана" : "Выбрать"}
            </button>
          ) : a.tier === "shop" ? (
            <button type="button" onClick={() => onBuy(a)} disabled={wallet.balance < a.price} className="btn btn-blood btn-sm w-full">
              {a.price.toLocaleString("ru-RU")} <img src="/tokens.png" alt="" className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-[11px] text-[#a8916c]">Недоступно</span>
          )}
        </div>
      </div>
    );
  };

  const shop = AVATARS.filter((a) => a.tier === "shop");
  const exclusive = AVATARS.filter((a) => (a.tier === "admin" || a.tier === "support") && a.src.endsWith(".webp"));
  const free = AVATARS.filter((a) => a.tier === "free" && a.src.endsWith(".webp"));

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-2xl font-black text-[#f3e5ab]">Коллекция «Закат»</h2>
        <p className="mt-1 text-sm text-[#a8916c]">Покупаются один раз и остаются навсегда. Выбранную аватарку видят все игроки.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shop.map((a, i) => <Card key={a.id} a={a} i={i} />)}
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl font-black text-[#f3e5ab]">Эксклюзивные</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {exclusive.map((a, i) => <Card key={a.id} a={a} i={i} />)}
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl font-black text-[#f3e5ab]">Бесплатные</h2>
        <p className="mt-1 text-sm text-[#a8916c]">Ещё 20 бесплатных персонажей — на главной странице в блоке «Ваш образ».</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {free.map((a, i) => <Card key={a.id} a={a} i={i} />)}
        </div>
      </section>
    </div>
  );
}
