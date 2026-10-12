import { useEffect, useState } from "react";
import roles from "../data/roles";
import { EMOJIS, DECORATIONS, ADMIN_DECORATION } from "../data/shopData";
import { CHESTS, RARITIES, RARITY_ORDER, ROLE_RARITY, BASE_ROLES, roleChance } from "../data/chests";
import { openChest } from "../services/chests";
import ChestSVG from "../components/shop/ChestSVG";
import ChestOpening from "../components/shop/ChestOpening";
import AnimatedEmoji from "../components/AnimatedEmoji";
import { AVATARS } from "../data/avatars";
import { canUseAvatar, getSelectedAvatar, setSelectedAvatar } from "../services/profile";
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

const TABS = [
  { id: "chests", label: "Сундуки" },
  { id: "avatars", label: "Аватарки" },
  { id: "emojis", label: "Эмодзи" },
  { id: "decor", label: "Украшения" },
  { id: "abilities", label: "Способности" },
  { id: "promo", label: "Промокод" }
];

export default function Shop() {
  useSeo({ title: 'Магазин', description: 'Сундуки с ролями, эмодзи, украшения и способности для игры Mafia Play.', path: '/shop' });
  const [tab, setTab] = useState("chests");
  const [wallet, setWallet] = useState(getWallet());
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState(null);
  const [owned, setOwned] = useState(getOwnedAbilities());
  const [teni, setTeni] = useState(getTeniBalance());

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

  function buyAbilityItem(id) {
    const res = buyAbility(id);
    if (!res.success) {
      alert(res.message);
      return;
    }
    setOwned(getOwnedAbilities());
    setTeni(getTeniBalance());
  }

  function buy(kind, id, price) {
    const res = purchase({ kind, id, price });
    if (!res.success) {
      alert(res.message);
      return;
    }
    // Сразу обновляем UI: замок → «Куплено», баланс
    setWallet(getWallet());
  }

  function submitPromo(e) {
    e.preventDefault();
    const res = redeemPromoCode(promoInput);
    setPromoMsg(res);
    if (res.success) setPromoInput("");
  }

  const decorationList = wallet.isAdmin
    ? [...DECORATIONS, ADMIN_DECORATION]
    : DECORATIONS;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-black text-[#d4af37] uppercase tracking-wider">
          Магазин
        </h1>
        <p className="text-[#c5a059] mt-2">
          Баланс:{" "}
          <span className="text-[#f3e5ab] font-bold">
            {wallet.balance.toLocaleString("ru-RU")}{" "}<img src="/tokens.png" alt="" className="inline h-5 w-5 object-contain align-[-2px] ml-0.5" />
          </span>
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold uppercase tracking-wider transition ${
              tab === t.id
                ? "border-[#d4af37] bg-[#8b0000] text-[#f3e5ab]"
                : "border-[#c5a059]/40 bg-[#120a07] text-[#c5a059] hover:border-[#d4af37]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chests" && <ChestsTab wallet={wallet} />}
      {tab === "avatars" && <AvatarsTab wallet={wallet} onBuy={(a) => buy("avatar", a.id, a.price)} />}

      {tab === "emojis" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {EMOJIS.map((emoji) => {
            const owned =
              wallet.ownedEmojis?.includes(emoji.id) || ownsEmoji(emoji.id);
            return (
              <div
                key={emoji.id}
                className="rounded-xl border border-[#c5a059]/40 bg-[#120a07] p-4 text-center space-y-2"
              >
                <div className="text-4xl"><AnimatedEmoji id={emoji.id} symbol={emoji.symbol} /></div>
                {owned ? (
                  <span className="text-xs text-emerald-400 uppercase tracking-wider">
                    Куплено
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => buy("emoji", emoji.id, emoji.price)}
                    className="w-full rounded-lg bg-[#d4af37] text-black font-bold py-1 text-xs hover:brightness-110"
                  >
                    {emoji.price}{" "}<img src="/tokens.png" alt="" className="inline h-4 w-4 object-contain align-[-2px]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "decor" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {decorationList.map((d) => {
            const owned =
              wallet.ownedDecorations?.includes(d.id) ||
              ownsDecoration(d.id) ||
              d.price == null;
            const equipped = wallet.equippedDecoration === d.id;
            return (
              <div
                key={d.id}
                className="rounded-xl border border-[#c5a059]/40 bg-[#120a07] p-3 text-center space-y-2"
              >
                <DecorationSVG
                  kind={d.kind}
                  colors={d.colors}
                  className="h-16 w-full"
                />
                <p className="text-xs text-[#e6d5bc]">{d.name}</p>
                {owned ? (
                  <button
                    type="button"
                    onClick={() =>
                      setEquippedDecoration(equipped ? null : d.id)
                    }
                    className={`w-full rounded-lg py-1 text-xs font-bold ${
                      equipped
                        ? "bg-emerald-700 text-white"
                        : "bg-[#d4af37] text-black hover:brightness-110"
                    }`}
                  >
                    {equipped ? "Надето" : "Надеть"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => buy("decoration", d.id, d.price)}
                    className="w-full rounded-lg bg-[#d4af37] text-black font-bold py-1 text-xs hover:brightness-110"
                  >
                    {d.price}{" "}<img src="/tokens.png" alt="" className="inline h-4 w-4 object-contain align-[-2px]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "abilities" && (
        <div>
          <p className="text-center text-[#c5a059] mb-5">
            Баланс:{" "}
            <span className="text-[#f3e5ab] font-bold">
              {teni}{" "}
              <img src="/krital.svg" alt="" className="inline h-5 w-5 object-contain align-[-2px] ml-0.5" />
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {ABILITIES.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-[#c5a059]/40 bg-[#120a07] p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#f3e5ab]">{a.name}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      a.type === "day"
                        ? "border-amber-500/50 text-amber-300"
                        : "border-indigo-500/50 text-indigo-300"
                    }`}
                  >
                    {a.type === "day" ? "День" : "Ночь"}
                  </span>
                </div>
                <p className="text-xs text-[#8b6b12] leading-snug flex-1">{a.description}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-[#c5a059]">
                    В запасе: <strong className="text-[#f3e5ab]">{owned[a.id] || 0}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => buyAbilityItem(a.id)}
                    disabled={teni < a.price}
                    className="rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] px-3 py-1.5 text-xs font-bold text-[#f3e5ab] border border-[#d4af37]/60 disabled:opacity-40"
                  >
                    {a.price} <img src="/krital.svg" alt="" className="inline h-4 w-4 align-[-2px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "promo" && (
        <form
          onSubmit={submitPromo}
          className="max-w-md mx-auto space-y-4 text-center"
        >
          <p className="text-[#c5a059]">
            Введите промокод — сработает один раз на это устройство.
          </p>
          <input
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="Промокод"
            className="w-full rounded-xl border border-[#c5a059]/40 bg-[#120a07] px-4 py-3 text-center text-[#f3e5ab] tracking-widest uppercase focus:border-[#d4af37] outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#8b0000] to-[#5c0000] px-6 py-3 font-bold text-[#f3e5ab] border border-[#d4af37]"
          >
            Активировать
          </button>
          {promoMsg && (
            <p
              className={
                promoMsg.success ? "text-emerald-400" : "text-red-400"
              }
            >
              {promoMsg.message}
            </p>
          )}
        </form>
      )}
    </div>
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
      <p className="mx-auto max-w-2xl text-center text-sm text-[#c9b48f]">
        Роли больше не продаются — они выпадают из сундуков вместе с Токенами, Тенями и эмодзи. Чем дороже сундук,
        тем выше шанс на редкие роли.
      </p>
      <div className="grid gap-5 md:grid-cols-3">
        {CHESTS.map((c, i) => (
          <ChestCard key={c.id} chest={c} i={i} balance={wallet.balance} onOpen={open} />
        ))}
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
