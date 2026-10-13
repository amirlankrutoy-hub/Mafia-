import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faUser, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { registerOrLoginByName } from '../services/accounts';
import { checkNameAvailable } from '../services/presence';
import { getAuthConfig, loadGoogleScript, loginWithEmail, loginWithGoogle, registerWithEmail } from '../services/auth';
import Logo from './ui/Logo';

/** Кнопка Google (официальная, от Google Identity Services) */
export function GoogleButton({ onCredential, text = 'signin_with', onUnavailable }) {
  const ref = useRef(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { googleClientId } = await getAuthConfig();
      if (!alive) return;
      if (!googleClientId) {
        setState('off');
        onUnavailable?.();
        return;
      }
      try {
        const google = await loadGoogleScript();
        if (!alive || !ref.current) return;
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (r) => r?.credential && cbRef.current(r.credential),
          ux_mode: 'popup',
          auto_select: false
        });
        google.accounts.id.renderButton(ref.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text,
          width: Math.min(320, ref.current.offsetWidth || 320),
          locale: 'ru'
        });
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [text]);

  if (state === 'off') return null;
  return (
    <div className="flex min-h-[44px] w-full justify-center">
      <div ref={ref} className="flex w-full justify-center" />
      {state === 'loading' && <p className="text-xs text-[#a8916c] animate-pulse">Загружаем вход через Google…</p>}
      {state === 'error' && <p className="text-xs text-red-400">Google сейчас недоступен — войдите по почте</p>}
    </div>
  );
}

const NameModal = ({ onAccountReady, reason }) => {
  const [mode, setMode] = useState('choose'); // choose | email | guest
  const [emailMode, setEmailMode] = useState('login'); // login | register
  const [inputName, setInputName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleOff, setGoogleOff] = useState(false);

  const done = (res) => {
    setBusy(false);
    if (!res?.success) return setError(res?.message || 'Не получилось. Попробуйте ещё раз.');
    if (!res.reloading) onAccountReady(res.account);
  };

  const handleGoogle = async (credential) => {
    setError('');
    setBusy(true);
    done(await loginWithGoogle(credential));
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    if (emailMode === 'register') {
      const name = inputName.trim();
      if (name.length < 2) return setError('Имя слишком короткое');
      setBusy(true);
      done(await registerWithEmail(email.trim(), password, name));
    } else {
      setBusy(true);
      done(await loginWithEmail(email.trim(), password));
    }
  };

  const handleGuest = async (e) => {
    e.preventDefault();
    setError('');
    const name = inputName.trim();
    if (!name) return;
    if (name.length < 2) return setError('Имя слишком короткое');
    setBusy(true);
    const { available, message } = await checkNameAvailable(name);
    setBusy(false);
    if (!available) return setError(message || 'Это имя уже занято другим игроком. Выберите другое.');
    const result = registerOrLoginByName(name);
    if (!result.success) return setError(result.message);
    onAccountReady(result.account);
  };

  const back = () => {
    setMode('choose');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md anim-fade-in" />
      <div className="noir-card deco-corners relative my-auto w-full max-w-md p-7 text-center anim-scale-in sm:p-9">
        {mode !== 'choose' && (
          <button type="button" onClick={back} className="absolute left-4 top-4 flex items-center gap-1.5 text-xs font-bold text-[#a8916c] hover:text-[#f3e5ab]">
            <FontAwesomeIcon icon={faArrowLeft} /> Назад
          </button>
        )}
        <Logo size={96} intro className="mx-auto" />
        <p className="eyebrow mt-4">Добро пожаловать в семью</p>
        <h2 className="mt-2 font-display text-3xl font-black gold-text">
          {mode === 'guest' ? 'Как вас зовут?' : mode === 'email' ? (emailMode === 'login' ? 'Вход по почте' : 'Регистрация') : 'Вход в игру'}
        </h2>
        {reason && mode === 'choose' && <p className="mt-2 rounded-lg bg-[#d4af37]/10 px-3 py-2 text-xs text-[#f3d27a]">{reason}</p>}

        {mode === 'choose' && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-[#a8916c]">
              Войдите через Google или почту — аккаунт, Токены и покупки сохранятся, даже если очистить браузер или сменить телефон.
            </p>
            <GoogleButton onCredential={handleGoogle} onUnavailable={() => setGoogleOff(true)} />
            <button type="button" onClick={() => setMode('email')} className="btn btn-gold w-full">
              <FontAwesomeIcon icon={faEnvelope} /> Войти по почте
            </button>
            <div className="flex items-center gap-3 py-1 text-[10px] uppercase tracking-widest text-[#a8916c]">
              <span className="h-px flex-1 bg-[#d4af37]/20" /> или <span className="h-px flex-1 bg-[#d4af37]/20" />
            </div>
            <button type="button" onClick={() => setMode('guest')} className="btn btn-ghost w-full">
              <FontAwesomeIcon icon={faUser} /> Играть как гость
            </button>
            {googleOff && <p className="text-[10px] text-[#a8916c]/70">Вход через Google скоро появится.</p>}
            {busy && <p className="text-xs text-[#f3d27a] animate-pulse">Входим…</p>}
            {error && <p className="text-xs font-semibold text-red-400 anim-shake">{error}</p>}
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={handleEmail} className="mt-6 space-y-3 text-left">
            <div className="tabs !p-1">
              <button type="button" className="tab flex-1 !py-1.5" aria-selected={emailMode === 'login'} onClick={() => setEmailMode('login')}>
                Вход
              </button>
              <button type="button" className="tab flex-1 !py-1.5" aria-selected={emailMode === 'register'} onClick={() => setEmailMode('register')}>
                Регистрация
              </button>
            </div>
            {emailMode === 'register' && (
              <input
                type="text"
                placeholder="Ваше имя в игре"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                className="input-noir"
                maxLength={20}
                autoComplete="nickname"
              />
            )}
            <input
              type="email"
              placeholder="Почта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-noir"
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder={emailMode === 'register' ? 'Придумайте пароль (от 6 символов)' : 'Пароль'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-noir"
              autoComplete={emailMode === 'register' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
            {emailMode === 'register' && (
              <p className="text-[11px] text-[#a8916c]">Если вы уже играли на этом устройстве как гость, ваш прогресс перейдёт в новый аккаунт.</p>
            )}
            {error && <p className="text-center text-xs font-semibold text-red-400 anim-shake">{error}</p>}
            <button type="submit" disabled={busy} className="btn btn-blood btn-lg w-full">
              {busy ? 'Секундочку…' : emailMode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>
        )}

        {mode === 'guest' && (
          <form onSubmit={handleGuest} className="mt-6 space-y-3">
            <p className="text-xs text-[#a8916c]">
              Гостевой аккаунт живёт только в этом браузере. Чтобы не потерять прогресс, позже привяжите Google или почту в настройках.
            </p>
            <input
              type="text"
              placeholder="Ваше имя…"
              value={inputName}
              onChange={(e) => {
                setInputName(e.target.value);
                if (error) setError('');
              }}
              className="input-noir text-center text-base"
              autoFocus
              maxLength={20}
            />
            {error && <p className="text-xs font-semibold text-red-400 anim-shake">{error}</p>}
            <button type="submit" disabled={busy || !inputName.trim()} className="btn btn-blood btn-lg w-full">
              {busy ? 'Проверяем…' : 'Войти в игру'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default NameModal;
