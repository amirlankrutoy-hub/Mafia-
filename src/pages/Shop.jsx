import { useEffect, useState } from "react";
import roles from "../data/roles";
import {
  ROLE_PRICES,
  EMOJIS,
  DECORATIONS,
  ADMIN_DECORATION,
  isNewRole
} from "../data/shopData";
import {
  getWallet,
  purchase,
  ownsRole,
  ownsEmoji,
  ownsDecoration,
  setEquippedDecoration,
  redeemPromoCode
} from "../services/wallet";
import DecorationSVG from "../components/shop/DecorationSVG";
import ABILITIES from "../data/abilities";
import { getOwnedAbilities, buyAbility } from "../services/abilitiesShop";
import { getTeniBalance } from "../services/teniWallet";

const TABS = [
  { id: "roles", label: "Роли" },
  { id: "emojis", label: "Эмодзи" },
  { id: "decor", label: "Украшения" },
  { id: "abilities", label: "Способности" },
  { id: "promo", label: "Промокод" }
];

export default function Shop() {
  const [tab, setTab] = useState("roles");
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
            {wallet.balance.toLocaleString("ru-RU")}{" "}<img src="/mafio.png" alt="" className="inline h-5 w-5 object-contain align-[-2px] ml-0.5" />
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

      {tab === "roles" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {roles.map((role) => {
            const price = ROLE_PRICES[role.id] ?? 0;
            // Берём статус из state кошелька, чтобы UI обновлялся сразу после покупки
            const owned =
              wallet.ownedRoles?.includes(role.id) || ownsRole(role.id);
            return (
              <div
                key={role.id}
                className="relative rounded-xl border border-[#c5a059]/40 bg-[#120a07] overflow-hidden"
              >
                {isNewRole(role.id) && (
                  <span className="absolute top-2 right-2 z-10 rounded-full bg-gradient-to-r from-[#8b0000] to-[#d4af37] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-pulse">
                    New
                  </span>
                )}
                {/* Замок только на картинке — не перекрывает кнопку покупки */}
                <div className="relative h-40 w-full">
                  <img
                    src={role.image}
                    alt={role.name}
                    className={`h-full w-full object-cover ${
                      owned ? "" : "opacity-40 grayscale"
                    }`}
                  />
                  {!owned && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                        🔒
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 text-center space-y-2">
                  <p className="font-bold text-[#f3e5ab]">{role.name}</p>
                  {owned ? (
                    <span className="text-xs text-emerald-400 uppercase tracking-wider">
                      Куплено
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => buy("role", role.id, price)}
                      className="w-full rounded-lg bg-[#d4af37] text-black font-bold py-1.5 text-sm hover:brightness-110"
                    >
                      {price}{" "}<img src="/mafio.png" alt="" className="inline h-4 w-4 object-contain align-[-2px]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                <div className="text-4xl">{emoji.symbol}</div>
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
                    {emoji.price}{" "}<img src="/mafio.png" alt="" className="inline h-4 w-4 object-contain align-[-2px]" />
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
                    {d.price}{" "}<img src="/mafio.png" alt="" className="inline h-4 w-4 object-contain align-[-2px]" />
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
              <img src="/teni.png" alt="" className="inline h-5 w-5 object-contain align-[-2px] ml-0.5" />
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
                    {a.price} <img src="/teni.png" alt="" className="inline h-4 w-4 align-[-2px]" />
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