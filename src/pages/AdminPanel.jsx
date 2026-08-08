import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import roles from "../data/roles";
import {
  getAdminRoleInfo,
  logoutAdmin,
  unbanPlayer,
  getBans,
  getSiteStats,
  getDisabledRoles,
  disableRole,
  enableRole,
  getRoleDisableLabel
} from "../services/admin";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [roleInfo, setRoleInfo] = useState(getAdminRoleInfo());
  const [bans, setBans] = useState(getBans());
  const [stats, setStats] = useState(getSiteStats());
  const [disabled, setDisabled] = useState(getDisabledRoles());
  const [msg, setMsg] = useState(null);
  const [pendingRole, setPendingRole] = useState(null); // roleId awaiting duration choice

  useEffect(() => {
    if (!roleInfo) {
      navigate("/");
      return;
    }
    const refresh = () => {
      setRoleInfo(getAdminRoleInfo());
      setBans(getBans());
      setStats(getSiteStats());
      setDisabled(getDisabledRoles());
    };
    window.addEventListener("mafia-admin-changed", refresh);
    window.addEventListener("mafia-bans-changed", refresh);
    window.addEventListener("mafia-stats-changed", refresh);
    window.addEventListener("mafia-roles-disabled-changed", refresh);
    return () => {
      window.removeEventListener("mafia-admin-changed", refresh);
      window.removeEventListener("mafia-bans-changed", refresh);
      window.removeEventListener("mafia-stats-changed", refresh);
      window.removeEventListener("mafia-roles-disabled-changed", refresh);
    };
  }, [roleInfo, navigate]);

  if (!roleInfo) return null;

  const handleUnban = (name) => {
    const res = unbanPlayer(name);
    setMsg(res);
    setBans(getBans());
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate("/");
  };

  const confirmDisable = (duration) => {
    if (!pendingRole) return;
    disableRole(pendingRole, duration);
    setDisabled(getDisabledRoles());
    setMsg({
      success: true,
      message:
        duration === "permanent"
          ? `Роль «${pendingRole}» удалена навсегда`
          : `Роль «${pendingRole}» скрыта (${duration})`
    });
    setPendingRole(null);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1
          className="text-2xl font-black uppercase tracking-wider"
          style={{ color: roleInfo.color }}
        >
          Админ-панель · {roleInfo.label}
        </h1>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-[#c5a059]/50 px-4 py-2 text-sm text-[#c5a059] hover:border-[#d4af37] hover:text-[#d4af37]"
        >
          Выйти
        </button>
      </div>

      {msg && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            msg.success
              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-600/40"
              : "bg-red-950/60 text-red-300 border border-red-600/40"
          }`}
        >
          {msg.message}
        </div>
      )}

      {roleInfo.id === "admin_support" && (
        <div className="rounded-xl border border-green-600/40 bg-green-950/30 p-4 text-green-300">
          Telegram:{" "}
          <a
            href="https://t.me/Amir4k_Nurmatov"
            target="_blank"
            rel="noreferrer"
            className="underline font-bold"
          >
            @Amir4k_Nurmatov
          </a>
          <p className="text-xs mt-1 opacity-80">
            +3000 Мафио начислены. Бан — только игроков в лобби комнаты.
          </p>
        </div>
      )}

      {roleInfo.canSeeStats && (
        <div className="rounded-xl border border-[#d4af37]/40 bg-[#120a07] p-4 space-y-2">
          <h2 className="text-[#d4af37] font-bold uppercase text-sm">
            Статистика
          </h2>
          <p className="text-[#f3e5ab]">
            Посещений (это устройство): <strong>{stats.visits}</strong>
          </p>
          <p className="text-[#f3e5ab]">
            Игроков сейчас в комнатах:{" "}
            <strong>{stats.activePlayers}</strong>
          </p>
          <p className="text-[#c5a059] text-xs">
            Число игроков обновляется, когда кто-то в лобби/онлайне.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-[#d4af37]/40 bg-[#120a07] p-4 space-y-2">
        <h2 className="text-[#d4af37] font-bold uppercase text-sm">Баны</h2>
        <p className="text-[#c5a059] text-xs">
          Забанить можно только игрока, который сейчас в лобби (кнопки на
          карточке). Здесь — список и разбан.
        </p>
        {Object.keys(bans).length === 0 ? (
          <p className="text-[#c5a059] text-sm">Список пуст</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(bans).map(([name, info]) => (
              <li
                key={name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2 border border-[#c5a059]/20"
              >
                <div>
                  <span className="text-[#f3e5ab] font-bold">{name}</span>
                  <span className="text-xs text-[#c5a059] ml-2">
                    {info.duration} · {info.reason} · by {info.bannedBy}
                  </span>
                </div>
                {(roleInfo.canUnban ||
                  roleInfo.id === "Admin" ||
                  roleInfo.id === "admin-setting") && (
                  <button
                    onClick={() => handleUnban(name)}
                    className="text-xs rounded border border-emerald-600/50 text-emerald-400 px-2 py-1"
                  >
                    Разбанить
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {roleInfo.canManageRoles && (
        <div className="rounded-xl border border-red-600/40 bg-red-950/20 p-4 space-y-3">
          <h2 className="font-bold uppercase text-red-200 text-sm">
            Управление ролями
          </h2>
          <p className="text-xs text-red-200/80">
            Удаление роли: на час / на день / навсегда. Временно скрытые роли
            показывают всем, когда откроются. Навсегда — карточка пропадает.
          </p>
          <ul className="space-y-2">
            {roles.map((r) => {
              const dis = disabled[r.id];
              const label = getRoleDisableLabel(r.id);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2"
                >
                  <div>
                    <span className="text-[#f3e5ab] font-bold">{r.name}</span>
                    {label && (
                      <span className="ml-2 text-xs text-amber-400">{label}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {dis ? (
                      <button
                        onClick={() => {
                          enableRole(r.id);
                          setDisabled(getDisabledRoles());
                          setMsg({ success: true, message: `Роль «${r.name}» снова доступна` });
                        }}
                        className="text-xs rounded border border-emerald-600/50 text-emerald-400 px-2 py-1"
                      >
                        Вернуть
                      </button>
                    ) : (
                      <button
                        onClick={() => setPendingRole(r.id)}
                        className="text-xs rounded border border-red-500/50 text-red-400 px-2 py-1"
                      >
                        Удалить…
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Модалка выбора срока удаления роли */}
      {pendingRole && (
        <div className="fixed inset-0 z-[600] bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#d4af37] bg-[#120a07] p-6 space-y-3">
            <h3 className="text-[#d4af37] font-bold">
              На сколько удалить роль?
            </h3>
            <p className="text-xs text-[#c5a059]">id: {pendingRole}</p>
            <button
              onClick={() => confirmDisable("1h")}
              className="w-full rounded-lg border border-[#c5a059]/40 py-2 text-[#f3e5ab]"
            >
              На 1 час
            </button>
            <button
              onClick={() => confirmDisable("1d")}
              className="w-full rounded-lg border border-[#c5a059]/40 py-2 text-[#f3e5ab]"
            >
              На 1 день
            </button>
            <button
              onClick={() => confirmDisable("permanent")}
              className="w-full rounded-lg border border-red-500/50 py-2 text-red-400"
            >
              Навсегда
            </button>
            <button
              onClick={() => setPendingRole(null)}
              className="w-full rounded-lg py-2 text-[#c5a059] text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-[#c5a059]">
        <Link to="/" className="underline">
          ← На главную
        </Link>
      </p>
    </div>
  );
}
