import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import { getAuthConfig, linkGoogle, loginWithGoogleClerk } from '../services/auth';
import { finishClerkRedirect, takeClerkMode } from '../services/clerk';
import { toast } from '../services/toast';

/** Сюда Google (через Clerk) возвращает игрока после выбора аккаунта */
export default function AuthCallback({ onAccountReady }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const mode = takeClerkMode();
      const { clerkPublishableKey } = await getAuthConfig();
      if (!clerkPublishableKey) return setError('Вход через Google сейчас недоступен.');
      const result = await finishClerkRedirect(clerkPublishableKey).catch(() => null);
      if (!result?.token) return setError('Google не подтвердил вход. Попробуйте ещё раз.');

      if (mode === 'link') {
        const res = await linkGoogle(null, result.token);
        result.signOut();
        toast({
          kind: res?.success ? 'success' : 'error',
          title: res?.success ? 'Google привязан' : undefined,
          text: res?.success ? 'Теперь вы можете войти через Google на любом устройстве.' : res?.message
        });
        return navigate('/settings', { replace: true });
      }

      const res = await loginWithGoogleClerk(result.token);
      result.signOut();
      if (!res?.success) return setError(res?.message || 'Не получилось войти.');
      if (res.reloading) return; // прогресс восстановлен, страница перезагружается
      onAccountReady?.(res.account);
      toast({ kind: 'success', title: `С возвращением, ${res.account.name}!` });
      navigate('/', { replace: true });
    })();
  }, [navigate, onAccountReady]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Logo size={110} float />
      {error ? (
        <>
          <p className="max-w-sm text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => navigate('/', { replace: true })} className="btn btn-gold">
            На главную
          </button>
        </>
      ) : (
        <p className="text-lg text-[#f3d27a] animate-pulse">Входим через Google…</p>
      )}
    </div>
  );
}
