import { socket } from "../socket";

// ==========================
// Создать комнату
// ==========================

export function createRoom(playerName, avatar) {

    return new Promise((resolve) => {

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit(
            "create-room",
            playerName,
            avatar,
            (response) => {

                resolve(response);

            }
        );

    });

}

// ==========================
// Войти в комнату
// ==========================

// ==========================
// Войти в комнату
// ==========================

export function joinRoom(roomCode, playerName, avatar) {

    return new Promise((resolve) => {

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit(
            "join-room",
            roomCode,
            playerName,
            avatar,
            (response) => {

                resolve(response);

            }
        );

    });

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
