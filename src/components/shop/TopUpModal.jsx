import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faArrowLeft, faStar, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { COIN_PACKAGES } from "../../data/shopData";
import { createTopup } from "../../services/topup";

const PACKAGE_IMAGES = {
  coins_999: "/tokens.png",
  coins_3000: "/tokens-3000.avif",
  coins_7000: "/tokens-7000.jpg",
  coins_10000: "/tokens-10000.jpg"
};

const TIERS = {
  coins_999: { label: "Старт", cls: "chip--muted" },
  coins_3000: { label: "Популярный", cls: "chip--green" },
  coins_7000: { label: "Выгодный", cls: "" },
  coins_10000: { label: "Максимум", cls: "chip--red" }
};

function Stars({ n, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <FontAwesomeIcon icon={faStar} className="text-[#ffc83d] drop-shadow-[0_0_6px_rgba(255,200,61,0.7)]" />
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
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md anim-fade-in" onClick={onClose} />
      <div className="noir-card deco-corners relative max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 sm:p-8 anim-scale-in">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-[#a8916c] hover:text-[#f3d27a]" aria-label="Закрыть">
          <FontAwesomeIcon icon={faXmark} size="lg" />
        </button>

        <div className="flex items-center gap-3">
          <img src="/tokens.png" alt="" className="h-12 w-12 anim-float" />
          <div>
            <p className="eyebrow !text-[0.6rem]">Оплата звёздами Telegram</p>
            <h2 className="font-display text-3xl font-black gold-text">Пополнение Токенов</h2>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-950/50 px-4 py-2 text-sm text-red-300 anim-shake">{error}</p>}

        {!selected ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
              {COIN_PACKAGES.map((pkg, i) => {
                const tier = TIERS[pkg.id];
                return (
                  <button
                    key={pkg.id}
                    onClick={() => choose(pkg)}
                    className="group relative flex min-h-[170px] flex-col items-center justify-end overflow-hidden rounded-2xl bg-cover bg-center p-4 text-center ring-1 ring-[#d4af37]/30 transition duration-300 hover:-translate-y-1 hover:ring-[#f3d27a] hover:shadow-[0_15px_40px_-10px_rgba(212,175,55,0.6)] anim-scale-in sm:min-h-[200px]"
                    style={{ backgroundImage: `url(${PACKAGE_IMAGES[pkg.id]})`, "--i": i }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/5 transition group-hover:via-black/30" />
                    {tier && <span className={`chip absolute left-3 top-3 ${tier.cls}`}>{tier.label}</span>}
                    <div className="relative flex items-center gap-1.5 font-display text-2xl font-black text-[#f3e5ab]">
                      {pkg.amount.toLocaleString("ru-RU")}
                      <img src="/tokens.png" alt="" className="h-6 w-6" />
                    </div>
                    <div className="relative mt-2 rounded-full border border-[#ffc83d]/50 bg-black/60 px-4 py-1 text-lg font-black text-[#ffe08a]">
                      <Stars n={pkg.stars} />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-5 text-center text-xs text-[#a8916c]">
              Звёзды покупаются прямо в Telegram. Токены зачисляются автоматически сразу после оплаты.
            </p>
          </>
        ) : (
          <div className="mt-6 space-y-4 text-center">
            <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-[#d4af37]/20">
              <img src={PACKAGE_IMAGES[selected.id]} alt="" className="mx-auto h-24 w-24 rounded-full object-cover anim-pop" />
              <p className="mt-3 font-display text-3xl font-black text-[#f3e5ab]">
                {selected.amount.toLocaleString("ru-RU")} Токенов
              </p>
              <Stars n={invoice?.stars ?? selected.stars} className="mt-1 text-xl font-black text-[#ffe08a]" />
            </div>

            {busy ? (
              <p className="text-[#c9b48f] animate-pulse">Создаём счёт…</p>
            ) : invoice ? (
              <>
                <a href={invoice.link} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-lg btn-pulse w-full">
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Оплатить в Telegram
                </a>
                <div className="flex items-center justify-center gap-3 rounded-xl border border-[#d4af37]/20 bg-black/30 px-4 py-3 text-sm text-[#c9b48f]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4af37]/30 border-t-[#f3d27a]" />
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
