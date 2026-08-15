import { socket } from "../socket";

const ACK_TIMEOUT_MS = 8000;

// Оборачивает emit с ack-колбэком: если сервер не ответил за ACK_TIMEOUT_MS,
// возвращаем понятную ошибку вместо вечного "зависания" интерфейса.
function emitWithTimeout(event, ...args) {
    return new Promise((resolve) => {
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve({
                success: false,
                message:
                    "Сервер не отвечает. Проверьте, что игровой сервер запущен и доступен."
            });
        }, ACK_TIMEOUT_MS);

        const onConnectError = (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.off("connect_error", onConnectError);
            resolve({
                success: false,
                message: `Не удалось подключиться к серверу: ${err?.message || err}`
            });
        };
        socket.once("connect_error", onConnectError);

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit(event, ...args, (response) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.off("connect_error", onConnectError);
            resolve(response);
        });
    });
}

// ==========================
// Создать комнату
// ==========================

export function createRoom(playerName, avatar, accountId = null) {
    return emitWithTimeout("create-room", playerName, avatar, accountId);
}

// ==========================
// Войти в комнату
// ==========================

export function joinRoom(roomCode, playerName, avatar, accountId = null) {
    return emitWithTimeout("join-room", roomCode, playerName, avatar, accountId);
}

// ==========================
// Игра началась
// ==========================

export function onGameStarted(callback) {
    socket.on("game-started", callback);
}

// ==========================
// Получать список игроков
// ==========================

export function onPlayersUpdated(callback) {
    socket.on("players-updated", callback);
}

// ==========================
// Покинуть комнату
// ==========================

export function leaveRoom() {
    socket.disconnect();
}
export function setupRoles(roomCode, roles) {

    socket.emit("setup-roles", roomCode, roles);

}

export function setAbilitiesEnabled(roomCode, enabled) {

    socket.emit("set-abilities-enabled", roomCode, enabled);

}

export function onYourRole(callback) {

    socket.on("your-role", callback);


}

export function onLobbyConfiguring(callback) {
    socket.on("lobby-configuring", callback);
}

export function onLoadingGame(callback) {
    socket.on("loading-game", callback);
}

export function beginLobbyConfig(roomCode) {
    socket.emit("lobby-configuring", roomCode);
}

export function startGame(roomCode) {
    socket.emit("start-game", roomCode);
}
