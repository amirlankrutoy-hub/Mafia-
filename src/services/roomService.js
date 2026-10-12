import { socket } from "../socket";

// На слабом мобильном интернете ответ может идти долго — 8 секунд было мало
const ACK_TIMEOUT_MS = 25000;

/** Сообщить серверу о проблеме на стороне игрока — чтобы её было видно в логах */
export function reportClientError(where, message) {
    try {
        socket.emit("client:log", {
            where,
            message: String(message || "").slice(0, 300),
            connected: socket.connected,
            transport: socket.io?.engine?.transport?.name || null,
            online: typeof navigator !== "undefined" ? navigator.onLine : null,
            ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null
        });
    } catch (_) {}
}

function waitForConnect(ms) {
    return new Promise((resolve) => {
        if (socket.connected) return resolve(true);
        const t = setTimeout(() => {
            socket.off("connect", on);
            resolve(false);
        }, ms);
        const on = () => {
            clearTimeout(t);
            resolve(true);
        };
        socket.once("connect", on);
        socket.connect();
    });
}

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

export async function joinRoom(roomCode, playerName, avatar, accountId = null) {
    let res = await emitWithTimeout("join-room", roomCode, playerName, avatar, accountId);
    // Связь оборвалась или сервер долго не отвечал — дожидаемся соединения и пробуем ещё раз
    if (!res?.success && /сервер|подключиться/i.test(res?.message || "")) {
        reportClientError("join-room", res?.message);
        if (await waitForConnect(30000)) {
            res = await emitWithTimeout("join-room", roomCode, playerName, avatar, accountId);
        }
        if (!res?.success) reportClientError("join-room-retry", res?.message);
    }
    return res;
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

export function setDifficulty(roomCode, difficulty) {

    socket.emit("set-difficulty", roomCode, difficulty);

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
