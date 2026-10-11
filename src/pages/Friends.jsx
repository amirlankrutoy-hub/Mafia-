import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faUserPlus,
  faDoorOpen,
  faCheck,
  faXmark,
  faCopy,
  faUserMinus,
  faClock,
  faRankingStar
} from '@fortawesome/free-solid-svg-icons';
import { getRecentPlayers } from '../services/friends';
import {
  fetchBulkStatus,
  searchByAccountId,
  knockOnRoom,
  sendFriendRequest,
  respondFriendRequest,
  cancelFriendRequest,
  getFriendRequests,
  removeFriend,
  getFriendsList,
  onPresenceChanged,
  onFriendRemoved,
  onFriendDeclined,
  onFriendRequestCancelled
} from '../services/presence';
import { refreshRequestCount } from '../components/GlobalEvents';
import { toast } from '../services/toast';
import PlayerProfileModal from '../components/PlayerProfileModal';
import Avatar from '../components/ui/Avatar';
import useSeo from '../hooks/useSeo';

const TABS = [
  { id: 'friends', label: 'Друзья' },
  { id: 'requests', label: 'Заявки' },
  { id: 'recent', label: 'Недавние' },
  { id: 'search', label: 'Найти' }
];

function StatusLine({ s }) {
  if (!s?.online) return <span className="text-[11px] text-zinc-500">Не в сети</span>;
  if (s.roomCode) {
    return <span className="text-[11px] font-semibold text-emerald-400">{s.isMayor ? `Ведёт комнату ${s.roomCode}` : 'Играет'}</span>;
  }
  return <span className="text-[11px] font-semibold text-emerald-400">В сети</span>;
}

const Friends = ({ account }) => {
  useSeo({ title: 'Друзья', description: 'Добавляйте друзей по ID, приглашайте их в комнату и играйте в Мафию вместе.', path: '/friends' });
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'friends';
  const setTab = (id) => setParams(id === 'friends' ? {} : { tab: id }, { replace: true });

  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [statuses, setStatuses] = useState({});
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [openProfileId, setOpenProfileId] = useState(null);
  const recent = getRecentPlayers();

  const load = useCallback(async () => {
    if (!account?.id) return;
    const [list, reqs] = await Promise.all([getFriendsList(account.id), getFriendRequests()]);
    setFriends(list || []);
    setRequests(reqs || { incoming: [], outgoing: [] });
    setLoading(false);
  }, [account?.id]);

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener('mafia-friends-changed', onChanged);
    const offs = [
      onFriendRemoved(onChanged),
      onFriendDeclined(onChanged),
      onFriendRequestCancelled(onChanged),
      onPresenceChanged((s) => {
        setStatuses((prev) => ({ ...prev, [s.id]: s }));
        setFriends((prev) => prev.map((f) => (f.id === s.id ? { ...f, ...s, name: s.name || f.name } : f)));
      })
    ];
    return () => {
      window.removeEventListener('mafia-friends-changed', onChanged);
      offs.forEach((off) => off());
    };
  }, [load]);

  // Статусы недавних игроков
  useEffect(() => {
    if (tab !== 'recent' || !recent.length) return;
    fetchBulkStatus(recent.map((r) => r.id)).then((list) => {
      const map = {};
      list.forEach((s) => (map[s.id] = s));
      setStatuses((prev) => ({ ...prev, ...map }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const isFriend = (id) => friends.some((f) => f.id === id);
  const isOutgoing = (id) => requests.outgoing.some((r) => r.id === id);
  const isIncoming = (id) => requests.incoming.some((r) => r.id === id);

  const addFriend = async (person) => {
    setBusyId(person.id);
    const res = await sendFriendRequest(person.id);
    setBusyId(null);
    if (!res?.success) return toast({ kind: 'error', text: res?.message || 'Не удалось отправить заявку' });
    if (res.status === 'friends') toast({ kind: 'success', title: 'Теперь вы друзья', text: person.name });
    else
      toast({
        kind: 'success',
        title: 'Заявка отправлена',
        text: res.delivered ? `${person.name} получил уведомление` : `${person.name} увидит заявку, когда зайдёт на сайт`
      });
    load();
  };

  const answer = async (person, accept) => {
    setBusyId(person.id);
    const res = await respondFriendRequest(person.id, accept);
    setBusyId(null);
    if (!res?.success) toast({ kind: 'error', text: res?.message || 'Ошибка' });
    else if (accept) toast({ kind: 'success', title: 'Теперь вы друзья', text: person.name });
    refreshRequestCount();
    load();
  };

  const knock = async (person) => {
    setBusyId(person.id);
    const res = await knockOnRoom({ roomCode: person.roomCode });
    setBusyId(null);
    if (res?.success) toast({ kind: 'invite', title: 'Запрос отправлен', text: 'Ждём ответа мэра…', duration: 8000 });
    else toast({ kind: 'error', text: res?.message || 'Не удалось' });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    const id = searchId.trim();
    if (!/^\d{4,10}$/.test(id)) return setSearchError('ID состоит только из цифр (обычно 6)');
    if (account && id === account.id) return setSearchError('Это ваш собственный ID');
    const result = await searchByAccountId(id);
    if (!result || !result.known) return setSearchError('Игрок с таким ID не найден');
    setSearchResult(result);
  };

  const actionFor = (person, status) => {
    const s = status || person;
    const busy = busyId === person.id;
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {isFriend(person.id) && s?.online && s?.isMayor && s?.roomCode && (
          <button disabled={busy} onClick={() => knock({ ...person, roomCode: s.roomCode })} className="btn btn-blood btn-sm">
            <FontAwesomeIcon icon={faDoorOpen} /> Постучаться
          </button>
        )}
        {tab === 'friends' ? (
          <button
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(`Удалить ${person.name} из друзей?`)) return;
              await removeFriend(person.id);
              load();
            }}
            className="btn btn-danger btn-sm !px-2.5"
            title="Удалить из друзей"
          >
            <FontAwesomeIcon icon={faUserMinus} />
          </button>
        ) : isFriend(person.id) ? (
          <span className="chip chip--green"><FontAwesomeIcon icon={faCheck} /> Друг</span>
        ) : isIncoming(person.id) ? (
          <button disabled={busy} onClick={() => answer(person, true)} className="btn btn-gold btn-sm">
            <FontAwesomeIcon icon={faCheck} /> Принять
          </button>
        ) : isOutgoing(person.id) ? (
          <span className="chip"><FontAwesomeIcon icon={faClock} /> Заявка отправлена</span>
        ) : (
          <button disabled={busy || !account} onClick={() => addFriend(person)} className="btn btn-gold btn-sm">
            <FontAwesomeIcon icon={faUserPlus} /> {busy ? '…' : 'Добавить'}
          </button>
        )}
      </div>
    );
  };

  const Row = ({ person, status, i, extra }) => {
    const s = status || statuses[person.id] || person;
    return (
      <div className="noir-card noir-card--flat noir-card--hover spotlight flex items-center gap-3 p-3 sm:p-4 anim-fade-up" style={{ '--i': i }}>
        <button type="button" onClick={() => setOpenProfileId(person.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar src={s.icon || person.icon} size={46} online={!!s.online} />
          <div className="min-w-0">
            <div className="truncate font-bold text-[#f3e5ab]">{s.name || person.name}</div>
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-mono text-[10px] text-[#a8916c]">#{person.id}</span>
              <StatusLine s={s} />
            </div>
          </div>
        </button>
        {extra || actionFor(person, s)}
      </div>
    );
  };

  const Empty = ({ children }) => (
    <div className="noir-card noir-card--flat p-10 text-center text-sm text-[#a8916c] anim-fade-in">{children}</div>
  );

  const online = friends.filter((f) => f.online).length;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <p className="eyebrow anim-fade-up">Ваша семья</p>
        <h1 className="mt-2 font-display text-4xl font-black gold-text sm:text-5xl anim-blur-in">Друзья</h1>
        {account && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(account.id);
              toast({ kind: 'success', text: 'ID скопирован — отправьте его другу' });
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-black/40 px-4 py-2 text-sm transition hover:border-[#d4af37]/70 anim-fade-up"
            style={{ '--i': 2 }}
          >
            Ваш ID: <span className="font-mono font-bold tracking-wider text-[#f3d27a]">{account.id}</span>
            <FontAwesomeIcon icon={faCopy} className="text-[#a8916c]" />
          </button>
        )}
      </header>

      <div className="mt-7 flex justify-center anim-fade-up" style={{ '--i': 3 }}>
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="tab">
              {t.label}
              {t.id === 'requests' && requests.incoming.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c0151f] px-1 text-[9px] text-white">
                  {requests.incoming.length}
                </span>
              )}
              {t.id === 'friends' && friends.length > 0 && <span className="ml-1.5 opacity-60">{friends.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div key={tab} className="mt-6 space-y-2.5">
        {tab === 'friends' &&
          (loading ? (
            <Empty>Загрузка…</Empty>
          ) : friends.length ? (
            <>
              <p className="px-1 text-xs text-[#a8916c]">В сети: {online} из {friends.length}</p>
              {[...friends]
                .sort((a, b) => Number(b.online) - Number(a.online))
                .map((f, i) => (
                  <Row key={f.id} person={f} status={f} i={i} />
                ))}
            </>
          ) : (
            <Empty>
              Пока никого нет. Найдите друга по ID во вкладке «Найти» или добавьте игрока прямо в лобби.
              <div className="mt-4">
                <button onClick={() => setTab('search')} className="btn btn-gold btn-sm">
                  <FontAwesomeIcon icon={faMagnifyingGlass} /> Найти друга
                </button>
              </div>
            </Empty>
          ))}

        {tab === 'requests' && (
          <>
            <h2 className="eyebrow px-1 pt-1">Входящие</h2>
            {requests.incoming.length ? (
              requests.incoming.map((r, i) => (
                <Row
                  key={r.id}
                  person={r}
                  status={r}
                  i={i}
                  extra={
                    <div className="flex gap-2">
                      <button disabled={busyId === r.id} onClick={() => answer(r, true)} className="btn btn-gold btn-sm">
                        <FontAwesomeIcon icon={faCheck} /> <span className="hidden sm:inline">Принять</span>
                      </button>
                      <button disabled={busyId === r.id} onClick={() => answer(r, false)} className="btn btn-ghost btn-sm">
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  }
                />
              ))
            ) : (
              <Empty>Новых заявок нет</Empty>
            )}
            <h2 className="eyebrow px-1 pt-4">Отправленные</h2>
            {requests.outgoing.length ? (
              requests.outgoing.map((r, i) => (
                <Row
                  key={r.id}
                  person={r}
                  status={r}
                  i={i}
                  extra={
                    <button
                      onClick={async () => {
                        await cancelFriendRequest(r.id);
                        load();
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      Отменить
                    </button>
                  }
                />
              ))
            ) : (
              <Empty>Вы никому не отправляли заявок</Empty>
            )}
          </>
        )}

        {tab === 'recent' &&
          (recent.length ? (
            recent.map((r, i) => <Row key={r.id} person={r} i={i} />)
          ) : (
            <Empty>Здесь появятся игроки, с которыми вы недавно играли.</Empty>
          ))}

        {tab === 'search' && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="noir-card flex gap-2 p-3">
              <input
                type="text"
                inputMode="numeric"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))}
                placeholder="Введите ID игрока, например 482913"
                className="input-noir font-mono tracking-wider"
                autoFocus
              />
              <button type="submit" className="btn btn-gold shrink-0">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </form>
            {searchError && <p className="text-center text-sm text-red-400 anim-shake">{searchError}</p>}
            {searchResult && <Row person={searchResult} status={searchResult} i={0} />}
            <p className="text-center text-xs text-[#a8916c]">
              Ищете сильных соперников? Загляните в{' '}
              <Link to="/top" className="text-[#f3d27a] underline-offset-4 hover:underline">
                <FontAwesomeIcon icon={faRankingStar} /> мировой топ
              </Link>
            </p>
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
