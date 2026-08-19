import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faUserPlus,
  faDoorOpen,
  faCircle,
  faCheck,
  faXmark,
  faBell
} from '@fortawesome/free-solid-svg-icons';
import { socket } from '../socket';
import {
  getFriends,
  removeFriend,
  addFriend,
  getRecentPlayers,
  isSentRequest,
  markRequestSent,
  unmarkRequestSent
} from '../services/friends';
import {
  announcePresence,
  fetchBulkStatus,
  searchByAccountId,
  knockOnRoom,
  onFriendJoinDecision,
  sendFriendRequest,
  cancelFriendRequest,
  getFriendRequests,
  respondFriendRequest,
  onFriendRequestReceived,
  onFriendRequestAccepted,
  onProfileChanged
} from '../services/presence';
import { getSelectedAvatar } from '../services/profile';
import PlayerProfileModal from '../components/PlayerProfileModal';

const DEFAULT_ICON = '/avatars/avatar1.svg';

const TABS = [
  { id: 'friends', label: 'Друзья' },
  { id: 'recent', label: 'Недавние' },
  { id: 'search', label: 'Поиск по ID' },
  { id: 'requests', label: 'Заявки' }
];

function StatusBadge({ status }) {
  if (!status?.online) {
    return <span className="text-[11px] text-zinc-500">Не в сети</span>;
  }
  if (status.roomCode) {
    return (
      <span className="text-[11px] text-emerald-400 font-semibold">
        {status.isMayor ? 'Создал комнату' : 'В комнате'}
      </span>
    );
  }
  return <span className="text-[11px] text-cyan-400 font-semibold">В сети</span>;
}

const Friends = ({ account }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('friends');
  const [statuses, setStatuses] = useState({});
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [knocking, setKnocking] = useState(null); // { id, roomCode }
  const [friendsVersion, setFriendsVersion] = useState(0);
  const [requests, setRequests] = useState([]);
  const [openProfileId, setOpenProfileId] = useState(null);
  const [sentVersion, setSentVersion] = useState(0);

  const friends = getFriends();
  const recent = getRecentPlayers();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    if (account) announcePresence(account.id, account.name);
  }, [account]);

  useEffect(() => {
    const refresh = () => setFriendsVersion((v) => v + 1);
    window.addEventListener('mafia-friends-changed', refresh);
    return () => window.removeEventListener('mafia-friends-changed', refresh);
  }, []);

  const refreshStatuses = useCallback(async () => {
    const ids = [...friends.map((f) => f.id), ...recent.map((r) => r.id)];
    if (!ids.length) return;
    const list = await fetchBulkStatus(ids);
    const map = {};
    list.forEach((s) => {
      map[s.id] = s;
    });
    setStatuses((prev) => ({ ...prev, ...map }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsVersion]);

  useEffect(() => {
    refreshStatuses();
    const interval = setInterval(refreshStatuses, 5000);
    return () => clearInterval(interval);
  }, [refreshStatuses]);

  const loadRequests = useCallback(async () => {
    if (!account) return;
    const list = await getFriendRequests(account.id);
    setRequests(list || []);
  }, [account]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Живые уведомления о новых заявках
  useEffect(() => {
    const off = onFriendRequestReceived((req) => {
      setRequests((prev) => {
        if (prev.some((r) => r.fromAccountId === req.fromAccountId)) return prev;
        return [...prev, { ...req, createdAt: Date.now() }];
      });
    });
    return off;
  }, []);

  // Кто-то принял мою заявку — добавляем его себе в друзья
  useEffect(() => {
    const off = onFriendRequestAccepted(({ byAccountId, byName }) => {
      addFriend({ id: byAccountId, name: byName });
      unmarkRequestSent(byAccountId);
      setSentVersion((v) => v + 1);
      alert(`${byName} принял(а) вашу заявку в друзья!`);
    });
    return off;
  }, []);

  // Живое обновление иконок при смене профиля другим игроком
  useEffect(() => {
    const off = onProfileChanged((p) => {
      setStatuses((prev) => ({
        ...prev,
        [p.id]: { ...(prev[p.id] || { id: p.id }), icon: p.icon, favoriteRole: p.favoriteRole, wins: p.wins }
      }));
    });
    return off;
  }, []);

  useEffect(() => {
    const off = onFriendJoinDecision(({ accepted, roomCode }) => {
      setKnocking(null);
      if (accepted) {
        navigate(`/online?autojoin=${roomCode}`);
      } else {
        alert('Мэр не принял приглашение, вы не вошли в комнату.');
      }
    });
    return off;
  }, [navigate]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    const id = searchId.trim();
    if (!id) return;
    if (account && id === account.id) {
      setSearchError('Это ваш собственный ID');
      return;
    }
    const result = await searchByAccountId(id);
    if (!result?.online && !result?.name) {
      setSearchError('Игрок с таким ID не найден');
      return;
    }
    setSearchResult(result);
    setStatuses((prev) => ({ ...prev, [result.id]: result }));
  };

  const handleKnock = async (status) => {
    if (!account || !status?.roomCode) return;
    setKnocking({ id: status.id, roomCode: status.roomCode });
    const res = await knockOnRoom({
      toAccountId: status.id,
      roomCode: status.roomCode,
      fromAccountId: account.id,
      fromName: account.name
    });
    if (!res?.success) {
      setKnocking(null);
      alert(res?.message || 'Не удалось отправить заявку');
    }
  };

  const handleToggleFriendRequest = async (person) => {
    if (!account) return;
    const alreadySent = isSentRequest(person.id);

    if (alreadySent) {
      cancelFriendRequest({ toAccountId: person.id, fromAccountId: account.id });
      unmarkRequestSent(person.id);
      setSentVersion((v) => v + 1);
      return;
    }

    markRequestSent(person.id);
    setSentVersion((v) => v + 1);
    const res = await sendFriendRequest({
      toAccountId: person.id,
      fromAccountId: account.id,
      fromName: account.name,
      fromIcon: getSelectedAvatar()
    });
    if (!res?.success) {
      unmarkRequestSent(person.id);
      setSentVersion((v) => v + 1);
      alert(res?.message || 'Не удалось отправить заявку');
    }
  };

  const handleRespond = async (req, accepted) => {
    if (!account) return;
    await respondFriendRequest({
      myAccountId: account.id,
      fromAccountId: req.fromAccountId,
      accepted
    });
    setRequests((prev) => prev.filter((r) => r.fromAccountId !== req.fromAccountId));
    if (accepted) {
      addFriend({ id: req.fromAccountId, name: req.fromName });
    }
  };

  const renderRow = (person) => {
    const status = statuses[person.id];
    const sent = isSentRequest(person.id);
    // eslint-disable-next-line no-unused-expressions
    sentVersion; // подписка на перерисовку при смене состояния заявки

    return (
      <div
        key={person.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-[#d4af37]/25 bg-[#140b07]/70 px-4 py-3"
      >
        <button
          type="button"
          onClick={() => setOpenProfileId(person.id)}
          className="min-w-0 flex items-center gap-2.5 text-left"
        >
          <img
            src={status?.icon || DEFAULT_ICON}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full border border-[#d4af37]/50 object-cover"
          />
          <FontAwesomeIcon
            icon={faCircle}
            className={`text-[8px] ${status?.online ? 'text-emerald-400' : 'text-zinc-600'}`}
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#f3e5ab] truncate">{person.name}</div>
            <div className="text-[10px] text-[#8b6b12] font-mono">ID: {person.id}</div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} />
          {status?.online && status?.isMayor && status?.roomCode && (
            <button
              type="button"
              disabled={!!knocking}
              onClick={() => handleKnock(status)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] px-3 py-1.5 text-[10px] font-bold uppercase text-[#f3e5ab] border border-[#d4af37]/60 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faDoorOpen} />
              {knocking?.id === person.id ? 'Ждём мэра...' : 'Постучаться'}
            </button>
          )}
          {tab !== 'friends' && (
            <button
              type="button"
              onClick={() => handleToggleFriendRequest(person)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase border transition ${
                sent
                  ? 'bg-zinc-700/60 text-zinc-300 border-zinc-600'
                  : 'border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10'
              }`}
              title={sent ? 'Отменить заявку' : 'Отправить заявку в друзья'}
            >
              <FontAwesomeIcon icon={faUserPlus} />
              {sent ? 'Заявка отправлена' : 'Дружить'}
            </button>
          )}
          {tab === 'friends' && (
            <button
              type="button"
              onClick={() => removeFriend(person.id)}
              className="rounded-lg border border-red-500/40 px-2.5 py-1.5 text-[10px] uppercase text-red-400"
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-[#d4af37] text-center">
        Друзья
      </h1>

      {account && (
        <p className="mt-2 text-center text-[11px] text-[#8b6b12]">
          Ваш ID: <span className="font-mono text-[#d4af37]">{account.id}</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition ${
              tab === t.id
                ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/50'
                : 'text-[#c5a059] border-transparent hover:bg-[#d4af37]/5'
            }`}
          >
            {t.id === 'requests' && <FontAwesomeIcon icon={faBell} className="mr-1.5" />}
            {t.label}
            {t.id === 'requests' && requests.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-2.5">
        {tab === 'friends' &&
          (friends.length ? (
            friends.map(renderRow)
          ) : (
            <p className="text-center text-sm text-[#8b6b12] italic mt-8">
              У вас пока нет друзей. Добавьте игроков во вкладке «Поиск по ID» или из лобби игры.
            </p>
          ))}

        {tab === 'recent' &&
          (recent.length ? (
            recent.map(renderRow)
          ) : (
            <p className="text-center text-sm text-[#8b6b12] italic mt-8">
              Здесь появятся игроки, с которыми вы недавно играли.
            </p>
          ))}

        {tab === 'search' && (
          <div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Введите ID игрока..."
                className="flex-1 rounded-lg border border-[#c5a059]/40 bg-[#0d0907] px-3 py-2.5 text-sm text-[#e6d5bc] placeholder-[#c5a059]/40 focus:border-[#d4af37] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-[#8b0000] to-[#5c0000] px-4 py-2.5 text-[#f3e5ab] border border-[#d4af37]/60"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </form>

            {searchError && (
              <p className="mt-3 text-center text-xs text-red-400">{searchError}</p>
            )}

            {searchResult && (
              <div className="mt-4">{renderRow({ id: searchResult.id, name: searchResult.name })}</div>
            )}
          </div>
        )}

        {tab === 'requests' &&
          (requests.length ? (
            requests.map((req) => (
              <div
                key={req.fromAccountId}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#d4af37]/25 bg-[#140b07]/70 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => setOpenProfileId(req.fromAccountId)}
                  className="min-w-0 flex items-center gap-2.5 text-left"
                >
                  <img
                    src={req.fromIcon || DEFAULT_ICON}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border border-[#d4af37]/50 object-cover"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#f3e5ab]">
                      Игрок {req.fromName} хочет стать вашим другом!
                    </div>
                    <div className="text-[10px] text-[#8b6b12] font-mono">
                      ID: {req.fromAccountId}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRespond(req, true)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-700/80 px-3 py-1.5 text-[10px] font-bold uppercase text-white border border-emerald-400/40"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    Принять
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(req, false)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-[10px] font-bold uppercase text-red-400"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                    Отклонить
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-[#8b6b12] italic mt-8">
              Пока нет входящих заявок в друзья.
            </p>
          ))}
      </div>

      {openProfileId && (
        <PlayerProfileModal
          accountId={openProfileId}
          fallbackName={statuses[openProfileId]?.name}
          onClose={() => setOpenProfileId(null)}
        />
      )}
    </div>
  );
};

export default Friends;
