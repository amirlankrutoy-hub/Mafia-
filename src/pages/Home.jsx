import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faDoorOpen,
  faUsers,
  faMoon,
  faScaleBalanced,
  faRankingStar,
  faShieldHalved
} from '@fortawesome/free-solid-svg-icons';
import { DECORATIONS, ADMIN_DECORATION } from '../data/shopData';
import roles from '../data/roles';
import { ownsDecoration, getEquippedDecoration, setEquippedDecoration, getWallet } from '../services/wallet';
import { loginAdmin, isAdmin } from '../services/admin';
import { AVATAR_LIST, getSelectedAvatar, setSelectedAvatar } from '../services/profile';
import { SOCKET_URL } from '../socket';
import DecorationSVG from '../components/shop/DecorationSVG';
import Logo from '../components/ui/Logo';
import Modal from '../components/ui/Modal';
import useSeo from '../hooks/useSeo';

const ALL_DECORATIONS = [...DECORATIONS, ADMIN_DECORATION];

const STEPS = [
  { icon: faDoorOpen, title: 'Создайте комнату', text: 'Вы — мэр и ведущий. Получите код и отправьте его друзьям.' },
  { icon: faUsers, title: 'Соберите семью', text: 'Друзья входят по коду или приглашению. Мэр выбирает роли.' },
  { icon: faMoon, title: 'Ночь', text: 'Мафия выбирает жертву, Доктор лечит, Шериф стреляет, Красотка соблазняет.' },
  { icon: faScaleBalanced, title: 'День и суд', text: 'Город обсуждает и голосует. Мэр выносит приговор.' }
];

function useCountUp(target, ms = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function Stat({ label, value, i }) {
  const v = useCountUp(value);
  return (
    <div className="anim-fade-up text-center" style={{ '--i': i }}>
      <div className="font-display text-3xl sm:text-4xl font-black gold-text tabular-nums">{v.toLocaleString('ru-RU')}</div>
      <div className="eyebrow mt-1 !text-[0.6rem]">{label}</div>
    </div>
  );
}

function Home({ userName }) {
  useSeo({
    title: 'Мафия онлайн с друзьями — играть бесплатно',
    description:
      'Играйте в «Мафию» онлайн с друзьями прямо в браузере: создайте комнату, позовите друзей по коду, 12 ролей, мэр-ведущий, голосования и мировой рейтинг. Бесплатно и без регистрации.',
    path: '/'
  });

  const navigate = useNavigate();
  const goPlay = () => {
    sessionStorage.removeItem('mafia_story_seen');
    navigate('/online');
  };

  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`${SOCKET_URL.replace(/\/$/, '')}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setStats(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const [avatarIndex, setAvatarIndex] = useState(() => Math.max(0, AVATAR_LIST.indexOf(getSelectedAvatar())));
  const [decorId, setDecorId] = useState(getEquippedDecoration());
  const [wallet, setWallet] = useState(getWallet());
  const [avatarKey, setAvatarKey] = useState(0);

  useEffect(() => {
    const refresh = () => setWallet(getWallet());
    window.addEventListener('mafia-wallet-changed', refresh);
    return () => window.removeEventListener('mafia-wallet-changed', refresh);
  }, []);

  const currentAvatar = AVATAR_LIST[avatarIndex];
  const equippedDecoration = ALL_DECORATIONS.find((d) => d.id === decorId);
  const ownedDecorations = ALL_DECORATIONS.filter(
    (d) => ownsDecoration(d.id) || (d.id === ADMIN_DECORATION.id && wallet.isAdmin)
  );
  const decorationOptions = [{ id: null, name: 'Без украшения' }, ...ownedDecorations];
  const decorationIndex = Math.max(0, decorationOptions.findIndex((d) => d.id === decorId));

  const changeAvatar = (dir) => {
    const next = (avatarIndex + dir + AVATAR_LIST.length) % AVATAR_LIST.length;
    setAvatarIndex(next);
    setAvatarKey((k) => k + 1);
    setSelectedAvatar(AVATAR_LIST[next]);
    window.dispatchEvent(new CustomEvent('mafia-avatar-changed'));
  };

  const changeDecoration = (dir) => {
    const next = (decorationIndex + dir + decorationOptions.length) % decorationOptions.length;
    const nextId = decorationOptions[next].id;
    setDecorId(nextId);
    setEquippedDecoration(nextId);
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ---------- HERO ---------- */}
      <section className="relative grid items-center gap-10 pt-2 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <div className="relative z-10 order-2 text-center lg:order-1 lg:text-left">
          <p className="eyebrow anim-fade-up">Cosa Nostra · онлайн</p>
          <h1 className="mt-4 font-display text-5xl font-black leading-[0.95] sm:text-6xl xl:text-7xl anim-blur-in">
            <span className="gold-text">Город</span>
            <br />
            <span className="text-[#f3e5ab]">засыпает…</span>
            <br />
            <span className="blood-text anim-flicker">мафия</span>{' '}
            <span className="text-[#f3e5ab]">просыпается</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-[#c9b48f] sm:text-lg lg:mx-0 anim-fade-up" style={{ '--i': 3 }}>
            Легендарная «Мафия» прямо в браузере. Соберите друзей, раздайте роли и выясните, кто из вас лжёт.
            {userName && (
              <>
                {' '}С возвращением, <strong className="text-[#f3d27a]">{userName}</strong>.
              </>
            )}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start anim-fade-up" style={{ '--i': 5 }}>
            <button type="button" onClick={goPlay} className="btn btn-blood btn-lg btn-pulse w-full sm:w-auto">
              🎲 Начать игру
            </button>
            <Link to="/rules" className="btn btn-ghost btn-lg w-full sm:w-auto">
              Как играть
            </Link>
          </div>

          {stats && (
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 mx-auto lg:mx-0">
              <Stat label="Сейчас онлайн" value={Math.max(1, stats.online)} i={6} />
              <Stat label="Игроков" value={stats.players} i={7} />
              <Stat label="Сыграно партий" value={stats.gamesPlayed} i={8} />
            </div>
          )}
        </div>

        <div className="relative order-1 flex justify-center lg:order-2">
          <div className="pointer-events-none absolute inset-0 m-auto h-[85%] w-[85%] rounded-full border border-[#d4af37]/15 anim-spin-slow" />
          <div className="pointer-events-none absolute inset-0 m-auto h-[70%] w-[70%] rounded-full border border-dashed border-[#c0151f]/25 anim-spin-slow [animation-direction:reverse]" />
          <Logo size={420} intro float className="!w-[min(78vw,420px)] !h-[min(78vw,420px)]" />
        </div>
      </section>

      {/* ---------- КАК ИГРАТЬ ---------- */}
      <section>
        <div className="text-center">
          <p className="eyebrow">Четыре шага</p>
          <h2 className="mt-2 font-display text-3xl font-black text-[#f3e5ab] sm:text-4xl">Как проходит партия</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="noir-card noir-card--hover spotlight p-6 anim-fade-up" style={{ '--i': i }}>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37]/25 to-[#8b0000]/25 text-xl text-[#f3d27a] ring-1 ring-[#d4af37]/30">
                  <FontAwesomeIcon icon={s.icon} />
                </span>
                <span className="font-display text-5xl font-black text-[#d4af37]/10">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-[#f3d27a]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#c9b48f]">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- РОЛИ (бегущая лента) ---------- */}
      <section className="overflow-hidden">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">12 ролей</p>
            <h2 className="mt-2 font-display text-3xl font-black text-[#f3e5ab] sm:text-4xl">Кем вы станете сегодня?</h2>
          </div>
          <Link to="/roles" className="btn btn-ghost btn-sm shrink-0">Все роли →</Link>
        </div>
        <div className="relative mt-8 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="flex w-max gap-4 hover:[animation-play-state:paused]" style={{ animation: 'marquee 60s linear infinite' }}>
            {[...roles, ...roles].map((r, i) => (
              <Link
                key={i}
                to={`/role/${r.id}`}
                className="group relative h-64 w-44 shrink-0 overflow-hidden rounded-2xl ring-1 ring-[#d4af37]/25 transition hover:ring-[#f3d27a]/70"
              >
                <img src={r.image} alt={r.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <span className={`chip !text-[9px] ${r.category === 'mafia' ? 'chip--red' : r.category === 'neutrals' ? '' : 'chip--green'}`}>
                    {r.team}
                  </span>
                  <div className="mt-1.5 font-display text-lg font-bold text-[#f3e5ab]">{r.name}</div>
                </div>
              </Link>
            ))}
          </div>
          <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
        </div>
      </section>

      {/* ---------- ОБРАЗ ---------- */}
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <p className="eyebrow">Ваш образ</p>
          <h2 className="mt-2 font-display text-3xl font-black text-[#f3e5ab] sm:text-4xl">Выйдите к столу при параде</h2>
          <p className="mt-3 text-[#c9b48f]">
            Аватар и украшение увидят все игроки в лобби. Новые украшения — в магазине.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link to="/shop" className="btn btn-gold">Магазин</Link>
            <Link to="/top" className="btn btn-ghost">
              <FontAwesomeIcon icon={faRankingStar} /> Мировой топ
            </Link>
          </div>
        </div>

        <div className="noir-card deco-corners mx-auto w-full max-w-md p-7 text-center">
          <div className="flex items-center justify-center gap-5">
            <button type="button" onClick={() => changeAvatar(-1)} className="btn btn-ghost btn-icon" aria-label="Предыдущий аватар">
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="relative h-40 w-40">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#f3d27a] via-[#8b6b12] to-[#8b0000] opacity-80 blur-[2px] anim-spin-slow" />
              <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-[#0a0605] bg-black">
                <img key={avatarKey} src={currentAvatar} alt="Аватар" className="h-full w-full object-cover anim-scale-in" />
              </div>
              {equippedDecoration && (
                <div className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                  <DecorationSVG kind={equippedDecoration.kind} colors={equippedDecoration.colors} className="h-16 w-20" />
                </div>
              )}
            </div>
            <button type="button" onClick={() => changeAvatar(1)} className="btn btn-ghost btn-icon" aria-label="Следующий аватар">
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
          <p className="mt-4 text-xs text-[#a8916c]">Аватар {avatarIndex + 1} / {AVATAR_LIST.length}</p>

          {ownedDecorations.length > 0 && (
            <div className="mt-5 border-t border-[#d4af37]/15 pt-5">
              <p className="eyebrow !text-[0.6rem]">Украшение</p>
              <div className="mt-3 flex items-center justify-center gap-4">
                <button type="button" onClick={() => changeDecoration(-1)} className="btn btn-ghost btn-icon !h-9 !w-9">
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <span className="min-w-[9rem] text-sm font-bold uppercase tracking-wider text-[#f3e5ab]">
                  {decorationOptions[decorationIndex]?.name || 'Без украшения'}
                </span>
                <button type="button" onClick={() => changeDecoration(1)} className="btn btn-ghost btn-icon !h-9 !w-9">
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- SEO-текст ---------- */}
      <section className="noir-card noir-card--flat p-6 sm:p-10">
        <h2 className="font-display text-2xl font-black text-[#f3d27a]">Мафия онлайн — играйте с друзьями бесплатно</h2>
        <div className="mt-4 grid gap-4 text-sm leading-relaxed text-[#c9b48f] md:grid-cols-2">
          <p>
            Mafia Play — онлайн-версия знаменитой настольной игры «Мафия». Не нужны карты и ведущий за столом:
            один из игроков становится мэром, создаёт комнату и ведёт партию, а сайт сам раздаёт роли, ведёт ночные
            ходы и подсчитывает голоса.
          </p>
          <p>
            В игре 12 ролей: мирные жители (Доктор, Шериф, Красотка, Священник, Обыватель), мафия (Мафиози,
            Крёстный отец, Вор) и нейтралы (Маньяк, Потрошитель, Поклонница, Стукач). Побеждайте, поднимайтесь в
            мировом рейтинге и открывайте достижения.
          </p>
        </div>
      </section>

      <AdminFooter />
    </div>
  );
}

// Единственный вход в админ-панель — по паролю, проверяет сервер
function AdminFooter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const openPanel = () => {
    if (isAdmin()) navigate('/admin');
    else setOpen(true);
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await loginAdmin(password);
    setBusy(false);
    setPassword('');
    if (res.success) {
      setOpen(false);
      navigate('/admin');
    } else {
      setMsg(res.message || 'Неверный пароль');
    }
  }

  const linkCls = 'text-[11px] uppercase tracking-[0.2em] text-[#a8916c]/60 transition hover:text-[#f3d27a]';
  return (
    <footer className="border-t border-[#d4af37]/10 pt-8 pb-4">
      <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <span className="text-xs text-[#a8916c]/70">© {new Date().getFullYear()} Mafia Play</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/privacy" className={linkCls}>Конфиденциальность</Link>
          <Link to="/terms" className={linkCls}>Соглашение</Link>
          <button type="button" onClick={openPanel} className={linkCls}>
            <FontAwesomeIcon icon={faShieldHalved} className="mr-1.5" />
            Администрация
          </button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="text-center">
          <FontAwesomeIcon icon={faShieldHalved} className="text-3xl text-[#d4af37]" />
          <h3 className="mt-3 font-display text-2xl font-black gold-text">Вход для администратора</h3>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setMsg(null);
            }}
            placeholder="Пароль"
            className="input-noir"
            autoFocus
          />
          {msg && <p className="text-sm text-red-400 anim-shake">{msg}</p>}
          <button type="submit" disabled={busy || !password} className="btn btn-gold w-full">
            {busy ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
      </Modal>
    </footer>
  );
}

export default Home;
