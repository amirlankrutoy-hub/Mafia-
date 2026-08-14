import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faUserPlus, faDoorOpen, faCircle } from '@fortawesome/free-solid-svg-icons';
import { socket } from '../socket';
import {
  getFriends,
  removeFriend,
  addFriend,
  getRecentPlayers
} from '../services/friends';
import {
  announcePresence,
  fetchBulkStatus,
  searchByAccountId,
  knockOnRoom,
  onFriendJoinDecision
} from '../services/presence';

const TABS = [
  { id: 'friends', label: 'Друзья' },
  { id: 'recent', label: 'Недавние' },
  { id: 'search', label: 'Поиск по ID' }
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
    setStatuses(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsVersion]);

  useEffect(() => {
    refreshStatuses();
    const interval = setInterval(refreshStatuses, 5000);
    return () => clearInterval(interval);
  }, [refreshStatuses]);

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
    if (!result?.online) {
      setSearchError('Игрок с таким ID сейчас не в сети или не найден');
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

  const renderRow = (person) => {
    const status = statuses[person.id];
    return (
      <div
        key={person.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-[#d4af37]/25 bg-[#140b07]/70 px-4 py-3"
      >
        <div className="min-w-0 flex items-center gap-2">
          <FontAwesomeIcon
            icon={faCircle}
            className={`text-[8px] ${status?.online ? 'text-emerald-400' : 'text-zinc-600'}`}
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#f3e5ab] truncate">{person.name}</div>
            <div className="text-[10px] text-[#8b6b12] font-mono">ID: {person.id}</div>
          </div>
        </div>

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
              onClick={() => addFriend(person)}
              className="rounded-lg border border-[#d4af37]/50 px-2.5 py-1.5 text-[10px] uppercase text-[#d4af37]"
              title="Добавить в друзья"
            >
              <FontAwesomeIcon icon={faUserPlus} />
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

      <div className="mt-5 flex justify-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition ${
              tab === t.id
                ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/50'
                : 'text-[#c5a059] border-transparent hover:bg-[#d4af37]/5'
            }`}
          >
            {t.label}
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
      </div>
    </div>
  );
};

export default Friends;
