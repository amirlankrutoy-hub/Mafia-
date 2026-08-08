import { io } from "socket.io-client";

export const socket = io("https://mafia-server-production-dd33.up.railway.app", {
    autoConnect: false,
});