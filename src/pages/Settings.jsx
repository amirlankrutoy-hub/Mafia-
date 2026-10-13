import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGear,
  faUserShield,
  faMusic,
  faVolumeHigh,
  faLanguage,
  faWandMagicSparkles,
  faEnvelope,
  faRightFromBracket,
  faCircleCheck,
  faTriangleExclamation,
  faPlay
} from '@fortawesome/free-solid-svg-icons';
import useSeo from '../hooks/useSeo';
import { useMusic } from '../context/MusicContext';
import { useLanguage } from '../context/LanguageContext';
import { getSettings, updateSettings, onSettingsChanged, soundGain } from '../services/settings';
import { getAuth, linkEmail, linkGoogle, logout, forgetLocalAccount } from '../services/auth';
import { GoogleButton } from '../components/NameModal';
import { toast } from '../services/toast';

const FLAGS = { ru: '🇷🇺', uz: '🇺🇿', en: '🇬🇧' };

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

function Section({ icon, title, children, i = 0 }) {
  return (
    <section className="settings-card anim-fade-up" style={{ '--i': i }}>
      <h2 className="flex items-center gap-3 font-display text-xl font-black text-[#f3e5ab]">
        <span className="settings-card__icon">
          <FontAwesomeIcon icon={icon} />
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-bold text-[#e6d5bc]">{label}</span>
        {hint && <span className="block text-[11px] text-[#a8916c]">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#d4af37]' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function Slider({ label, value, onChange, extra }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-[#e6d5bc]">{label}</span>
        <span className="flex items-center gap-2">
          {extra}
          <span className="w-10 text-right font-mono text-[#f3d27a]">{value}%</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="settings-range mt-2 w-full"
        style={{ '--val': `${value}%` }}
      />
    </div>
  );
}

function playTestSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(660, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.35);
    g.gain.setValueAtTime(Math.max(0.0001, 0.4 * soundGain()), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 800);
  } catch {}
}

function AccountSection({ account }) {
  const [auth, setAuthState] = useState(getAuth());
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmGuestLogout, setConfirmGuestLogout] = useState(false);

  useEffect(() => {
    const h = () => setAuthState(getAuth());
    window.addEventListener('mafia-auth-changed', h);
    return () => window.removeEventListener('mafia-auth-changed', h);
  }, []);

  const links = auth?.links || {};
  const linked = !!(links.email || links.google);

  const onGoogle = async (credential) => {
    setBusy(true);
    const res = await linkGoogle(credential);
    setBusy(false);
    toast({ kind: res?.success ? 'success' : 'error', title: res?.success ? 'Google привязан' : undefined, text: res?.success ? 'Теперь вы можете войти через Google на любом устройстве.' : res?.message });
  };

  const onEmail = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await linkEmail(email.trim(), password);
    setBusy(false);
    if (res?.success) {
      setEmailOpen(false);
      setPassword('');
      toast({ kind: 'success', title: 'Почта привязана', text: 'Входите по почте и паролю на любом устройстве.' });
    } else toast({ kind: 'error', text: res?.message || 'Не получилось' });
  };

  if (!account) return <p className="text-sm text-[#a8916c]">Вы ещё не вошли в игру.</p>;

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-black/30 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-bold text-[#f3e5ab]">{account.name}</div>
          <div className="font-mono text-[11px] text-[#a8916c]">ID {account.id}</div>
        </div>
        {linked ? (
          <span className="chip chip--green shrink-0">
            <FontAwesomeIcon icon={faCircleCheck} className="mr-1" /> Защищён
          </span>
        ) : (
          <span className="chip chip--red shrink-0">
            <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" /> Гость
          </span>
        )}
      </div>

      {!linked && (
        <p className="rounded-xl border border-red-500/25 bg-red-900/10 px-4 py-3 text-xs text-red-200">
          Гостевой аккаунт хранится только в этом браузере. Если очистить данные сайта или сменить телефон — он пропадёт вместе с
          Токенами. Привяжите Google или почту, чтобы вход всегда возвращал вас в этот аккаунт.
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex w-4 justify-center"><GoogleIcon /></span>
          <span className="flex-1 text-[#e6d5bc]">Google</span>
          {links.google ? <span className="text-xs text-emerald-300">{links.googleEmail || 'привязан'}</span> : null}
        </div>
        {!links.google && <GoogleButton onCredential={onGoogle} text="continue_with" />}

        <div className="flex items-center gap-3 pt-2 text-sm">
          <FontAwesomeIcon icon={faEnvelope} className="w-4 text-[#d4af37]" />
          <span className="flex-1 text-[#e6d5bc]">Почта</span>
          {links.email ? (
            <span className="text-xs text-emerald-300">{links.email}</span>
          ) : (
            <button type="button" onClick={() => setEmailOpen((v) => !v)} className="btn btn-gold btn-sm">
              Привязать
            </button>
          )}
        </div>
        {links.email && (
          <button type="button" onClick={() => setEmailOpen((v) => !v)} className="text-[11px] text-[#a8916c] underline">
            Сменить пароль или почту
          </button>
        )}
        {emailOpen && (
          <form onSubmit={onEmail} className="space-y-2 rounded-xl bg-black/30 p-3">
            <input type="email" required placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} className="input-noir" autoComplete="email" />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Пароль (от 6 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-noir"
              autoComplete="new-password"
            />
            <button type="submit" disabled={busy} className="btn btn-blood w-full">
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </form>
        )}
      </div>

      <div className="border-t border-[#d4af37]/10 pt-4">
        {linked ? (
          <button type="button" onClick={() => logout()} className="btn btn-ghost w-full">
            <FontAwesomeIcon icon={faRightFromBracket} /> Выйти из аккаунта
          </button>
        ) : confirmGuestLogout ? (
          <div className="space-y-2 rounded-xl border border-red-500/30 p-3 text-center">
            <p className="text-xs text-red-200">Гостевой аккаунт удалится с этого устройства навсегда. Точно выйти?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  forgetLocalAccount();
                  window.location.assign('/');
                }}
                className="btn btn-blood btn-sm flex-1"
              >
                Да, выйти
              </button>
              <button type="button" onClick={() => setConfirmGuestLogout(false)} className="btn btn-ghost btn-sm flex-1">
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmGuestLogout(true)} className="btn btn-ghost w-full">
            <FontAwesomeIcon icon={faRightFromBracket} /> Выйти из аккаунта
          </button>
        )}
      </div>
    </>
  );
}

export default function Settings({ account }) {
  useSeo({ title: 'Настройки', description: 'Настройки Mafia Play: аккаунт, музыка, звуки и язык.', path: '/settings' });
  const [s, setS] = useState(getSettings());
  const { menuMuted, lobbyMuted, toggleMenuMute, toggleLobbyMute } = useMusic();
  const { language, setLanguage, languages } = useLanguage();

  useEffect(() => onSettingsChanged(setS), []);
  const set = (patch) => setS(updateSettings(patch));

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-1 py-6">
      <header className="text-center anim-fade-up">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#a8916c]">Под себя</p>
        <h1 className="ach-title mt-1 flex items-center justify-center gap-3 font-display text-4xl font-black sm:text-5xl">
          <FontAwesomeIcon icon={faGear} className="text-3xl text-[#d4af37]" /> Настройки
        </h1>
      </header>

      <Section icon={faUserShield} title="Аккаунт" i={1}>
        <AccountSection account={account} />
      </Section>

      <Section icon={faMusic} title="Музыка и звуки" i={2}>
        <Toggle label="Музыка в меню" checked={!menuMuted} onChange={toggleMenuMute} />
        <Toggle label="Музыка в лобби" checked={!lobbyMuted} onChange={toggleLobbyMute} />
        <Slider label="Громкость музыки" value={s.musicVolume} onChange={(v) => set({ musicVolume: v })} />
        <Slider
          label="Громкость звуков"
          value={s.soundVolume}
          onChange={(v) => set({ soundVolume: v })}
          extra={
            <button type="button" onClick={playTestSound} className="btn btn-ghost btn-sm !px-2 !py-1 text-[10px]" title="Проверить звук">
              <FontAwesomeIcon icon={faPlay} /> Тест
            </button>
          }
        />
        <Toggle
          label="Тишина в фоне"
          hint="Музыка останавливается, когда вы сворачиваете сайт или переходите на другую вкладку"
          checked={s.pauseInBackground}
          onChange={(v) => set({ pauseInBackground: v })}
        />
      </Section>

      <Section icon={faLanguage} title="Язык игры" i={3}>
        <div className="grid grid-cols-3 gap-2">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={`ach-pill justify-center !py-2.5 ${language === l.code ? 'ach-pill--active' : ''}`}
            >
              <span>{FLAGS[l.code]}</span> {l.label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={faWandMagicSparkles} title="Интерфейс" i={4}>
        <Toggle
          label="Меньше анимаций"
          hint="Отключает большинство движений и эффектов — удобно на слабых телефонах"
          checked={s.reduceMotion}
          onChange={(v) => set({ reduceMotion: v })}
        />
        <Toggle label="Вибрация" hint="Короткая вибрация на важных событиях (если телефон поддерживает)" checked={s.vibration} onChange={(v) => set({ vibration: v })} />
      </Section>

      <p className="pb-4 text-center text-[11px] text-[#a8916c]/70">
        <FontAwesomeIcon icon={faVolumeHigh} className="mr-1" /> Настройки сохраняются в аккаунте и переносятся на другие устройства после входа.
      </p>
    </div>
  );
}
