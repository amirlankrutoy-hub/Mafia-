const rooms = require("../data/rooms");
const generateCode = require("../utils/generateCode");

class RoomManager {

    createRoom(socket, mayorName, avatar = "Мэр") {

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

            mayor: {

                id: socket.id,

                name: mayorName,
                avatar,

                connected: true

            },

            players: [],

            selectedRoles: {},

            votes: {},

            actions: {},

            logs: []

        };

        socket.join(code);

        return rooms[code];
    }

    joinRoom(socket, roomCode, player) {
        const room = rooms[roomCode];

        if (!room) {
            return { success: false, message: "Комната не найдена" };
        }

        if (room.started) {
            return { success: false, message: "Игра уже началась" };
        }

        // --- Мэр перезашёл после F5 ---
        if (room.mayor && room.mayor.name === player.name) {
            room.mayor.id = socket.id;
            room.mayor.avatar = player.avatar || room.mayor.avatar;
            room.mayor.connected = true;
            socket.join(roomCode);
            return { success: true, room };
        }

        // --- Игрок уже есть по socket.id ---
        let existing = room.players.find(p => p.id === socket.id);

        // --- Реконнект после F5: тот же ник ---
        if (!existing) {
            existing = room.players.find(p => p.name === player.name);
        }

        if (existing) {
            existing.id = socket.id;
            existing.name = player.name || existing.name;
            existing.avatar = player.avatar || existing.avatar;
            existing.connected = true;
            // ready не сбрасываем
            socket.join(roomCode);
            return { success: true, room };
        }

        // --- Новый игрок ---
        room.players.push({
            id: socket.id,
            name: player.name,
            avatar: player.avatar,
            role: null,
            alive: true,
            ready: false,
            canVote: true,
            connected: true
        });

        socket.join(roomCode);
        return { success: true, room };
    }
    deleteRoom(code) {
        delete rooms[code];
    }
    removePlayer(socket) {
        for (const code in rooms) {
            const room = rooms[code];

            // Мэр просто «отключился» — комнату НЕ удаляем
            if (room.mayor && room.mayor.id === socket.id) {
                room.mayor.connected = false;
                return;
            }

            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.connected = false; // не удаляем из массива
                return;
            }
        }
    }
    getRoom(code) {

        return rooms[code];

    }

    getRoomBySocket(socketId) {

        for (const code in rooms) {

            const room = rooms[code];

            if (room.mayor.id === socketId) {

                return room;

            }

            const player = room.players.find(

                p => p.id === socketId

            );

            if (player) {

                return room;

            }

        }

        return null;

    }

    updateAvatar(socketId, avatar) {

        const room = this.getRoomBySocket(socketId);

        if (!room) return;

        // если это мэр
        if (room.mayor.id === socketId) {
            room.mayor.avatar = avatar;
            return;
        }

        // если это игрок
        const player = room.players.find(
            p => p.id === socketId
        );

        if (!player) return;

        player.avatar = avatar;

    }

    setReady(socketId) {

        const room = this.getRoomBySocket(socketId);

        if (!room) return false;

        const player = room.players.find(

            p => p.id === socketId

        );

        if (!player) return false;
        player.ready = !player.ready;



        return room.players.every(

            p => p.ready

        );

    }

}

module.exports = new RoomManager();