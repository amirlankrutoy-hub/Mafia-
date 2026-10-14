import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faArrowLeft,
  faStar,
  faArrowUpRightFromSquare,
  faPaperPlane,
  faBolt,
  faShieldHalved,
  faHandPointer
} from "@fortawesome/free-solid-svg-icons";
import { COIN_PACKAGES } from "../../data/shopData";
import { createTopup } from "../../services/topup";
import "../../topup.css";

const PACKAGE_IMAGES = {
  coins_999: "/tokens.png",
  coins_3000: "/tokens-3000.avif",
  coins_7000: "/tokens-7000.jpg",
  coins_10000: "/tokens-10000.jpg"
};

const TIERS = {
  coins_999: { label: "Старт", tone: "base" },
  coins_3000: { label: "Популярный", tone: "pop" },
  coins_7000: { label: "Лучшая цена", tone: "best" },
  coins_10000: { label: "Максимум", tone: "max" }
};

// Сколько Токенов за одну звезду у самого маленького пакета — от него считаем выгоду
const BASE_RATE = COIN_PACKAGES[0].amount / COIN_PACKAGES[0].stars;

function Stars({ n, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <FontAwesomeIcon icon={faStar} className="topup-star" />
      {n}
    </span>
  );
}

export default function TopUpModal({ onClose, accountId }) {
  const [selected, setSelected] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Оплата подтверждена сервером — закрываем окно (праздничный экран покажет PaymentSuccess)
  useEffect(() => {
    const onSuccess = () => onClose?.();
    window.addEventListener("mafia-topup-success", onSuccess);
    return () => window.removeEventListener("mafia-topup-success", onSuccess);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choose = async (pkg) => {
    if (!accountId) {
      setError("Сначала выберите имя — Токены зачисляются на ваш аккаунт");
      return;
    }
    setSelected(pkg);
    setError("");
    setBusy(true);
    // Окно открываем сразу по клику — иначе браузер заблокирует его как всплывающее
    const win = window.open("", "_blank");
    const res = await createTopup(pkg.id);
    setBusy(false);
    if (!res?.success) {
      win?.close();
      setError(res?.message || "Не удалось создать счёт");
      setSelected(null);
      return;
    }
    setInvoice(res);
    if (win) win.location.href = res.link;
  };

  const back = () => {
    setSelected(null);
    setInvoice(null);
    setError("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[800] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md anim-fade-in" onClick={onClose} />
      <div className="topup anim-scale-in">
        <div className="topup__glow" />
        <button onClick={onClose} className="topup__close" aria-label="Закрыть">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <header className="relative text-center">
          <div className="topup__coin">
            <img src="/tokens.png" alt="" />
          </div>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#a8916c]">Оплата звёздами Telegram</p>
          <h2 className="ach-title font-display text-3xl font-black sm:text-4xl">Пополнение Токенов</h2>
        </header>

        {error && <p className="relative mt-4 rounded-xl bg-red-950/60 px-4 py-2 text-center text-sm text-red-300 anim-shake">{error}</p>}

        {!selected ? (
          <div className="relative">
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
              {COIN_PACKAGES.map((pkg, i) => {
                const tier = TIERS[pkg.id] || { label: "", tone: "base" };
                const bonus = Math.round(((pkg.amount / pkg.stars) / BASE_RATE - 1) * 100);
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => choose(pkg)}
                    className={`topup-pack topup-pack--${tier.tone} anim-scale-in`}
                    style={{ "--i": i }}
                  >
                    {tier.label && <span className="topup-pack__tier">{tier.label}</span>}
                    {bonus > 0 && <span className="topup-pack__bonus">+{bonus}%</span>}
                    <span className="topup-pack__img" style={{ backgroundImage: `url(${PACKAGE_IMAGES[pkg.id]})` }} />
                    <span className="topup-pack__amount">
                      {pkg.amount.toLocaleString("ru-RU")}
                      <img src="/tokens.png" alt="" />
                    </span>
                    <span className="topup-pack__label">Токенов</span>
                    <span className="topup-pack__price">
                      <Stars n={pkg.stars} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: faHandPointer, t: "Выберите пакет" },
                { icon: faPaperPlane, t: "Оплатите в Telegram" },
                { icon: faBolt, t: "Токены придут сразу" }
              ].map((s, i) => (
                <div key={s.t} className="topup-step">
                  <span className="topup-step__num">{i + 1}</span>
                  <FontAwesomeIcon icon={s.icon} className="text-[#f3d27a]" />
                  <span className="text-[11px] leading-tight text-[#c9b48f]">{s.t}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-[#a8916c]">
              <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-400" />
              Звёзды покупаются прямо в Telegram. Токены зачисляются автоматически сразу после оплаты.
            </p>
          </div>
        ) : (
          <div className="relative mt-6 space-y-4 text-center">
            <div className="topup-chosen">
              <span className="topup-pack__img topup-pack__img--big" style={{ backgroundImage: `url(${PACKAGE_IMAGES[selected.id]})` }} />
              <p className="mt-3 flex items-center justify-center gap-2 font-display text-4xl font-black text-[#fff1c4]">
                {selected.amount.toLocaleString("ru-RU")}
                <img src="/tokens.png" alt="" className="h-8 w-8" />
              </p>
              <Stars n={invoice?.stars ?? selected.stars} className="mt-1 text-xl font-black text-[#ffe08a]" />
            </div>

            {busy ? (
              <div className="topup-wait">
                <span className="topup-wait__ring" />
                Создаём счёт…
              </div>
            ) : invoice ? (
              <>
                <a href={invoice.link} target="_blank" rel="noopener noreferrer" className="topup-pay">
                  <FontAwesomeIcon icon={faPaperPlane} /> Оплатить в Telegram
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs opacity-70" />
                </a>
                <div className="topup-wait">
                  <span className="topup-wait__ring" />
                  Ожидаем оплату… Окно закроется само, когда Telegram подтвердит платёж.
                </div>
              </>
            ) : null}

            <button onClick={back} className="btn btn-ghost btn-sm">
              <FontAwesomeIcon icon={faArrowLeft} /> Выбрать другой пакет
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
