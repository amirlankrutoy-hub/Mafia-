import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminRoleInfo,
  logoutAdmin,
  banPlayer,
  unbanPlayer,
  getBans,
  getSiteStats,
  ADMIN_ROLES
} from "../services/admin";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [roleInfo, setRoleInfo] = useState(getAdminRoleInfo());
  const [bans, setBans] = useState(getBans());
  const [stats, setStats] = useState(getSiteStats());
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("1d");
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!roleInfo) {
      navigate("/");
      return;
    }
    const refresh = () => {
      setRoleInfo(getAdminRoleInfo());
      setBans(getBans());
      setStats(getSiteStats());
    };
    window.addEventListener("mafia-admin-changed", refresh);
    window.addEventListener("mafia-bans-changed", refresh);
    return () => {
      window.removeEventListener("mafia-admin-changed", refresh);
      window.removeEventListener("mafia-bans-changed", refresh);
    };
  }, [roleInfo, navigate]);

  if (!roleInfo) return null;

  const handleBan = () => {
    const res = banPlayer({
      targetName: target,
      duration,
      reason,
      bannedBy: roleInfo.label
    });
    setMsg(res);
    if (res.success) {
      setTarget("");
      setReason("");
      setBans(getBans());
    }
  };

  const handleUnban = (name) => {
    const res = unbanPlayer(name);
    setMsg(res);
    setBans(getBans());
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate("/");
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black uppercase tracking-wider" style={{ color: roleInfo.color }}>
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
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.success ? "bg-emerald-950/60 text-emerald-300 border border-emerald-600/40" : "bg-red-950/60 text-red-300 border border-red-600/40"}`}>
          {msg.message}
        </div>
      )}

      {/* Support telegram */}
      {roleInfo.id === "admin_support" && (
        <div className="rounded-xl border border-green-600/40 bg-green-950/30 p-4 text-green-300">
          Telegram владельца:{" "}
          <a href="https://t.me/Amir4k_Nurmatov" target="_blank" rel="noreferrer" className="underline font-bold">
            @Amir4k_Nurmatov
          </a>
          <p className="text-xs mt-1 opacity-80">+3000 Мафио уже начислены при входе</p>
        </div>
      )}

      {/* Stats for admin-setting */}
      {roleInfo.canSeeStats && (
        <div className="rounded-xl border border-[#d4af37]/40 bg-[#120a07] p-4 space-y-2">
          <h2 className="text-[#d4af37] font-bold uppercase text-sm">Статистика</h2>
          <p className="text-[#f3e5ab]">Посещений сайта (это устройство): <strong>{stats.visits}</strong></p>
          <p className="text-[#c5a059] text-sm">{stats.activeHint}</p>
        </div>
      )}

      {/* Ban form */}
      {roleInfo.canBan && (
        <div className="rounded-xl border border-[#d4af37]/40 bg-[#120a07] p-4 space-y-3">
          <h2 className="text-[#d4af37] font-bold uppercase text-sm">Забанить игрока</h2>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Ник игрока"
            className="w-full rounded-lg bg-black/40 border border-[#c5a059]/30 px-3 py-2 text-[#f3e5ab]"
          />
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Причина бана (обязательно)"
            rows={2}
            className="w-full rounded-lg bg-black/40 border border-[#c5a059]/30 px-3 py-2 text-[#f3e5ab]"
          />
          <div className="flex flex-wrap gap-2">
            {[
              { id: "1d", label: "1 день" },
              { id: "30d", label: "1 месяц" },
              { id: "permanent", label: "Пока не разбанят" }
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDuration(d.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${
                  duration === d.id
                    ? "border-[#d4af37] bg-[#8b0000] text-[#f3e5ab]"
                    : "border-[#c5a059]/40 text-[#c5a059]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleBan}
            className="w-full rounded-xl bg-gradient-to-r from-[#8b0000] to-[#5c0000] border border-[#d4af37] py-2.5 font-bold text-[#f3e5ab]"
          >
            Забанить
          </button>
        </div>
      )}

      {/* Ban list + unban */}
      <div className="rounded-xl border border-[#d4af37]/40 bg-[#120a07] p-4 space-y-3">
        <h2 className="text-[#d4af37] font-bold uppercase text-sm">Список банов</h2>
        {Object.keys(bans).length === 0 ? (
          <p className="text-[#c5a059] text-sm">Пусто</p>
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
                {(roleInfo.canUnban || roleInfo.id === "Admin" || roleInfo.id === "admin-setting") && (
                  <button
                    onClick={() => handleUnban(name)}
                    className="text-xs rounded border border-emerald-600/50 text-emerald-400 px-2 py-1 hover:bg-emerald-950/40"
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
        <div className="rounded-xl border border-red-600/40 bg-red-950/20 p-4 text-sm text-red-200">
          <h2 className="font-bold uppercase mb-2">Управление ролями</h2>
          <p>Вы можете удалять/изменять роли игроков (серверная часть — в разработке). Сейчас доступны баны и разбаны, статистика посещений.</p>
        </div>
      )}
    </div>
  );
}
