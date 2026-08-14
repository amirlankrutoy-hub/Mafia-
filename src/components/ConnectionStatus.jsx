import React, { useEffect, useState } from 'react';
import { socket } from '../socket';

/**
 * Показывает баннер, если не удаётся подключиться к игровому серверу —
 * чтобы проблема была видна сразу, без открытия консоли разработчика.
 */
const ConnectionStatus = () => {
  const [error, setError] = useState(null);

  useEffect(() => {
    const onError = (err) => {
      setError(err?.message || 'нет ответа от сервера');
    };
    const onConnect = () => setError(null);

    socket.on('connect_error', onError);
    socket.on('connect', onConnect);

    return () => {
      socket.off('connect_error', onError);
      socket.off('connect', onConnect);
    };
  }, []);

  if (!error) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[300] bg-red-900/95 border-b-2 border-red-500 text-center py-2 px-4 text-sm text-red-100">
      Нет соединения с игровым сервером ({error}). Проверьте, что сервер запущен
      и адрес в <code className="bg-black/30 px-1 rounded">VITE_SOCKET_URL</code> указан верно.
    </div>
  );
};

export default ConnectionStatus;
