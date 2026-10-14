import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faGem,
  faGift,
  faPen,
  faRotateLeft,
  faDoorOpen,
  faEnvelope,
  faKey,
  faRightFromBracket,
  faLinkSlash,
  faTrashCan
} from "@fortawesome/free-solid-svg-icons";
import roles from "../../data/roles";
import { AVATARS } from "../../data/avatars";
import { EMOJIS, DECORATIONS } from "../../data/shopData";
import { adminGrant, adminRename, adminResetStats, adminMessage, adminKick, adminAccount } from "../../services/admin";
import { toast } from "../../services/toast";

const notify = (res) => toast({ kind: res?.success ? "success" : "error", text: res?.message || (res?.success ? "Готово" : "Не получилось") });

const ITEM_LISTS = {
  role: { label: "Роль", list: roles.map((r) => ({ id: r.id, name: r.name })) },
  avatar: { label: "Аватарка", list: AVATARS.filter((a) => a.tier === "shop" || a.tier === "free").map((a) => ({ id: a.id, name: a.name })) },
  emoji: { label: "Эмодзи", list: EMOJIS.map((e) => ({ id: e.id, name: `${e.symbol} ${e.id.replace("e_", "")}` })) },
  decoration: { label: "Украшение", list: DECORATIONS.map((d) => ({ id: d.id, name: d.name })) }
};

function Block({ icon, title, children }) {
  return (
    <div className="rounded-2xl border border-[#d4af37]/15 bg-black/25 p-3">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-[#f3d27a]">
        <FontAwesomeIcon icon={icon} /> {title}
      </p>
      {children}
    </div>
  );
}

/** Полное управление игроком: валюта, предметы, ник, аккаунт, комната */
export default function PlayerControls({ id, player, onChanged }) {
  const [amount, setAmount] = useState("1000");
  const [teni, setTeni] = useState("100");
  const [kind, setKind] = useState("role");
  const [itemId, setItemId] = useState(ITEM_LISTS.role.list[0].id);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [pass, setPass] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const run = async (promise) => {
    const res = await promise;
    notify(res);
    if (res?.success) onChanged?.();
    return res;
  };

  return (
    <div className="mt-5 border-t border-[#d4af37]/15 pt-4">
      <p className="eyebrow !text-[0.6rem]">Полное управление</p>
      <p className="mt-1 text-[11px] text-[#a8916c]">
        Валюта и предметы доходят сразу, а если игрок не в сети — при его следующем входе.
        {player.pending ? ` Сейчас ждут доставки: ${player.pending}.` : ""}
      </p>
      <div className="mt-3 grid gap-3">
        <Block icon={faCoins} title="Токены">
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} className="input-noir min-w-0 flex-1 !py-2" inputMode="numeric" />
            <button disabled={!Number(amount)} onClick={() => run(adminGrant(id, { type: "tokens", amount: Number(amount) }))} className="btn btn-gold btn-sm shrink-0">
              + Выдать
            </button>
            <button disabled={!Number(amount)} onClick={() => run(adminGrant(id, { type: "tokens", amount: -Number(amount) }))} className="btn btn-danger btn-sm shrink-0">
              − Забрать
            </button>
          </div>
        </Block>

        <Block icon={faGem} title="Тени">
          <div className="flex gap-2">
            <input value={teni} onChange={(e) => setTeni(e.target.value.replace(/\D/g, ""))} className="input-noir min-w-0 flex-1 !py-2" inputMode="numeric" />
            <button disabled={!Number(teni)} onClick={() => run(adminGrant(id, { type: "teni", amount: Number(teni) }))} className="btn btn-gold btn-sm shrink-0">
              + Выдать
            </button>
            <button disabled={!Number(teni)} onClick={() => run(adminGrant(id, { type: "teni", amount: -Number(teni) }))} className="btn btn-danger btn-sm shrink-0">
              − Забрать
            </button>
          </div>
        </Block>

        <Block icon={faGift} title="Предметы">
          <div className="flex flex-wrap gap-2">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setItemId(ITEM_LISTS[e.target.value].list[0].id);
              }}
              className="input-noir !w-36 shrink-0 !py-2"
            >
              {Object.entries(ITEM_LISTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="input-noir !w-auto min-w-0 flex-1 !py-2">
              {ITEM_LISTS[kind].list.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => run(adminGrant(id, { type: "item", kind, itemId }))} className="btn btn-gold btn-sm flex-1">
              <FontAwesomeIcon icon={faGift} /> Выдать
            </button>
            <button onClick={() => run(adminGrant(id, { type: "remove-item", kind, itemId }))} className="btn btn-ghost btn-sm flex-1">
              <FontAwesomeIcon icon={faTrashCan} /> Забрать
            </button>
          </div>
        </Block>

        <Block icon={faPen} title="Ник и статистика">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder={player.name} className="input-noir min-w-0 flex-1 !py-2" />
            <button
              disabled={!name.trim()}
              onClick={async () => {
                const res = await run(adminRename(id, name.trim()));
                if (res?.success) setName("");
              }}
              className="btn btn-gold btn-sm shrink-0"
            >
              Сменить
            </button>
          </div>
          {confirmReset ? (
            <div className="mt-2 flex gap-2">
              <button
                onClick={async () => {
                  await run(adminResetStats(id));
                  setConfirmReset(false);
                }}
                className="btn btn-danger btn-sm flex-1"
              >
                Да, обнулить
              </button>
              <button onClick={() => setConfirmReset(false)} className="btn btn-ghost btn-sm flex-1">
                Отмена
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="btn btn-ghost btn-sm mt-2 w-full">
              <FontAwesomeIcon icon={faRotateLeft} /> Обнулить победы, игры и MVP
            </button>
          )}
        </Block>

        <Block icon={faKey} title="Вход в аккаунт">
          <p className="text-[11px] text-[#c9b48f]">
            Почта: <b className="text-[#f3e5ab]">{player.email || "не привязана"}</b> · Google:{" "}
            <b className="text-[#f3e5ab]">{player.googleEmail || "не привязан"}</b>
          </p>
          {player.email && (
            <div className="mt-2 flex gap-2">
              <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Новый пароль почты" className="input-noir min-w-0 flex-1 !py-2" />
              <button
                disabled={pass.length < 6}
                onClick={async () => {
                  const res = await run(adminAccount(id, "set-password", pass));
                  if (res?.success) setPass("");
                }}
                className="btn btn-gold btn-sm shrink-0"
              >
                Задать
              </button>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {player.googleEmail && (
              <button onClick={() => run(adminAccount(id, "unlink-google"))} className="btn btn-ghost btn-sm">
                <FontAwesomeIcon icon={faLinkSlash} /> Отвязать Google
              </button>
            )}
            <button onClick={() => run(adminAccount(id, "logout-everywhere"))} className="btn btn-ghost btn-sm">
              <FontAwesomeIcon icon={faRightFromBracket} /> Выйти на всех устройствах
            </button>
          </div>
        </Block>

        <Block icon={faEnvelope} title="Сообщение и комната">
          <div className="flex gap-2">
            <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={300} placeholder="Сообщение игроку" className="input-noir min-w-0 flex-1 !py-2" />
            <button
              disabled={!msg.trim() || !player.online}
              onClick={async () => {
                const res = await run(adminMessage(id, msg));
                if (res?.success) setMsg("");
              }}
              className="btn btn-gold btn-sm shrink-0"
            >
              Отправить
            </button>
          </div>
          <button disabled={!player.roomCode} onClick={() => run(adminKick(id))} className="btn btn-danger btn-sm mt-2 w-full">
            <FontAwesomeIcon icon={faDoorOpen} /> Удалить из комнаты {player.roomCode || ""}
          </button>
        </Block>
      </div>
    </div>
  );
}
