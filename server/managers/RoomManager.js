const rooms = require("../data/rooms");
const generateCode = require("../utils/generateCode");

const MAX_PLAYERS = 30;

class RoomManager {
    createRoom(socket, mayorName, avatar = "/avatars/avatar1.svg", accountId = null) {
        let code;
        do {
            code = generateCode();
        } while (rooms[code]);

        rooms[code] = {
            code,
            phase: "lobby",
            day: 0,
            night: 0,
            started: false,
            winner: null,
            gameId: 0,
            mayor: {
                id: socket.id,
                accountId: accountId || null,
                name: mayorName,
                avatar,
                decoration: null,
                connected: true
            },
            players: [],
            selectedRoles: {},
            difficulty: "easy", // "easy" | "hard" — задаётся мэром перед стартом
            abilitiesEnabled: true,
            votes: {},
            nightActions: {},
            blockedVotes: [],
            createdAt: Date.now()
        };

        socket.join(code);
        return rooms[code];
    }

    // Узнаём "того же самого" человека после F5/обрыва связи.
    // Главный признак — accountId: раньше сравнивали только ник, и игрок
    // с таким же ником (например, друг, зашедший по ссылке) "захватывал"
    // чужое место или даже место мэра.
    isSamePerson(slot, player) {
        if (slot.accountId && player.accountId) {
            return slot.accountId === player.accountId;
        }
        // Гостей без аккаунта узнаём по нику, но только если прежний сокет
        // уже отключён — живого игрока с тем же ником вытеснить нельзя.
        return slot.name === player.name && slot.connected === false;
    }

    joinRoom(socket, roomCode, player) {
        const room = rooms[roomCode];
        if (!room) {
            return { success: false, message: "Комната не найдена" };
        }

        // --- Мэр перезашёл (F5 или обрыв сокета) ---
        if (room.mayor && (room.mayor.id === socket.id || this.isSamePerson(room.mayor, player))) {
            const oldId = room.mayor.id;
            room.mayor.id = socket.id;
            room.mayor.avatar = player.avatar || room.mayor.avatar;
            room.mayor.connected = true;
            if (player.accountId) room.mayor.accountId = player.accountId;
            socket.join(roomCode);
            return { success: true, room, reconnected: true, isMayor: true, oldId };
        }

        // --- Игрок уже есть (тот же сокет или переподключение) ---
        const existing =
            room.players.find((p) => p.id === socket.id) ||
            room.players.find((p) => this.isSamePerson(p, player));

        if (existing) {
            const oldId = existing.id;
            existing.id = socket.id;
            existing.name = player.name || existing.name;
            existing.avatar = player.avatar || existing.avatar;
            existing.connected = true;
            if (player.accountId) existing.accountId = player.accountId;
            // ready/role/alive не сбрасываем — это тот же игрок
            socket.join(roomCode);
            return { success: true, room, reconnected: true, oldId };
        }

        if (room.started) {
            return { success: false, message: "Игра уже началась" };
        }
        if (room.players.length >= MAX_PLAYERS) {
            return { success: false, message: "Комната заполнена" };
        }

        // Одинаковые ники в одной комнате путают всех — добавляем номер
        let name = String(player.name || "Игрок").slice(0, 24);
        const taken = new Set([room.mayor.name, ...room.players.map((p) => p.name)]);
        if (taken.has(name)) {
            let i = 2;
            while (taken.has(`${name} ${i}`)) i++;
            name = `${name} ${i}`;
        }

        room.players.push({
            id: socket.id,
            accountId: player.accountId || null,
            name,
            avatar: player.avatar,
            decoration: null,
            role: null,
            alive: true,
            ready: false,
            canVote: true,
            connected: true
        });

        socket.join(roomCode);
        return { success: true, room, reconnected: false };
    }

    deleteRoom(code) {
        const room = rooms[code];
        if (room) this.clearTimers(room);
        delete rooms[code];
    }

    // Помечает сокет отключённым (не удаляет — даём время на реконнект)
    markDisconnected(socketId) {
        for (const code in rooms) {
            const room = rooms[code];
            if (room.mayor && room.mayor.id === socketId) {
                room.mayor.connected = false;
                return { room, isMayor: true };
            }
            const player = room.players.find((p) => p.id === socketId);
            if (player) {
                player.connected = false;
                return { room, player, isMayor: false };
            }
        }
        return null;
    }

    getRoom(code) {
        return rooms[code];
    }

    getAllRooms() {
        return Object.values(rooms);
    }

    // Таймеры комнаты (автопереходы фаз) — отменяются при сбросе/удалении,
    // чтобы старые таймеры не запускали ночь в уже новой игре.
    addTimer(room, fn, ms) {
        if (!room.timers) room.timers = [];
        const gameId = room.gameId;
        const t = setTimeout(() => {
            room.timers = (room.timers || []).filter((x) => x !== t);
            if (rooms[room.code] !== room || room.gameId !== gameId) return;
            try {
                fn();
            } catch (err) {
                console.error(`⚠️ Ошибка таймера комнаты ${room.code}:`, err);
            }
        }, ms);
        room.timers.push(t);
        return t;
    }

    clearTimers(room) {
        (room.timers || []).forEach((t) => clearTimeout(t));
        room.timers = [];
    }

    // Возврат комнаты к лобби после игры ("Играть снова" у мэра).
    // Не трогает id/имя/аватар/decoration игроков — только игровое состояние.
    resetForReplay(code) {
        const room = rooms[code];
        if (!room) return null;

        this.clearTimers(room);
        room.gameId = (room.gameId || 0) + 1;
        room.phase = "lobby";
        room.day = 0;
        room.night = 0;
        room.started = false;
        room.winner = null;
        room.selectedRoles = {};
        room.votes = {};
        room.nightActions = {};
        room.nightResults = [];
        room.blockedVotes = [];
        room.voteCandidates = [];
        room.voteRound = null;
        room.pendingExecution = null;
        room.matchStats = {};
        room.lastPhase = null;
        room.abilityWindow = null;
        room.abilityEffects = null;

        // Отключившиеся за время игры больше не нужны в лобби
        room.players = room.players
            .filter((p) => p.connected !== false)
            .map((p) => ({
                ...p,
                role: null,
                alive: true,
                ready: false,
                readyForGame: false,
                canVote: true,
                linkedTo: null,
                helped: null
            }));

        return room;
    }

    getRoomBySocket(socketId) {
        for (const code in rooms) {
            const room = rooms[code];
            if (room.mayor.id === socketId) return room;
            if (room.players.some((p) => p.id === socketId)) return room;
        }
        return null;
    }
}

module.exports = new RoomManager();
