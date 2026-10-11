import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { toast } from "../services/toast";
import { credit } from "../services/wallet";
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
      sessionStorage.setItem("mafia_story_seen", "1");
      navigate(`/online?autojoin=${encodeURIComponent(roomCode)}`, { state: { fromStory: true } });
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
    socket.on("connect", hello);
    if (!socket.connected) socket.connect();
    else hello();
    return () => socket.off("connect", hello);
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
    const onCurrency = ({ amount }) => {
      if (amount > 0) {
        credit(amount);
        toast({ kind: "money", title: `+${amount} Токенов`, text: "Подарок от администрации" });
      }
    };
    const onBanned = (info) => setBan(info);
    const onUnbanned = () => setBan(null);

    socket.on("announcement", onAnnounce);
    socket.on("you-received-currency", onCurrency);
    socket.on("banned", onBanned);
    socket.on("unbanned", onUnbanned);

    return () => {
      offs.forEach((off) => off());
      socket.off("announcement", onAnnounce);
      socket.off("you-received-currency", onCurrency);
      socket.off("banned", onBanned);
      socket.off("unbanned", onUnbanned);
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
