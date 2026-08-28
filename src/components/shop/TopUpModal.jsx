import { useState } from "react";
import {
  COIN_PACKAGES,
  getPackagePrice,
  isDiscountActive,
  DISCOUNT_PERCENT,
  DISCOUNT_UNTIL
} from "../../data/shopData";

const BOT_USERNAME = "mafia_users_bot";

const PACKAGE_IMAGES = {
  coins_999: "/tokens.png",
  coins_3000: "/tokens-3000.avif",
  coins_7000: "/tokens-7000.jpg",
  coins_10000: "/tokens-10000.jpg"
};

// Ссылка на бота с deep-link payload "пакет-ID_аккаунта" — так бот сразу
// знает, какой пакет купить и на какой аккаунт зачислить, не переспрашивая.
function botLink(pkgId, accountId) {
  const payload = accountId ? `${pkgId}-${accountId}` : pkgId;
  return `https://t.me/${BOT_USERNAME}?start=${payload}`;
}

export default function TopUpModal({ onClose, accountId }) {
  const [selected, setSelected] = useState(null);
  const discount = isDiscountActive();

  const handleSelect = (pkg) => {
    setSelected(pkg);
    // Открываем бота сразу — это происходит по клику пользователя, поэтому
    // блокировщики всплывающих окон это пропускают.
    window.open(botLink(pkg.id, accountId), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c100b] via-[#120a07] to-[#080402] p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[#d4af37] uppercase tracking-wide flex items-center gap-2">
            <img
              src="/tokens.png"
              alt=""
              className="w-[50px] h-[50px] rounded-full object-cover scale-[1.12]"
            />
            Пополнение Токенов
          </h2>
          <button
            onClick={onClose}
            className="text-[#c5a059] hover:text-[#d4af37] text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {discount && (
          <div className="mb-5 rounded-xl border border-emerald-600/60 bg-emerald-950/60 px-4 py-2 text-emerald-300 text-sm text-center">
            Скидка {DISCOUNT_PERCENT}% действует до{" "}
            {DISCOUNT_UNTIL.toLocaleDateString("ru-RU")}
          </div>
        )}

        {!selected ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COIN_PACKAGES.map((pkg) => {
              const price = getPackagePrice(pkg);
              const img = PACKAGE_IMAGES[pkg.id] || "/tokens.png";
              return (
                <button
                  key={pkg.id}
                  onClick={() => handleSelect(pkg)}
                  className="relative overflow-hidden rounded-2xl border border-[#c5a059]/40 hover:border-[#d4af37] hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition flex flex-col items-center justify-end gap-1.5 min-h-[160px] sm:min-h-[180px] p-4 text-center bg-cover bg-center"
                  style={{ backgroundImage: `url(${img})` }}
                >
                  {/* Затемнение снизу — чтобы текст было видно на любой картинке */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 pointer-events-none" />

                  <div className="relative text-xl font-black text-[#f3e5ab] flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {pkg.amount.toLocaleString("ru-RU")}
                    <img src="/tokens.png" alt="M" className="h-5 w-5 rounded-full object-contain" />
                  </div>
                  <div className="relative mt-1">
                    {discount && (
                      <span className="text-sm text-[#c5a059] line-through mr-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        ${pkg.basePrice}
                      </span>
                    )}
                    <span className="text-lg font-bold text-[#d4af37] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      ${price}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#c5a059]/30 bg-[#120a07] p-4 text-center flex flex-col items-center gap-3">
              <img
                src={PACKAGE_IMAGES[selected.id] || "/tokens.png"}
                alt=""
                className="h-28 w-28 object-contain rounded-full"
              />
              <p className="text-[#c5a059] text-sm">Вы выбрали</p>
              <p className="text-2xl font-black text-[#f3e5ab] flex items-center justify-center gap-2">
                {selected.amount.toLocaleString("ru-RU")}
                <img src="/tokens.png" alt="M" className="h-7 w-7 object-contain rounded-full" />
                <span className="text-[#d4af37]">— ${getPackagePrice(selected)}</span>
              </p>
            </div>

            <div className="rounded-xl border border-[#d4af37]/50 bg-[#1c100b] p-4 space-y-3 text-center">
              <p className="text-[#d4af37] font-bold uppercase text-sm tracking-wide">
                Мы открыли Telegram-бота в новой вкладке
              </p>
              <p className="text-sm text-[#e6d5bc]">
                Там нужно перевести деньги на карту и прислать скриншот
                оплаты — Токены зачислятся вам на этот же аккаунт
                автоматически после проверки.
              </p>
              <a
                href={botLink(selected.id, accountId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full rounded-xl bg-gradient-to-r from-[#8b0000] to-[#5c0000] py-3 text-[#f3e5ab] font-bold border border-[#d4af37]/60"
              >
                Открыть @{BOT_USERNAME}
              </a>
              <p className="text-[10px] text-[#8b6b12]">
                Не открылось само? Нажмите кнопку выше ещё раз.
              </p>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full rounded-xl border border-[#c5a059]/40 py-2 text-[#c5a059] hover:text-[#d4af37] hover:border-[#d4af37]"
            >
              ← Выбрать другой пакет
            </button>
          </div>
        )}
      </div>
    </div>
  );
}