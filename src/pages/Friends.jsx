import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faUserPlus,
  faDoorOpen,
  faCircle,
  faEarthAmericas,
  faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { socket } from '../socket';
import { getRecentPlayers } from '../services/friends';
import {
  announcePresence,
  fetchBulkStatus,
  searchByAccountId,
  knockOnRoom,
  onFriendJoinDecision,
  addFriendMutual,
  removeFriendMutual,
  getFriendsList,
  onFriendAdded,
  onFriendRemoved,
  onProfileChanged,
  getLeaderboard
} from '../services/presence';
import { getSelectedAvatar } from '../services/profile';
import PlayerProfileModal from '../components/PlayerProfileModal';

const DEFAULT_ICON = '/avatars/avatar1.svg';
const LEADERBOARD_TIMEOUT_MS = 8000;

const TABS = [
  { id: 'friends', label: 'Друзья' },
  { id: 'recent', label: 'Недавние' },
  { id: 'search', label: 'Поиск по ID' },
  { id: 'world', label: 'Мир' }
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
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [openProfileId, setOpenProfileId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [pendingAddId, setPendingAddId] = useState(null);

  const recent = getRecentPlayers();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    if (account) announcePresence(account.id, account.name);
  }, [account]);

  // Список друзей — всегда с сервера, поэтому виден сразу с любого
  // устройства, без заявок и подтверждений.
  const loadFriends = useCallback(async () => {
    if (!account?.id) return;
    setFriendsLoading(true);
    const list = await getFriendsList(account.id);
    setFriends(list || []);
    setFriendsLoading(false);
  }, [account?.id]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

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
  }, [friends]);

  useEffect(() => {
    refreshStatuses();
    const interval = setInterval(refreshStatuses, 5000);
    return () => clearInterval(interval);
  }, [refreshStatuses]);

  // Топ-200 по победам — загружаем при открытии вкладки "Мир". С таймаутом:
  // если сервер не отвечает (например, ещё не задеплоена свежая версия),
  // не висим в "Загрузка рейтинга..." вечно, а показываем понятную ошибку.
  useEffect(() => {
    if (tab !== 'world') return;
    let cancelled = false;
    setLeaderboardLoading(true);
    setLeaderboardError(false);

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLeaderboardLoading(false);
        setLeaderboardError(true);
      }
    }, LEADERBOARD_TIMEOUT_MS);

    getLeaderboard().then((list) => {
      clearTimeout(timeout);
      if (!cancelled) {
        setLeaderboard(list);
        setLeaderboardLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [tab]);

  // Кто-то добавил меня в друзья прямо сейчас — сразу появляется в списке,
  // без перезагрузки страницы.
  useEffect(() => {
    const off = onFriendAdded((friend) => {
      setFriends((prev) => (prev.some((f) => f.id === friend.id) ? prev : [...prev, friend]));
    });
    return off;
  }, []);

  useEffect(() => {
    const off = onFriendRemoved(({ byAccountId }) => {
      setFriends((prev) => prev.filter((f) => f.id !== byAccountId));
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
    if (!/^\d{6}$/.test(id)) {
      setSearchError('ID должен состоять из 6 цифр');
      return;
    }
    if (account && id === account.id) {
      setSearchError('Это ваш собственный ID');
      return;
    }
    const result = await searchByAccountId(id);
    // ID — это просто 6 случайных цифр без общего реестра аккаунтов на сервере,
    // поэтому "не найден" мы никогда не показываем: сервер физически не может
    // подтвердить, существует ли аккаунт с таким ID, если человек ни разу не
    // заходил на сайт с момента последнего перезапуска сервера.
    setSearchResult({ ...result, name: result?.name || `Игрок #${id}` });
    setStatuses((prev) => ({ ...prev, [id]: result }));
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

  // Добавление в друзья — сразу и взаимно, без подтверждения второй
  // стороны: как только жмёшь "Дружить", вы оба сразу видите друг друга
  // во вкладке "Друзья".
  const handleAddFriend = async (person) => {
    if (!account || isFriend(person.id)) return;
    setPendingAddId(person.id);
    const res = await addFriendMutual({
      toAccountId: person.id,
      fromAccountId: account.id,
      fromName: account.name,
      fromIcon: getSelectedAvatar()
    });
    setPendingAddId(null);
    if (res?.success) {
      setFriends((prev) =>
        prev.some((f) => f.id === person.id)
          ? prev
          : [...prev, res.friend || { id: person.id, name: person.name }]
      );
    } else {
      alert(res?.message || 'Не удалось добавить в друзья');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!account) return;
    const res = await removeFriendMutual({ myAccountId: account.id, friendId });
    if (res?.success) {
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    }
  };

  const isFriend = (id) => friends.some((f) => f.id === id);

  const renderRow = (person) => {
    const status = statuses[person.id];
    const alreadyFriend = isFriend(person.id);

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
            src={status?.icon || person.icon || DEFAULT_ICON}
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
          {tab !== 'friends' &&
            (alreadyFriend ? (
              <span className="flex items-center gap-1.5 rounded-lg bg-zinc-700/60 px-3 py-1.5 text-[10px] font-bold uppercase text-zinc-300 border border-zinc-600">
                ✓ В друзьях
              </span>
            ) : (
              <button
                type="button"
                disabled={pendingAddId === person.id}
                onClick={() => handleAddFriend(person)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase border border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faUserPlus} />
                {pendingAddId === person.id ? 'Добавляем...' : 'Дружить'}
              </button>
            ))}
          {tab === 'friends' && (
            <button
              type="button"
              onClick={() => handleRemoveFriend(person.id)}
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
            {t.id === 'world' && <FontAwesomeIcon icon={faEarthAmericas} className="mr-1.5" />}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-2.5">
        {tab === 'friends' &&
          (friendsLoading ? (
            <p className="text-center text-sm text-[#8b6b12] italic mt-8">Загрузка...</p>
          ) : friends.length ? (
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

        {tab === 'world' && (
          <div>
            {leaderboardLoading ? (
              <p className="text-center text-sm text-[#8b6b12] italic mt-8">Загрузка рейтинга...</p>
            ) : leaderboardError ? (
              <p className="text-center text-sm text-red-400 italic mt-8">
                Не удалось загрузить рейтинг. Попробуйте позже.
              </p>
            ) : leaderboard.length ? (
              <div className="space-y-2">
                {leaderboard.map((p, i) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setOpenProfileId(p.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition ${
                      i < 3
                        ? 'border-[#d4af37]/60 bg-[#d4af37]/10'
                        : 'border-[#d4af37]/20 bg-[#140b07]/70'
                    }`}
                  >
                    <span
                      className={`w-7 shrink-0 text-center font-black ${
                        i === 0
                          ? 'text-yellow-400'
                          : i === 1
                          ? 'text-zinc-300'
                          : i === 2
                          ? 'text-amber-600'
                          : 'text-[#8b6b12]'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <img
                      src={p.icon || DEFAULT_ICON}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full border border-[#d4af37]/50 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#f3e5ab] truncate">{p.name}</div>
                      <div className="text-[10px] text-[#8b6b12] font-mono">ID: {p.id}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-[#d4af37] font-bold text-sm">
                      <FontAwesomeIcon icon={faTrophy} className="text-[11px]" />
                      {p.wins}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-[#8b6b12] italic mt-8">
                Пока никто не одержал ни одной победы — рейтинг пуст.
              </p>
            )}
          </div>
        )}
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