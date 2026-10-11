import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faChartLine,
  faUsers,
  faBan,
  faMasksTheater,
  faBullhorn,
  faRightFromBracket,
  faMagnifyingGlass,
  faRotate,
  faDoorClosed
} from "@fortawesome/free-solid-svg-icons";
import roles from "../data/roles";
import {
  isAdmin,
  loginAdmin,
  logoutAdmin,
  adminOverview,
  adminSearch,
  adminPlayer,
  adminBan,
  adminUnban,
  adminBans,
  adminGive,
  adminCloseRoom,
  adminDisableRole,
  adminEnableRole,
  adminAnnounce,
  getDisabledRoles,
  getRoleDisableLabel
} from "../services/admin";
import { toast } from "../services/toast";
import Avatar from "../components/ui/Avatar";
import Modal from "../components/ui/Modal";
import useSeo from "../hooks/useSeo";

const TABS = [
  { id: "overview", label: "Обзор", icon: faChartLine },
  { id: "players", label: "Игроки", icon: faUsers },
  { id: "bans", label: "Баны", icon: faBan },
  { id: "roles", label: "Роли", icon: faMasksTheater },
  { id: "announce", label: "Объявление", icon: faBullhorn }
];

const BAN_DURATIONS = [
  ["1h", "1 час"],
  ["1d", "1 день"],
  ["7d", "7 дней"],
  ["30d", "30 дней"],
  ["permanent", "Навсегда"]
];

const PHASES = {
  lobby: "Лобби",
  waiting_ready: "Раздача ролей",
  night: "Ночь",
  night_end: "Конец ночи",
  morning: "Утро",
  voting: "Голосование",
  voting_loading: "Голосование",
  vote_pending: "Приговор",
  vote_result: "Итог дня",
  ended: "Игра окончена"
};

function notify(res) {
  toast({ kind: res?.success ? "success" : "error", text: res?.message || (res?.success ? "Готово" : "Ошибка") });
}

function formatUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} ч ${m} мин` : `${m} мин`;
}

export default function AdminPanel() {
  useSeo({ title: "Администрирование", noindex: true });
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(isAdmin());
  const [tab, setTab] = useState("overview");

  if (!authed) return <AdminLogin onDone={() => setAuthed(true)} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 anim-fade-up">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37]/30 to-[#8b0000]/30 text-2xl text-[#f3d27a] ring-1 ring-[#d4af37]/40">
            <FontAwesomeIcon icon={faShieldHalved} />
          </span>
          <div>
            <p className="eyebrow">Mafia Play</p>
            <h1 className="font-display text-3xl font-black gold-text sm:text-4xl">Админ-панель</h1>
          </div>
        </div>
        <button
          onClick={() => {
            logoutAdmin();
            navigate("/");
          }}
          className="btn btn-danger btn-sm"
        >
          <FontAwesomeIcon icon={faRightFromBracket} /> Выйти
        </button>
      </div>

      <div className="tabs anim-fade-up" style={{ "--i": 1 }} role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="tab">
            <FontAwesomeIcon icon={t.icon} className="mr-1.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="anim-fade-up">
        {tab === "overview" && <Overview />}
        {tab === "players" && <Players />}
        {tab === "bans" && <Bans />}
        {tab === "roles" && <RolesTab />}
        {tab === "announce" && <Announce />}
      </div>
    </div>
  );
}

function AdminLogin({ onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await loginAdmin(password);
    setBusy(false);
    if (res.success) onDone();
    else setError(res.message || "Неверный пароль");
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={submit} className="noir-card deco-corners w-full max-w-sm p-8 text-center anim-scale-in">
        <FontAwesomeIcon icon={faShieldHalved} className="text-4xl text-[#d4af37]" />
        <h1 className="mt-3 font-display text-2xl font-black gold-text">Вход для администратора</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Пароль"
          autoFocus
          className="input-noir mt-6"
        />
        {error && <p className="mt-2 text-sm text-red-400 anim-shake">{error}</p>}
        <button disabled={busy || !password} className="btn btn-gold mt-4 w-full">
          {busy ? "Проверяем…" : "Войти"}
        </button>
      </form>
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const res = await adminOverview();
    if (res.success) setData(res);
    else notify(res);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) return <p className="text-center text-[#a8916c] animate-pulse">Загрузка…</p>;

  const cards = [
    ["Онлайн", data.online],
    ["Комнат", data.rooms],
    ["Играют сейчас", data.inGame],
    ["Всего игроков", data.players],
    ["Сыграно партий", data.gamesPlayed],
    ["Создано комнат", data.roomsCreated],
    ["Банов", data.bans],
    ["Аптайм", formatUptime(data.uptimeSec)]
  ];

  return (
    <div className="space-y-6">
      {!data.persistent && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-200">
          ⚠️ Данные сервера (друзья, рейтинг, баны) хранятся во временной папке и пропадут при перезапуске
          сервера. Подключите бесплатную базу Upstash Redis — переменные{" "}
          <code className="text-amber-100">UPSTASH_REDIS_REST_URL</code> и{" "}
          <code className="text-amber-100">UPSTASH_REDIS_REST_TOKEN</code>.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value], i) => (
          <div key={label} className="noir-card noir-card--flat p-4 anim-scale-in" style={{ "--i": i }}>
            <div className="eyebrow !text-[0.58rem]">{label}</div>
            <div className="mt-1 font-display text-3xl font-black gold-text tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="noir-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#f3d27a]">Комнаты</h2>
          <button onClick={load} className="btn btn-ghost btn-sm">
            <FontAwesomeIcon icon={faRotate} /> Обновить
          </button>
        </div>
        {data.roomList.length === 0 ? (
          <p className="mt-4 text-sm text-[#a8916c]">Сейчас нет открытых комнат.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.roomList.map((r) => (
              <div key={r.code} className="rounded-xl border border-[#d4af37]/15 bg-black/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl font-black tracking-widest text-[#f3d27a]">{r.code}</span>
                    <span className={`chip ${r.started ? "chip--red" : "chip--green"}`}>
                      {PHASES[r.phase] || r.phase}
                      {r.started && r.night ? ` · ночь ${r.night}` : ""}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Закрыть комнату ${r.code}? Все игроки будут выкинуты.`)) return;
                      notify(await adminCloseRoom(r.code));
                      load();
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    <FontAwesomeIcon icon={faDoorClosed} /> Закрыть
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#a8916c]">
                  Мэр: <span className="text-[#e6d5bc]">{r.mayor.name}</span>
                  {r.mayor.accountId && <span className="font-mono"> #{r.mayor.accountId}</span>}
                  {!r.mayor.connected && <span className="text-red-400"> (не в сети)</span>}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.players.map((p, i) => (
                    <span key={i} className={`chip ${!p.alive ? "chip--muted line-through" : ""} ${!p.connected ? "opacity-50" : ""}`}>
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Players() {
  const [query, setQuery] = useState("");
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);

  const search = async (e) => {
    e?.preventDefault();
    const res = await adminSearch(query);
    if (res.success) setList(res.list);
    else notify(res);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="noir-card p-5">
        <form onSubmit={search} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя или ID игрока"
            className="input-noir"
          />
          <button className="btn btn-gold btn-icon shrink-0 !rounded-xl">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                selected === p.id ? "border-[#d4af37]/70 bg-[#d4af37]/10" : "border-[#d4af37]/10 bg-black/30 hover:border-[#d4af37]/40"
              }`}
            >
              <Avatar src={p.icon} size={38} online={p.online} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-[#f3e5ab]">{p.name}</div>
                <div className="font-mono text-[11px] text-[#a8916c]">#{p.id}</div>
              </div>
              {p.banned && <span className="chip chip--red">Бан</span>}
            </button>
          ))}
          {list.length === 0 && <p className="text-sm text-[#a8916c]">Введите имя или ID и нажмите поиск.</p>}
        </div>
      </div>
      {selected ? <PlayerCard id={selected} /> : (
        <div className="noir-card noir-card--flat flex items-center justify-center p-10 text-sm text-[#a8916c]">
          Выберите игрока слева
        </div>
      )}
    </div>
  );
}

function PlayerCard({ id }) {
  const [data, setData] = useState(null);
  const [banOpen, setBanOpen] = useState(false);
  const [duration, setDuration] = useState("1d");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("1000");

  const load = useCallback(async () => {
    const res = await adminPlayer(id);
    if (res.success) setData(res);
    else notify(res);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <div className="noir-card p-6 text-[#a8916c] animate-pulse">Загрузка…</div>;
  const p = data.player;

  return (
    <div className="noir-card p-6 anim-fade-up">
      <div className="flex items-center gap-4">
        <Avatar src={p.icon} size={64} online={p.online} />
        <div>
          <h3 className="font-display text-2xl font-bold text-[#f3e5ab]">{p.name}</h3>
          <p className="font-mono text-sm text-[#a8916c]">ID {p.id}</p>
          {p.online && p.roomCode && <span className="chip mt-1">В комнате {p.roomCode}</span>}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        {[
          ["Побед", p.wins],
          ["Игр", p.games],
          ["MVP", p.mvp],
          ["Друзей", p.friends]
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-black/30 py-3">
            <div className="font-display text-xl font-black text-[#f3d27a]">{v}</div>
            <div className="text-[10px] uppercase tracking-wider text-[#a8916c]">{l}</div>
          </div>
        ))}
      </div>
      {p.lastSeen && (
        <p className="mt-3 text-xs text-[#a8916c]">Последний визит: {new Date(p.lastSeen).toLocaleString("ru-RU")}</p>
      )}

      {data.ban && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
          Заблокирован: {data.ban.reason} ·{" "}
          {data.ban.until ? `до ${new Date(data.ban.until).toLocaleString("ru-RU")}` : "навсегда"}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {data.ban ? (
          <button
            onClick={async () => {
              notify(await adminUnban(id));
              load();
            }}
            className="btn btn-gold btn-sm"
          >
            Разбанить
          </button>
        ) : (
          <button onClick={() => setBanOpen(true)} className="btn btn-danger btn-sm">
            <FontAwesomeIcon icon={faBan} /> Забанить
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-[#d4af37]/15 pt-4">
        <p className="eyebrow !text-[0.6rem]">Выдать Токены (игрок должен быть онлайн)</p>
        <div className="mt-2 flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} className="input-noir" inputMode="numeric" />
          <button
            disabled={!p.online || !Number(amount)}
            onClick={async () => notify(await adminGive(id, Number(amount)))}
            className="btn btn-gold btn-sm shrink-0"
          >
            Выдать
          </button>
        </div>
      </div>

      <Modal open={banOpen} onClose={() => setBanOpen(false)}>
        <h3 className="font-display text-2xl font-black blood-text">Заблокировать {p.name}</h3>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {BAN_DURATIONS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setDuration(v)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                duration === v ? "border-[#d4af37] bg-[#d4af37]/15 text-[#f3d27a]" : "border-[#d4af37]/20 text-[#a8916c]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина (обязательно)" className="input-noir mt-4" />
        <button
          disabled={!reason.trim()}
          onClick={async () => {
            const res = await adminBan(id, duration, reason);
            notify(res);
            if (res.success) {
              setBanOpen(false);
              setReason("");
              load();
            }
          }}
          className="btn btn-blood mt-4 w-full"
        >
          Заблокировать
        </button>
      </Modal>
    </div>
  );
}

function Bans() {
  const [list, setList] = useState(null);
  const load = useCallback(async () => {
    const res = await adminBans();
    if (res.success) setList(res.list);
    else notify(res);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!list) return <p className="text-[#a8916c] animate-pulse">Загрузка…</p>;
  return (
    <div className="noir-card p-5">
      {list.length === 0 ? (
        <p className="text-sm text-[#a8916c]">Заблокированных игроков нет.</p>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-black/30 p-3">
              <div>
                <div className="font-bold text-[#f3e5ab]">
                  {b.name} <span className="font-mono text-xs text-[#a8916c]">#{b.id}</span>
                </div>
                <div className="text-xs text-[#a8916c]">
                  {b.reason} · {b.until ? `до ${new Date(b.until).toLocaleString("ru-RU")}` : "навсегда"}
                </div>
              </div>
              <button
                onClick={async () => {
                  notify(await adminUnban(b.id));
                  load();
                }}
                className="btn btn-gold btn-sm"
              >
                Разбанить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RolesTab() {
  const [, force] = useState(0);
  const [pending, setPending] = useState(null);

  useEffect(() => {
    const refresh = () => force((n) => n + 1);
    window.addEventListener("mafia-roles-disabled-changed", refresh);
    return () => window.removeEventListener("mafia-roles-disabled-changed", refresh);
  }, []);

  const disabled = getDisabledRoles();

  return (
    <>
      <p className="mb-4 text-sm text-[#a8916c]">
        Отключённую роль нельзя выбрать при настройке партии, и она не выпадет игрокам. Действует для всех комнат.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r, i) => {
          const off = disabled[r.id];
          return (
            <div key={r.id} className={`noir-card noir-card--flat flex items-center gap-3 p-3 anim-scale-in ${off ? "opacity-70" : ""}`} style={{ "--i": i }}>
              <img src={r.image} alt="" className={`h-14 w-14 rounded-xl object-cover ${off ? "grayscale" : ""}`} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[#f3e5ab]">{r.name}</div>
                <div className="text-[11px] text-[#a8916c]">{off ? getRoleDisableLabel(r.id) : r.team}</div>
              </div>
              {off ? (
                <button onClick={async () => notify(await adminEnableRole(r.id))} className="btn btn-gold btn-sm">
                  Вернуть
                </button>
              ) : (
                <button onClick={() => setPending(r)} className="btn btn-danger btn-sm">
                  Отключить
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)}>
        <h3 className="font-display text-2xl font-black text-[#f3d27a]">Отключить «{pending?.name}»</h3>
        <div className="mt-5 space-y-2">
          {[
            ["1h", "На 1 час"],
            ["1d", "На 1 день"],
            ["7d", "На 7 дней"],
            ["permanent", "До включения вручную"]
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={async () => {
                notify(await adminDisableRole(pending.id, v));
                setPending(null);
              }}
              className="btn btn-ghost w-full"
            >
              {l}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

function Announce() {
  const [text, setText] = useState("");
  return (
    <div className="noir-card max-w-xl p-6">
      <h2 className="font-display text-xl font-bold text-[#f3d27a]">Объявление для всех игроков онлайн</h2>
      <p className="mt-1 text-sm text-[#a8916c]">Появится всплывающим уведомлением на любой странице сайта.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={200}
        rows={4}
        placeholder="Например: через 10 минут перезапуск сервера"
        className="input-noir mt-4 resize-none"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-[#a8916c]">{text.length}/200</span>
        <button
          disabled={!text.trim()}
          onClick={async () => {
            const res = await adminAnnounce(text);
            notify(res);
            if (res.success) setText("");
          }}
          className="btn btn-blood"
        >
          <FontAwesomeIcon icon={faBullhorn} /> Отправить
        </button>
      </div>
    </div>
  );
}
