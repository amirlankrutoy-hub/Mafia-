import { useEffect, useMemo, useState } from "react";
import roles from "../data/roles";
import { RARITIES, ROLE_RARITY } from "../data/chests";
import { ownsRole } from "../services/wallet";
import { isRoleDisabled } from "../services/admin";
import { useLanguage } from "../context/LanguageContext";

const GROUPS = [
  { id: "civilians", label: "Мирные жители", accent: "text-emerald-300" },
  { id: "mafia", label: "Мафия", accent: "text-red-400" },
  { id: "neutrals", label: "Нейтралы", accent: "text-[#f3d27a]" }
];

export default function PartySetup({ players, onStart, onClose }) {
  const { t } = useLanguage();
  const [selectedRoles, setSelectedRoles] = useState({});
  const [abilitiesEnabled, setAbilitiesEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState("easy");
  const [, force] = useState(0);

  useEffect(() => {
    const refresh = () => force((n) => n + 1);
    window.addEventListener("mafia-roles-disabled-changed", refresh);
    return () => window.removeEventListener("mafia-roles-disabled-changed", refresh);
  }, []);

  const total = useMemo(() => Object.values(selectedRoles).reduce((s, v) => s + v, 0), [selectedRoles]);
  const need = players.length;
  const mafiaCount = ["mafia", "otez", "vor"].reduce((s, r) => s + (selectedRoles[r] || 0), 0);

  const change = (id, d) =>
    setSelectedRoles((prev) => ({ ...prev, [id]: Math.max(0, Math.min(need, (prev[id] || 0) + d)) }));

  const autoFill = () => {
    // Быстрый расклад: ~1 мафия на 3–4 игрока, остальные — активные мирные и обыватели
    const avail = (id) => ownsRole(id) && !isRoleDisabled(id);
    const next = {};
    let left = need;
    const add = (id, n = 1) => {
      if (!avail(id) || left <= 0) return;
      const k = Math.min(n, left);
      next[id] = (next[id] || 0) + k;
      left -= k;
    };
    const mafia = Math.max(1, Math.round(need / 3.5));
    if (need >= 5) add("otez");
    add("mafia", mafia - (next.otez || 0));
    add("doctor");
    add("sherif");
    if (need >= 6) add("krasotka");
    if (need >= 7) add("manyak");
    if (need >= 8) add("sveshennik");
    add("obivatel", left);
    setSelectedRoles(next);
  };

  const ready = total === need && need > 0;
  const warn = need >= 3 && ready && mafiaCount === 0 ? "В партии нет мафии — мирным будет скучно" : null;

  return (
    <div className="fixed inset-0 z-[500] overflow-y-auto bg-[#070403]/97 backdrop-blur-md anim-fade-in">
      <div className="mx-auto max-w-6xl px-4 pb-40 pt-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Только для мэра</p>
            <h1 className="mt-1 font-display text-4xl font-black gold-text sm:text-5xl">Настройка партии</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={autoFill} className="btn btn-ghost btn-sm">✨ Авто-расклад</button>
            {onClose && (
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Назад</button>
            )}
          </div>
        </div>

        {GROUPS.map((g) => {
          const list = roles.filter((r) => r.category === g.id && !isRoleDisabled(r.id));
          if (!list.length) return null;
          return (
            <section key={g.id} className="mt-8">
              <h2 className={`eyebrow !tracking-[0.25em] ${g.accent}`}>{g.label}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((role, i) => {
                  const owned = ownsRole(role.id);
                  const count = selectedRoles[role.id] || 0;
                  return (
                    <div
                      key={role.id}
                      className={`group relative overflow-hidden rounded-2xl ring-1 transition anim-scale-in ${
                        count ? "ring-2 ring-[#f3d27a] shadow-[0_0_30px_-8px_rgba(212,175,55,0.7)]" : "ring-[#d4af37]/20"
                      }`}
                      style={{ "--i": i }}
                    >
                      <img
                        src={role.image}
                        alt={role.name}
                        className={`aspect-[2/3] w-full object-cover transition duration-700 group-hover:scale-105 ${owned ? "" : "grayscale opacity-40"}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                      {count > 0 && (
                        <span key={count} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#d4af37] font-black text-black anim-pop">
                          {count}
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <div className="font-display text-lg font-bold text-[#f3e5ab]">{role.name}</div>
                        {owned ? (
                          <div className="mt-2 flex items-center justify-between">
                            <button type="button" onClick={() => change(role.id, -1)} disabled={!count} className="btn btn-ghost btn-icon !h-9 !w-9 !text-lg">−</button>
                            <span className="font-display text-2xl font-black text-[#f3d27a]">{count}</span>
                            <button type="button" onClick={() => change(role.id, 1)} disabled={total >= need} className="btn btn-gold btn-icon !h-9 !w-9 !text-lg">+</button>
                          </div>
                        ) : (
                          <div className="mt-2 text-[11px] font-bold text-[#f3d27a]">
                            🔒 {RARITIES[ROLE_RARITY[role.id]]?.label} — выпадает из сундуков
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="noir-card noir-card--flat p-5">
            <p className="eyebrow">{t("difficulty")}</p>
            <div className="tabs mt-3">
              <button type="button" className="tab" aria-selected={difficulty === "easy"} onClick={() => setDifficulty("easy")}>
                {t("difficulty_easy")}
              </button>
              <button type="button" className="tab" aria-selected={difficulty === "hard"} onClick={() => setDifficulty("hard")}>
                {t("difficulty_hard")}
              </button>
            </div>
            <p className="mt-3 text-xs text-[#a8916c]">
              {difficulty === "easy" ? t("difficulty_easy_desc") : t("difficulty_hard_desc")}
            </p>
          </div>
          <label className="noir-card noir-card--flat flex cursor-pointer items-center justify-between gap-4 p-5">
            <div>
              <p className="eyebrow">Способности</p>
              <p className="mt-2 text-sm text-[#e6d5bc]">{t("abilities_enabled")}</p>
            </div>
            <input
              type="checkbox"
              checked={abilitiesEnabled}
              onChange={(e) => setAbilitiesEnabled(e.target.checked)}
              className="h-6 w-6 accent-[#d4af37]"
            />
          </label>
        </section>
      </div>

      {/* Панель старта */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#d4af37]/20 bg-[#0a0605]/95 backdrop-blur-xl safe-area-pb">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <div>
            <div className="text-sm text-[#a8916c]">
              Ролей выбрано{" "}
              <span className={`font-display text-2xl font-black ${ready ? "text-emerald-400" : total > need ? "text-red-400" : "text-[#f3d27a]"}`}>
                {total}/{need}
              </span>
            </div>
            {warn && <div className="text-xs text-amber-300">{warn}</div>}
            {!ready && <div className="text-xs text-[#a8916c]">Число ролей должно совпадать с числом игроков</div>}
          </div>
          <button
            type="button"
            onClick={() => onStart(selectedRoles, abilitiesEnabled, difficulty)}
            disabled={!ready}
            className={`btn btn-blood btn-lg ${ready ? "btn-pulse" : ""}`}
          >
            ▶ Начать игру
          </button>
        </div>
      </div>
    </div>
  );
}
