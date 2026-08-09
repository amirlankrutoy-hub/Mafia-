console.log("🔥 МОЙ SERVER.JS ЗАПУЩЕН");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const RoomManager = require("./managers/RoomManager");
const GameManager = require("./managers/GameManager");
const RoleManager = require("./managers/RoleManager");
const NightManager = require("./managers/NightManager");
const GameFlowManager = require("./managers/GameFlowManager");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://mafia-tau-sand.vercel.app",
            "https://mafia-play-n.vercel.app"   // ← добавь
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.get("/", (req, res) => {
    res.send("Mafia Play Server работает!");
});

// roomCode -> таймер "мэр отключился, ждём реконнекта после F5"
const mayorGraceTimers = {};
const MAYOR_RECONNECT_GRACE_MS = 15000;

io.on("connection", (socket) => {

    console.log("🟢 Игрок подключился:", socket.id);

    // ==========================
    // Создание комнаты
    // ==========================
    socket.on("create-room", (mayorName, avatar, callback) => {
        const room = RoomManager.createRoom(socket, mayorName, avatar);

        const response = {
            success: true,
            roomCode: room.code,
            mayor: room.mayor,
            players: room.players
        };

        if (typeof callback === "function") {
            callback(response);
        } else {
            socket.emit("room-created", response);
        }

        console.log(`👑 Создана комната ${room.code}`);
    });

    // ==========================
    // Вход в комнату
    // ==========================
    socket.on("join-room", (roomCode, playerName, avatar, callback) => {
        const result = RoomManager.joinRoom(socket, roomCode, {
            name: playerName,
            avatar
        });

        if (!result.success) {
            if (typeof callback === "function") callback(result);
            return;
        }

        // Если это мэр вернулся после F5 — отменяем таймер закрытия комнаты
        if (result.room.mayor.id === socket.id && mayorGraceTimers[roomCode]) {
            clearTimeout(mayorGraceTimers[roomCode]);
            delete mayorGraceTimers[roomCode];
            console.log(`👑 Мэр переподключился, комната ${roomCode} остаётся открытой`);
        }

        io.to(roomCode).emit("players-updated", result.room.players);

        if (typeof callback === "function") {
            callback({
                success: true,
                roomCode,
                players: result.room.players,
                mayor: result.room.mayor
            });
        }

        console.log(`👤 ${playerName} вошёл в комнату ${roomCode}`);
    });

    // ==========================
    // Выход из комнаты
    // ==========================
    socket.on("leave-room", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        // игрок выходит
        room.players = room.players.filter((p) => p.id !== socket.id);

        // мэр выходит — комната закрывается
        if (room.mayor?.id === socket.id) {
            io.to(roomCode).emit("room-closed", { reason: "Мэр покинул комнату" });
            RoomManager.deleteRoom(roomCode);
            return;
        }

        socket.leave(roomCode);
        io.to(roomCode).emit("players-updated", room.players);
    });

    // ==========================
    // Кик игрока
    // ==========================
    socket.on("kick-player", (roomCode, playerId) => {
        console.log("🔥 kick-player", roomCode, playerId);

        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.mayor?.id !== socket.id) return;

        room.players = room.players.filter(p => p.id !== playerId);

        const kickedSocket = io.sockets.sockets.get(playerId);
        if (kickedSocket) {
            kickedSocket.leave(roomCode);
            kickedSocket.emit("kicked", { reason: "Вас выгнал мэр" });
        }

        io.to(roomCode).emit("players-updated", room.players);
        console.log("✅ Игрок выгнан");
    });

    // ==========================
    // Настройка ролей
    // ==========================
    socket.on("setup-roles", (roomCode, roles) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        room.selectedRoles = roles;
        room.phase = "LOBBY";
        io.to(roomCode).emit("roles-updated", roles);
        console.log(`🎭 Комната ${roomCode} настроена.`);
    });

    socket.on("lobby-open", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        room.phase = "LOBBY";
        io.to(roomCode).emit("lobby-open");
    });

    // ==========================
    // Украшение
    // ==========================
    socket.on("set-decoration", (roomCode, decorationId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.mayor?.id === socket.id) {
            room.mayor.decoration = decorationId || null;
            io.to(roomCode).emit("mayor-updated", {
                id: room.mayor.id,
                name: room.mayor.name,
                avatar: room.mayor.avatar,
                decoration: room.mayor.decoration || null
            });
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        player.decoration = decorationId || null;

        const payload = room.players.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            ready: !!p.ready,
            decoration: p.decoration || null
        }));

        io.to(roomCode).emit("players-ready", payload);
    });

    // ==========================
    // Эмодзи
    // ==========================
    socket.on("send-emoji", (roomCode, emojiId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;
        if (!room.players.some(p => p.id === socket.id) && room.mayor?.id !== socket.id) return;

        io.to(roomCode).emit("emoji-sent", { playerId: socket.id, emojiId });
    });

    // ==========================
    // Админ валюта
    // ==========================
    socket.on("admin-give-currency", (roomCode, targetId, amount) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        const value = Math.max(0, Math.floor(Number(amount)) || 0);
        if (!value) return;

        io.to(targetId).emit("you-received-currency", {
            amount: value,
            from: "admin"
        });
    });

    // ==========================
    // Игрок готов (лобби)
    // ==========================
    socket.on("player-ready", (roomCode) => {
        console.log(">>> player-ready", socket.id, roomCode);

        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        player.ready = !player.ready;

        const payload = room.players.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            ready: !!p.ready,
            decoration: p.decoration || null
        }));

        io.to(roomCode).emit("players-ready", payload);

        if (room.mayor?.id) {
            io.to(room.mayor.id).emit("players-ready", payload);
        }

        const everyoneReady = room.players.length > 0 && room.players.every(p => p.ready);
        if (everyoneReady && room.mayor?.id) {
            io.to(room.mayor.id).emit("everyone-ready");
        }
    });

    // ==========================
    // Ночные действия (старые обработчики)
    // ==========================

    // Доктор
    socket.on("doctor-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "doctor") {
            socket.emit("night-action-error", { message: "Сейчас не ход Доктора." });
            return;
        }

        const doctor = room.players.find(p => p.id === socket.id && p.role === "doctor" && p.alive !== false);
        if (!doctor) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить это действие." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        const result = NightManager.completeRole(roomCode, "doctor", {
            targetId: target.id,
            targetName: target.name
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось выполнить действие." });
            return;
        }

        socket.emit("doctor-action-complete", {
            targetId: target.id,
            targetName: target.name
        });

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // Мафия
    socket.on("mafia-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "mafia") {
            socket.emit("night-action-error", { message: "Сейчас не ход Мафии." });
            return;
        }

        const mafiaPlayer = room.players.find(p => p.id === socket.id && p.role === "mafia" && p.alive !== false);
        if (!mafiaPlayer) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить действие Мафии." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        if (target.role === "mafia" || target.role === "otez") {
            socket.emit("night-action-error", { message: "Мафия не может выбрать своего союзника." });
            return;
        }

        if (!room.nightActions.mafia) {
            room.nightActions.mafia = {
                targetId: null,
                targetName: null,
                players: []
            };
        }

        const alreadyActed = room.nightActions.mafia.players.some(id => id === socket.id);
        if (alreadyActed) {
            socket.emit("night-action-error", { message: "Вы уже сделали выбор." });
            return;
        }

        room.nightActions.mafia.players.push(socket.id);

        if (!room.nightActions.mafia.targetId) {
            room.nightActions.mafia.targetId = target.id;
            room.nightActions.mafia.targetName = target.name;
            console.log(`🔫 Мафия выбрала общую жертву: ${target.name}`);
        } else if (room.nightActions.mafia.targetId !== target.id) {
            room.nightActions.mafia.players = room.nightActions.mafia.players.filter(id => id !== socket.id);
            socket.emit("night-action-error", { message: "Мафия должна выбрать ту же жертву." });
            return;
        }

        socket.emit("mafia-action-complete", {
            targetId: room.nightActions.mafia.targetId,
            targetName: room.nightActions.mafia.targetName
        });

        const aliveMafia = room.players.filter(p => p.alive !== false && p.role === "mafia");
        const allMafiaActed = room.nightActions.mafia.players.length >= aliveMafia.length;

        if (!allMafiaActed) {
            console.log("⏳ Ждём остальных мафиози...");
            return;
        }

        const result = NightManager.completeRole(roomCode, "mafia", {
            targetId: room.nightActions.mafia.targetId,
            targetName: room.nightActions.mafia.targetName
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход Мафии." });
            return;
        }

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // Крестный отец
    socket.on("godfather-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "otez") {
            socket.emit("night-action-error", { message: "Сейчас не ход Крестного отца." });
            return;
        }

        const godfather = room.players.find(p => p.id === socket.id && p.role === "otez" && p.alive !== false);
        if (!godfather) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить это действие." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        room.nightActions.otez = {
            targetId: target.id,
            targetName: target.name
        };

        socket.emit("godfather-action-complete", {
            targetId: target.id,
            targetName: target.name
        });

        const result = NightManager.completeRole(roomCode, "otez", {
            targetId: target.id,
            targetName: target.name
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход." });
            return;
        }

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // Маньяк
    socket.on("maniac-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "manyak") {
            socket.emit("night-action-error", { message: "Сейчас не ход Маньяка." });
            return;
        }

        const maniac = room.players.find(p => p.id === socket.id && p.role === "manyak" && p.alive !== false);
        if (!maniac) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить действие Маньяка." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        if (target.id === maniac.id) {
            socket.emit("night-action-error", { message: "Маньяк не может выбрать себя." });
            return;
        }

        room.nightActions.manyak = {
            targetId: target.id,
            targetName: target.name
        };

        socket.emit("maniac-action-complete", {
            targetId: target.id,
            targetName: target.name
        });

        const result = NightManager.completeRole(roomCode, "manyak", {
            targetId: target.id,
            targetName: target.name
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход Маньяка." });
            return;
        }

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // Потрошитель
    socket.on("butcher-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "potroshitel") {
            socket.emit("night-action-error", { message: "Сейчас не ход Потрошителя." });
            return;
        }

        const butcher = room.players.find(p => p.id === socket.id && p.role === "potroshitel" && p.alive !== false);
        if (!butcher) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить действие Потрошителя." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        if (target.id === butcher.id) {
            socket.emit("night-action-error", { message: "Потрошитель не может выбрать себя." });
            return;
        }

        if (target.role === "obivatel") {
            socket.emit("night-action-error", { message: "Потрошитель не может убивать обывателей." });
            return;
        }

        room.nightActions.potroshitel = {
            targetId: target.id,
            targetName: target.name
        };

        socket.emit("butcher-action-complete", {
            targetId: target.id,
            targetName: target.name
        });

        const result = NightManager.completeRole(roomCode, "potroshitel", {
            targetId: target.id,
            targetName: target.name
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход Потрошителя." });
            return;
        }

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // Шериф
    socket.on("sherif-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "sherif") {
            socket.emit("night-action-error", { message: "Сейчас не ход Шерифа." });
            return;
        }

        const sherif = room.players.find(p => p.id === socket.id && p.role === "sherif" && p.alive !== false);
        if (!sherif) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить действие Шерифа." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        if (target.id === sherif.id) {
            socket.emit("night-action-error", { message: "Шериф не может выбрать себя." });
            return;
        }

        room.nightActions.sherif = {
            targetId: target.id,
            targetName: target.name
        };

        socket.emit("sherif-action-complete", {
            targetId: target.id,
            targetName: target.name
        });

        const result = NightManager.completeRole(roomCode, "sherif", {
            targetId: target.id,
            targetName: target.name
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход Шерифа." });
            return;
        }

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // Священник
    socket.on("priest-action", (roomCode, action, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "sveshennik") {
            socket.emit("night-action-error", { message: "Сейчас не ход Священника." });
            return;
        }

        const priest = room.players.find(p => p.id === socket.id && p.role === "sveshennik" && p.alive !== false);
        if (!priest) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить действие Священника." });
            return;
        }

        if (action !== "check" && action !== "kill") {
            socket.emit("night-action-error", { message: "Неизвестное действие Священника." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        if (target.id === priest.id) {
            socket.emit("night-action-error", { message: "Нельзя выбрать себя." });
            return;
        }

        if (action === "check") {
            socket.emit("priest-check-result", {
                targetId: target.id,
                targetName: target.name,
                role: target.role
            });

            const result = NightManager.completeRole(roomCode, "sveshennik", {
                type: "check",
                targetId: target.id,
                targetName: target.name,
                role: target.role
            });

            if (!result.success) return;

            if (!result.finished) {
                io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
                return;
            }

            io.to(roomCode).emit("night-finished", { night: room.night });
            return;
        }

        if (action === "kill") {
            room.nightActions.sveshennik = {
                targetId: target.id,
                targetName: target.name
            };

            socket.emit("priest-kill-complete", {
                targetId: target.id,
                targetName: target.name
            });

            const result = NightManager.completeRole(roomCode, "sveshennik", {
                type: "kill",
                targetId: target.id,
                targetName: target.name
            });

            if (!result.success) {
                socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход." });
                return;
            }

            if (!result.finished) {
                io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
                return;
            }

            io.to(roomCode).emit("night-finished", { night: room.night });
        }
    });

    // Красотка
    socket.on("krasotka-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "krasotka") {
            socket.emit("night-action-error", { message: "Сейчас не ход Красотки." });
            return;
        }

        const krasotka = room.players.find(p => p.id === socket.id && p.role === "krasotka" && p.alive !== false);
        if (!krasotka) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить действие Красотки." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        if (target.id === krasotka.id) {
            socket.emit("night-action-error", { message: "Красотка не может выбрать себя." });
            return;
        }

        room.nightActions.krasotka = {
            targetId: target.id,
            targetName: target.name
        };

        socket.emit("krasotka-action-complete", {
            targetId: target.id,
            targetName: target.name
        });

        const result = NightManager.completeRole(roomCode, "krasotka", {
            targetId: target.id,
            targetName: target.name
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход Красотки." });
            return;
        }

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // Поклонница
    socket.on("poklonnitsa-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "poklon") {
            socket.emit("night-action-error", { message: "Сейчас не ход Поклонницы." });
            return;
        }

        const poklonnitsa = room.players.find(p => p.id === socket.id && p.role === "poklon" && p.alive !== false);
        if (!poklonnitsa) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить действие Поклонницы." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        if (target.id === poklonnitsa.id) {
            socket.emit("night-action-error", { message: "Поклонница не может выбрать себя." });
            return;
        }

        room.nightActions.poklon = {
            targetId: target.id,
            targetName: target.name,
            targetRole: target.role
        };

        poklonnitsa.followTargetId = target.id;

        socket.emit("poklonnitsa-result", {
            targetId: target.id,
            targetName: target.name,
            targetRole: target.role
        });

        const result = NightManager.completeRole(roomCode, "poklon", {
            targetId: target.id,
            targetName: target.name,
            targetRole: target.role
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход Поклонницы." });
            return;
        }

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // Стукач
    socket.on("stykach-action", (roomCode, targetId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.currentNightRole !== "stykach") {
            socket.emit("night-action-error", { message: "Сейчас не ход Стукача." });
            return;
        }

        const stykach = room.players.find(p => p.id === socket.id && p.role === "stykach" && p.alive !== false);
        if (!stykach) {
            socket.emit("night-action-error", { message: "Вы не можете выполнить действие Стукача." });
            return;
        }

        const target = room.players.find(p => p.id === targetId && p.alive !== false);
        if (!target) {
            socket.emit("night-action-error", { message: "Игрок не найден или уже мёртв." });
            return;
        }

        if (target.id === stykach.id) {
            socket.emit("night-action-error", { message: "Стукач не может выбрать себя." });
            return;
        }

        room.nightActions.stykach = {
            targetId: target.id,
            targetName: target.name,
            targetRole: target.role
        };

        socket.emit("stykach-result", {
            targetId: target.id,
            targetName: target.name,
            targetRole: target.role
        });

        const result = NightManager.completeRole(roomCode, "stykach", {
            targetId: target.id,
            targetName: target.name,
            targetRole: target.role
        });

        if (!result.success) {
            socket.emit("night-action-error", { message: result.message || "Не удалось завершить ход Стукача." });
            return;
        }

        if (!result.finished) {
            io.to(roomCode).emit("night-role", { role: result.role, night: room.night });
            return;
        }

        io.to(roomCode).emit("night-finished", { night: room.night });
    });

    // ==========================
    // Отключение
    // ==========================
    socket.on("disconnect", () => {
        const room = RoomManager.getRoomBySocket(socket.id);

        if (!room) {
            console.log("🔴 Игрок отключился:", socket.id);
            return;
        }

        const wasMayor = room.mayor?.id === socket.id;
        const roomCode = room.code;

        RoomManager.removePlayer(socket);

        if (wasMayor) {
            // Не закрываем комнату сразу — это может быть обычный F5.
            // Даём мэру немного времени переподключиться под тем же именем.
            console.log(`👑 Мэр отключился от комнаты ${roomCode}, жду реконнект ${MAYOR_RECONNECT_GRACE_MS}мс...`);

            if (mayorGraceTimers[roomCode]) {
                clearTimeout(mayorGraceTimers[roomCode]);
            }

            mayorGraceTimers[roomCode] = setTimeout(() => {
                const stillRoom = RoomManager.getRoom(roomCode);
                if (stillRoom && stillRoom.mayor && !stillRoom.mayor.connected) {
                    io.to(roomCode).emit("room-closed", {
                        message: "Мэр покинул игру. Комната закрыта."
                    });
                    RoomManager.deleteRoom(roomCode);
                    console.log(`👑 Мэр не вернулся, комната ${roomCode} закрыта.`);
                }
                delete mayorGraceTimers[roomCode];
            }, MAYOR_RECONNECT_GRACE_MS);
        } else {
            const updatedRoom = RoomManager.getRoom(roomCode);
            if (updatedRoom) {
                io.to(roomCode).emit("players-updated", updatedRoom.players);
            }
            console.log(`👤 Игрок покинул комнату ${roomCode}`);
        }

        console.log("🔴 Отключился:", socket.id);
    });

    // ========== ИГРА (GameFlowManager) ==========

    function publicPlayers(room) {
        return room.players.map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            alive: p.alive !== false,
            role: p.role,
            readyForGame: !!p.readyForGame
        }));
    }

    function emitPhase(roomCode, data) {
        io.to(roomCode).emit("game-phase", data);
    }

    function broadcastNight(roomCode, night) {
        if (!night) return;

        if (night.phase === "night_end") {
            emitPhase(roomCode, {
                phase: "night_end",
                results: night.resultsPreview || []
            });
            return;
        }

        emitPhase(roomCode, {
            phase: "night",
            phrase: night.phrase,
            nightInfo: {
                step: night.step,
                actors: night.actors,
                targets: night.targets,
                phrase: night.phrase
            }
        });
    }

    socket.on("start-game", (roomCode) => {
        const room = GameFlowManager.startGame(roomCode);
        if (!room) return;

        const assignments = {};
        room.players.forEach((p) => {
            assignments[p.id] = p.role;
            io.to(p.id).emit("your-role", p.role);
        });

        if (room.mayor?.id) {
            io.to(room.mayor.id).emit("all-roles", assignments);
        }

        emitPhase(roomCode, {
            phase: "waiting_ready",
            players: publicPlayers(room),
            readyCount: 0
        });

        console.log(`🎮 Игра стартовала в ${roomCode}`);
    });

    socket.on("game-player-ready", (roomCode) => {
        const result = GameFlowManager.setPlayerGameReady(roomCode, socket.id);
        if (!result.success) return;

        const readyCount = (result.players || []).filter(
            (p) => p.alive !== false && p.readyForGame
        ).length;

        io.to(roomCode).emit("players-updated", result.players);
        emitPhase(roomCode, {
            phase: "waiting_ready",
            players: publicPlayers(RoomManager.getRoom(roomCode)),
            readyCount
        });

        if (!result.allReady) return;

        const night = GameFlowManager.beginNight(roomCode);
        broadcastNight(roomCode, night);
    });

    socket.on("night-action", (roomCode, payload) => {
        const result = GameFlowManager.submitNightAction(roomCode, socket.id, payload || {});
        if (!result.success) return;

        if (result.waiting) {
            socket.emit("game-phase", {
                phase: "night_wait",
                phrase: "Ждём остальных..."
            });
            return;
        }

        if (result.next) broadcastNight(roomCode, result.next);
    });

    socket.on("night-next", (roomCode) => {
        const next = GameFlowManager.advanceNightStep(roomCode);
        broadcastNight(roomCode, next);
    });

    socket.on("begin-night", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;

        const night = GameFlowManager.beginNight(roomCode);
        broadcastNight(roomCode, night);
    });

    socket.on("mayor-morning", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;

        const results = GameFlowManager.resolveNight(roomCode, true);

        results
            .filter((r) => r.privateTo)
            .forEach((r) => {
                io.to(r.privateTo).emit("private-info", {
                    text: r.type === "check" || r.type === "link"
                        ? `${r.name}: роль ${r.role}`
                        : r.text
                });
            });

        results
            .filter((r) => r.type === "death")
            .forEach((r) => {
                io.to(r.playerId).emit("you-died", {
                    reason: r.text || "Вас убили этой ночью.",
                    killedBy: r.killedBy || "night"
                });
            });

        emitPhase(roomCode, {
            phase: "morning",
            results: results.filter(
                (r) => !r.privateTo || r.type === "death" || r.type === "saved" || r.type === "block"
            ),
            players: publicPlayers(room)
        });

        const win = GameFlowManager.checkWin(roomCode);
        if (win) {
            emitPhase(roomCode, { phase: "ended", winner: win });
        }
    });

    socket.on("begin-voting", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;

        emitPhase(roomCode, {
            phase: "loading",
            loadingText: "Начинается голосование"
        });

        setTimeout(() => {
            const vote = GameFlowManager.beginVoting(roomCode);
            emitPhase(roomCode, { phase: "voting", vote });
        }, 3000);
    });

    socket.on("cast-vote", (roomCode, targetId) => {
        GameFlowManager.castVote(roomCode, socket.id, targetId);
    });

    socket.on("finish-voting", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        const voteResult = GameFlowManager.finishVoting(roomCode);
        if (!voteResult) return;

        if (voteResult.type === "pending") {
            emitPhase(roomCode, {
                phase: "vote_pending",
                candidate: voteResult.candidate,
                voteResult
            });
            return;
        }

        if (voteResult.type === "runoff") {
            const snap = GameFlowManager.votingSnapshot(room);
            emitPhase(roomCode, {
                phase: "voting",
                vote: snap,
                voteResult
            });
            return;
        }

        emitPhase(roomCode, {
            phase: "vote_result",
            voteResult
        });

        setTimeout(() => {
            const win = GameFlowManager.checkWin(roomCode);
            if (win) {
                emitPhase(roomCode, { phase: "ended", winner: win });
                return;
            }

            emitPhase(roomCode, {
                phase: "loading",
                loadingText: "Приближается ночь"
            });

            setTimeout(() => {
                const night = GameFlowManager.beginNight(roomCode);
                broadcastNight(roomCode, night);
            }, 3000);
        }, 4000);
    });

    socket.on("mayor-execute", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;

        const executed = GameFlowManager.executePending(roomCode);
        if (!executed) return;

        io.to(executed.id).emit("you-died", {
            reason: "Город приговорил вас к казни.",
            killedBy: "execution"
        });

        emitPhase(roomCode, {
            phase: "vote_result",
            voteResult: { type: "executed", executed },
            players: publicPlayers(room)
        });

        setTimeout(() => {
            const win = GameFlowManager.checkWin(roomCode);
            if (win) {
                emitPhase(roomCode, { phase: "ended", winner: win });
                return;
            }

            emitPhase(roomCode, {
                phase: "loading",
                loadingText: "Приближается ночь"
            });

            setTimeout(() => {
                const night = GameFlowManager.beginNight(roomCode);
                broadcastNight(roomCode, night);
            }, 3000);
        }, 4000);
    });

    socket.on("mayor-kill", (roomCode, targetId, reason) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;
        if (!reason) return;

        const killed = GameFlowManager.mayorKill(roomCode, targetId, reason);

        if (killed?.id) {
            io.to(killed.id).emit("you-died", {
                reason: reason || "Решением мэра вы устранены из игры."
            });
        }

        emitPhase(roomCode, {
            phase: room.phase,
            players: publicPlayers(room)
        });
    });

    socket.on("mayor-force-win", (roomCode, side, reason) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;

        GameFlowManager.mayorForceWin(roomCode, side, reason);
        emitPhase(roomCode, {
            phase: "ended",
            winner: { side, label: side, reason }
        });
    });

    // "Играть снова" — только мэр. Возвращает ВСЕХ (мэра, живых и уже
    // погибших/вышедших в лобби игроков) к чистому лобби этой же комнаты.
    socket.on("play-again", (roomCode, ack) => {
        console.log(`[play-again] запрос от ${socket.id}, комната ${roomCode}`);

        const room = RoomManager.getRoom(roomCode);
        if (!room) {
            console.log(`[play-again] комната ${roomCode} не найдена`);
            if (typeof ack === "function") {
                ack({ success: false, message: "Комната не найдена" });
            }
            return;
        }

        if (room.mayor?.id !== socket.id) {
            console.log(
                `[play-again] отклонено: сервер знает мэра как ${room.mayor?.id}, а запрос пришёл от ${socket.id}`
            );
            if (typeof ack === "function") {
                ack({
                    success: false,
                    message: "Сервер не распознал вас как мэра этой комнаты"
                });
            }
            return;
        }

        const fresh = RoomManager.resetForReplay(roomCode);
        if (!fresh) {
            if (typeof ack === "function") {
                ack({ success: false, message: "Не удалось сбросить комнату" });
            }
            return;
        }

        const payload = fresh.players.map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            ready: false,
            decoration: p.decoration || null
        }));

        io.to(roomCode).emit("game-reset", { players: payload });
        console.log(`[play-again] комната ${roomCode} сброшена, разослано ${payload.length} игрокам`);

        if (typeof ack === "function") {
            ack({ success: true });
        }
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});