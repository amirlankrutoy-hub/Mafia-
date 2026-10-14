import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { toast } from "../services/toast";
import { credit } from "../services/wallet";
import { applyTopup } from "../services/topup";
import { forgetLocalAccount } from "../services/auth";
import { adjustBalance, grantItem, revokeItem } from "../services/wallet";
import { adjustTeni } from "../services/teniWallet";
import { renameMyAccount } from "../services/accounts";
import { dropAdminSession, ADMIN_PATH } from "../services/admin";
import { setAccountStatus } from "../services/status";
import { addUnread } from "../services/dm";
import { isAdmin } from "../services/admin";
import { onDirectMessage } from "../services/presence";
import { resumeAdmin, setDisabledRolesCache } from "../services/admin";
import {
  announcePresence,
  getFriendRequests,
  respondFriendRequest,
  getDisabledRolesRemote,
  onFriendRequestIncoming,
  onFriendRequests,
  onFriendAccepted,
  onFriendInvite,
  onFriendJoinDecision,
  onDisabledRolesChanged
} from "../services/presence";

// Сколько входящих заявок — для бейджа в меню
export function emitRequestCount(n) {
  window.dispatchEvent(new CustomEvent("mafia-friend-requests", { detail: { count: n } }));
}

export async function refreshRequestCount() {
  const res = await getFriendRequests();
  emitRequestCount(res?.incoming?.length || 0);
  return res;
}

/**
 * Глобальные события сокета — работают на ЛЮБОЙ странице сайта.
 * Раньше уведомления о дружбе слушала только вкладка "Друзья", поэтому
 * второй игрок их просто не получал.
 */
export default function GlobalEvents({ account }) {
  const navigate = useNavigate();
  const [ban, setBan] = useState(null);
  const accountRef = useRef(account);
  accountRef.current = account;

  const joinRoom = useCallback(
    (roomCode) => {
      // История-интро не должна перехватывать вход по приглашению
      navigate(`/online?autojoin=${encodeURIComponent(roomCode)}`);
    },
    [navigate]
  );

  // Подключение + представление серверу на каждое (пере)подключение
  useEffect(() => {
    const hello = () => {
      const acc = accountRef.current;
      if (acc) announcePresence(acc.id, acc.name);
      resumeAdmin();
      getDisabledRolesRemote().then(setDisabledRolesCache);
      if (acc) refreshRequestCount();
    };
    // Аккаунт привязан к Google/почте, а входа на этом устройстве нет (или он истёк)
    const onAuthRequired = () => {
      forgetLocalAccount();
      toast({ kind: "info", title: "Войдите в аккаунт", text: "Этот аккаунт защищён — войдите через Google или почту." });
    };
    socket.on("auth:required", onAuthRequired);
    // Выдачи от администрации (валюта, предметы) — применяем и подтверждаем серверу
    const GRANT_NAMES = { role: "роль", avatar: "аватарка", emoji: "эмодзи", decoration: "украшение" };
    const onAdminGrant = (list) => {
      if (!Array.isArray(list)) return;
      const applied = JSON.parse(sessionStorage.getItem("mafia_applied_grants") || "[]");
      const ids = [];
      list.forEach((g) => {
        ids.push(g.id);
        if (applied.includes(g.id)) return;
        applied.push(g.id);
        if (g.type === "tokens") {
          adjustBalance(g.amount);
          toast({ kind: "money", title: `${g.amount > 0 ? "+" : ""}${g.amount} Токенов`, text: "От администрации" });
        } else if (g.type === "teni") {
          adjustTeni(g.amount);
          toast({ kind: "money", title: `${g.amount > 0 ? "+" : ""}${g.amount} теней`, text: "От администрации" });
        } else if (g.type === "item") {
          grantItem(g.kind, g.itemId);
          toast({ kind: "success", title: "Подарок от администрации", text: `Новая ${GRANT_NAMES[g.kind] || "вещь"} в вашей коллекции` });
        } else if (g.type === "remove-item") {
          revokeItem(g.kind, g.itemId);
        }
      });
      sessionStorage.setItem("mafia_applied_grants", JSON.stringify(applied.slice(-200)));
      socket.emit("admin-grant:ack", ids);
    };
    const onRenamed = ({ name }) => {
      if (!name) return;
      renameMyAccount(name);
      toast({ kind: "info", title: "Ваш ник изменён администрацией", text: `Теперь вы — ${name}` });
    };
    const onAdminMessage = ({ text }) => toast({ kind: "announce", title: "Сообщение от администрации", text, duration: 15000 });
    const onAdminAlert = ({ text }) => toast({ kind: "error", title: "Безопасность админки", text, duration: 12000 });
    const onAdminKicked = () => {
      dropAdminSession();
      toast({ kind: "info", text: "Сессия админ-панели закрыта" });
    };
    socket.on("admin-grant", onAdminGrant);
    socket.on("account:renamed", onRenamed);
    socket.on("admin-message", onAdminMessage);
    socket.on("admin:alert", onAdminAlert);
    socket.on("admin:kicked", onAdminKicked);
    socket.on("connect", hello);
    if (!socket.connected) socket.connect();
    else hello();
    return () => {
      socket.off("connect", hello);
      socket.off("auth:required", onAuthRequired);
      socket.off("admin-grant", onAdminGrant);
      socket.off("account:renamed", onRenamed);
      socket.off("admin-message", onAdminMessage);
      socket.off("admin:alert", onAdminAlert);
      socket.off("admin:kicked", onAdminKicked);
    };
  }, [account?.id]);

  useEffect(() => {
    const answer = async (person, accept) => {
      const res = await respondFriendRequest(person.id, accept);
      if (accept && res?.success) {
        toast({ kind: "success", title: "Теперь вы друзья", text: person.name, image: person.icon });
      }
      refreshRequestCount();
      window.dispatchEvent(new CustomEvent("mafia-friends-changed"));
    };

    const offs = [
      onFriendRequestIncoming((person) => {
        refreshRequestCount();
        window.dispatchEvent(new CustomEvent("mafia-friends-changed"));
        toast({
          kind: "friend",
          title: "Заявка в друзья",
          text: `${person.name} хочет добавить вас в друзья`,
          image: person.icon,
          duration: 15000,
          actions: [
            { label: "Принять", onClick: () => answer(person, true) },
            { label: "Отклонить", variant: "ghost", onClick: () => answer(person, false) }
          ]
        });
      }),
      onFriendRequests(({ incoming }) => {
        emitRequestCount(incoming.length);
        if (!incoming.length) return;
        toast({
          kind: "friend",
          title: incoming.length === 1 ? "Новая заявка в друзья" : `Заявок в друзья: ${incoming.length}`,
          text: incoming.length === 1 ? `${incoming[0].name} хочет добавить вас в друзья` : "Пока вас не было, вас добавили в друзья",
          duration: 9000,
          actions: [{ label: "Открыть", onClick: () => navigate("/friends?tab=requests") }]
        });
      }),
      onFriendAccepted((friend) => {
        window.dispatchEvent(new CustomEvent("mafia-friends-changed"));
        refreshRequestCount();
        toast({ kind: "success", title: "Заявка принята", text: `${friend.name} теперь ваш друг`, image: friend.icon });
      }),
      onFriendInvite(({ from, roomCode }) => {
        toast({
          kind: "invite",
          title: "Приглашение в игру",
          text: `${from.name} зовёт вас в комнату ${roomCode}`,
          image: from.icon,
          duration: 30000,
          actions: [
            { label: "Войти", onClick: () => joinRoom(roomCode) },
            { label: "Позже", variant: "ghost" }
          ]
        });
      }),
      onFriendJoinDecision(({ accepted, roomCode }) => {
        if (accepted) {
          toast({ kind: "success", title: "Мэр впустил вас", text: `Входим в комнату ${roomCode}…` });
          joinRoom(roomCode);
        } else {
          toast({ kind: "error", title: "Мэр отклонил запрос", text: "Попробуйте позже или попросите приглашение" });
        }
      }),
      onDisabledRolesChanged(setDisabledRolesCache)
    ];

    const onAnnounce = ({ text }) =>
      toast({ kind: "announce", title: "Объявление администрации", text, duration: 15000 });
    const onCurrency = ({ amount, from }) => {
      if (amount > 0) {
        credit(amount);
        toast({
          kind: "money",
          title: `+${amount} Токенов`,
          text: from === "support" ? "Бонус за назначение саппортом. Добро пожаловать в команду!" : "Подарок от администрации"
        });
      }
    };
    const onStatus = (st) => setAccountStatus(st);
    const onReport = (r) => {
      if (!isAdmin()) return;
      toast({
        kind: "announce",
        title: `Сообщение от саппорта ${r.fromName}`,
        text: r.text.slice(0, 140),
        duration: 12000,
        actions: [{ label: "Открыть", onClick: () => navigate(`${ADMIN_PATH}?tab=support`) }]
      });
    };
    const offDm = onDirectMessage((m) => {
      const me = accountRef.current?.id;
      if (!me || m.from === me) return;
      if (!addUnread(m.from)) return; // чат с этим другом сейчас открыт
      toast({
        kind: "friend",
        title: `Сообщение от ${m.fromName}`,
        text: m.text.slice(0, 120),
        image: m.fromIcon,
        duration: 8000,
        actions: [{ label: "Ответить", onClick: () => navigate(`/friends?chat=${m.from}`) }]
      });
    });
    // Оплата звёздами подтверждена сервером — зачисляем Токены
    const onTopup = (data) => applyTopup(data);
    const onBanned = (info) => setBan(info);
    const onUnbanned = () => setBan(null);

    socket.on("announcement", onAnnounce);
    socket.on("you-received-currency", onCurrency);
    socket.on("banned", onBanned);
    socket.on("unbanned", onUnbanned);
    socket.on("topup:success", onTopup);
    socket.on("account:status", onStatus);
    socket.on("admin:new-report", onReport);

    return () => {
      offs.forEach((off) => off());
      socket.off("announcement", onAnnounce);
      socket.off("you-received-currency", onCurrency);
      socket.off("banned", onBanned);
      socket.off("unbanned", onUnbanned);
      socket.off("topup:success", onTopup);
      socket.off("account:status", onStatus);
      socket.off("admin:new-report", onReport);
      offDm();
    };
  }, [joinRoom, navigate]);

  if (!ban) return null;
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
      <div className="noir-card deco-corners max-w-md p-8 text-center anim-scale-in">
        <div className="text-5xl">⛔</div>
        <h2 className="mt-3 font-display text-3xl font-black blood-text">Доступ закрыт</h2>
        <p className="mt-3 text-[#e6d5bc]">Причина: {ban.reason}</p>
        <p className="mt-1 text-sm text-[#a8916c]">
          {ban.until ? `До ${new Date(ban.until).toLocaleString("ru-RU")}` : "Блокировка бессрочная"}
        </p>
      </div>
    </div>
  );
}
