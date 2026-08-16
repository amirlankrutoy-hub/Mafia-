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
  console.log("ошибка сервера")
 
};

export default ConnectionStatus;
