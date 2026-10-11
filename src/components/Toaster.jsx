import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faUserPlus,
  faDoorOpen,
  faBullhorn,
  faCircleCheck,
  faCircleExclamation,
  faCoins
} from "@fortawesome/free-solid-svg-icons";

const ICONS = {
  friend: faUserPlus,
  invite: faDoorOpen,
  announce: faBullhorn,
  success: faCircleCheck,
  error: faCircleExclamation,
  money: faCoins,
  info: faCircleCheck
};

const ACCENT = {
  error: "from-red-500/80 to-red-900/60",
  success: "from-emerald-400/80 to-emerald-900/50",
  announce: "from-[#c0151f] to-[#8b0000]",
  default: "from-[#f3d27a] to-[#8b6b12]"
};

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const timers = new Map();
    const remove = (id) => {
      setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 280);
      clearTimeout(timers.get(id));
      timers.delete(id);
    };
    const onToast = (e) => {
      const t = e.detail;
      setItems((list) => [...list.slice(-3), t]);
      if (t.duration > 0) timers.set(t.id, setTimeout(() => remove(t.id), t.duration));
    };
    const onDismiss = (e) => remove(e.detail.id);
    window.addEventListener("mafia-toast", onToast);
    window.addEventListener("mafia-toast-dismiss", onDismiss);
    return () => {
      window.removeEventListener("mafia-toast", onToast);
      window.removeEventListener("mafia-toast-dismiss", onDismiss);
      timers.forEach(clearTimeout);
    };
  }, []);

  const close = (id) => window.dispatchEvent(new CustomEvent("mafia-toast-dismiss", { detail: { id } }));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[2000] flex flex-col items-center gap-2.5 px-3 sm:items-end sm:right-4 sm:left-auto sm:top-4">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto noir-card w-full max-w-sm overflow-hidden transition-all duration-300 ${
            t.leaving ? "opacity-0 -translate-y-2 scale-95" : "toast-in"
          }`}
        >
          <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${ACCENT[t.kind] || ACCENT.default}`} />
          <div className="flex items-start gap-3 p-4 pl-5">
            {t.image ? (
              <img src={t.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[#d4af37]/60" />
            ) : (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/12 text-[#f3d27a] ring-1 ring-[#d4af37]/40">
                <FontAwesomeIcon icon={ICONS[t.kind] || ICONS.info} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              {t.title && <p className="font-display text-[15px] font-bold text-[#f3d27a] leading-tight">{t.title}</p>}
              {t.text && <p className="mt-0.5 text-[13px] leading-snug text-[#e6d5bc]/90">{t.text}</p>}
              {t.actions?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.actions.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        a.onClick?.();
                        close(t.id);
                      }}
                      className={`btn btn-sm ${a.variant === "ghost" ? "btn-ghost" : a.variant === "danger" ? "btn-danger" : "btn-gold"}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => close(t.id)}
              aria-label="Закрыть"
              className="-mr-1 -mt-1 rounded-full p-1.5 text-[#a8916c] hover:text-[#f3d27a] hover:bg-white/5"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
