import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey, faRightFromBracket, faShieldHalved, faCircleCheck, faCircleXmark, faRotate } from "@fortawesome/free-solid-svg-icons";
import { adminSecurity, adminChangePassword, adminLogoutAll } from "../../services/admin";
import { toast } from "../../services/toast";

const notify = (res) => toast({ kind: res?.success ? "success" : "error", text: res?.message || "Не получилось" });

/** Безопасность админки: смена пароля, закрытие сессий, журнал входов */
export default function SecurityTab() {
  const [data, setData] = useState(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await adminSecurity();
    if (res.success) setData(res);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-6">
        <div className="noir-card p-5">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[#f3d27a]">
            <FontAwesomeIcon icon={faShieldHalved} /> Защита
          </h2>
          <ul className="mt-3 space-y-1.5 text-xs text-[#c9b48f]">
            <li>• Панель открывается только по секретному адресу, без входа там «Страница не найдена».</li>
            <li>• 5 неверных паролей с одного адреса — блок на 15 минут; 20 со всех — вход закрыт для всех на 10 минут.</li>
            <li>• Вход действует 7 дней, о каждом новом входе приходит предупреждение остальным админам.</li>
            <li>
              • Вход только с разрешённых аккаунтов:{" "}
              <b className="text-[#f3e5ab]">{data?.accountLock?.length ? data.accountLock.join(", ") : "не включён"}</b>
            </li>
            <li>
              • Пароль: <b className="text-[#f3e5ab]">{data?.ownPassword ? "свой, сменён в панели" : "из настроек сервера"}</b>
            </li>
          </ul>
        </div>

        <form
          className="noir-card p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await adminChangePassword(current, next);
            setBusy(false);
            notify(res);
            if (res.success) {
              setCurrent("");
              setNext("");
              load();
            }
          }}
        >
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[#f3d27a]">
            <FontAwesomeIcon icon={faKey} /> Сменить пароль
          </h2>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Текущий пароль" className="input-noir mt-3" autoComplete="current-password" />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Новый пароль (от 10 символов)" className="input-noir mt-2" autoComplete="new-password" />
          <button disabled={busy || !current || next.length < 10} className="btn btn-gold mt-3 w-full">
            Сменить пароль
          </button>
          <p className="mt-2 text-[11px] text-[#a8916c]">После смены все остальные админы будут разлогинены.</p>
        </form>

        <div className="noir-card p-5">
          <p className="text-sm text-[#c9b48f]">
            Активных входов в панель: <b className="text-[#f3e5ab]">{data?.sessions ?? "…"}</b>
          </p>
          <button
            onClick={async () => {
              notify(await adminLogoutAll());
              load();
            }}
            className="btn btn-danger btn-sm mt-3 w-full"
          >
            <FontAwesomeIcon icon={faRightFromBracket} /> Закрыть все остальные входы
          </button>
        </div>
      </div>

      <div className="noir-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#f3d27a]">Журнал входов и действий</h2>
          <button onClick={load} className="btn btn-ghost btn-sm">
            <FontAwesomeIcon icon={faRotate} />
          </button>
        </div>
        <div className="mt-4 max-h-[65vh] space-y-1.5 overflow-y-auto pr-1">
          {!data ? (
            <p className="text-sm text-[#a8916c] animate-pulse">Загрузка…</p>
          ) : !data.log.length ? (
            <p className="text-sm text-[#a8916c]">Записей пока нет.</p>
          ) : (
            data.log.map((l, i) => (
              <div key={i} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${l.ok ? "border-white/5 bg-black/25" : "border-red-500/30 bg-red-950/20"}`}>
                <FontAwesomeIcon icon={l.ok ? faCircleCheck : faCircleXmark} className={`mt-0.5 ${l.ok ? "text-emerald-400" : "text-red-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[#e6d5bc]">
                    {l.action ? l.action : l.ok ? "Успешный вход" : `Неудачный вход: ${l.reason || ""}`}
                  </p>
                  <p className="font-mono text-[10px] text-[#a8916c]">
                    {new Date(l.at).toLocaleString("ru-RU")} · IP {l.ip || "—"} · ID {l.accountId || "—"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
