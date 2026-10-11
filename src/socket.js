import { io } from "socket.io-client";

// Адрес игрового сервера. Переопределяется переменной VITE_GAME_SERVER_URL
// (в .env.local для локальной разработки или в настройках Vercel).
// Старую переменную VITE_SOCKET_URL намеренно не читаем: на Vercel в ней
// остался адрес выключенного сервера Railway, из-за чего сайт не подключался.
export const SOCKET_URL =
    import.meta.env.VITE_GAME_SERVER_URL ||
    "https://mafia-play-server.onrender.com";

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    // Бесплатный сервер Render может "просыпаться" до минуты — ждём дольше обычного
    timeout: 60000,
});
