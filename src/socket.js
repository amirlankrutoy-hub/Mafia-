import { io } from "socket.io-client";

// URL сервера можно переопределить через .env (VITE_SOCKET_URL),
// не трогая код — удобно при смене хостинга или локальном запуске.
const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "https://mafia-server-production-dd33.up.railway.app";

export const socket = io(SOCKET_URL, {
    autoConnect: false,
});