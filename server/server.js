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
            "https://mafia-play-n.vercel.app"
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

// ==========================
// Presence (для друзей): accountId -> { socketId, name, roomCode, isMayor }
// ==========================
const presence = {};

function broadcastPresence(accountId) {
    const p = presence[accountId];
    io.emit("presence:changed", {
        accountId,
        online: !!p,
        name: p?.name || null,
        roomCode: p?.roomCode || null,
        isMayor: !!p?.isMayor
    });
}

function presenceStatus(accountId) {
    const p = presence[accountId];
    const prof = accountProfiles[accountId] || {};
    if (!p) {
        return {
            id: accountId,
            online: false,
            name: prof.name || null,
            icon: prof.icon || null,
            favoriteRole: prof.favoriteRole || null,
            wins: typeof prof.wins === "number" ? prof.wins : 0
        };
    }
    return {
        id: accountId,
        online: true,
        name: p.name,
        roomCode: p.roomCode || null,
        isMayor: !!p.isMayor,
        icon: prof.icon || null,
        favoriteRole: prof.favoriteRole || null,
        wins: typeof prof.wins === "number" ? prof.wins : 0
    };
}

// ==========================
// Публичные профили: иконка, любимая роль, победы — видно другим игрокам.
// Хранится в памяти сервера (сбрасывается при перезапуске — без БД иначе никак).
// ==========================
const accountProfiles = {}; // accountId -> { name, icon, favoriteRole, wins }

function publicProfile(accountId) {
    const prof = accountProfiles[accountId] || {};
    const online = presence[accountId];
    return {
        id: accountId,
        name: (online && online.name) || prof.name || null,
        icon: prof.icon || null,
        favoriteRole: prof.favoriteRole || null,
        wins: typeof prof.wins === "number" ? prof.wins : 0
    };
}

// ==========================
// Заявки в друзья: хранятся на сервере (в памяти), пока не приняты/отклонены.
// Если получатель сейчас онлайн — уведомление придёт мгновенно;
// в любом случае заявка видна во вкладке "Заявки" при следующем заходе.
// ==========================
const friendRequests = {}; // toAccountId -> [{ fromAccountId, fromName, fromIcon, createdAt }]

// ==========================
// Способности (покупаются за тени, используются в игре)
// ==========================
const ABILITY_WINDOW_MS = 10000;
const ABILITY_DEFS = {
    voice_change: { type: "day" },
    extra_vote: { type: "day" },
    vote_immunity: { type: "day" },
    reveal_faction: { type: "day", needsTarget: true },
    night_immortality: { type: "night" },
    reveal_role: { type: "night", needsTarget: true }
};
const ROLE_META = {
    doctor: { name: "Доктор", category: "civilians" },
    krasotka: { name: "Красотка", category: "civilians" },
    mafia: { name: "Мафиози", category: "mafia" },
    manyak: { name: "Маньяк", category: "neutrals" },
    obivatel: { name: "Обыватель", category: "civilians" },
    otez: { name: "Крёстный отец", category: "mafia" },
    poklon: { name: "Поклонница", category: "neutrals" },
    potroshitel: { name: "Потрошитель", category: "neutrals" },
    sherif: { name: "Шериф", category: "civilians" },
    stukach: { name: "Стукач", category: "neutrals" },
    sveshennik: { name: "Священник", category: "civilians" },
    vor: { name: "Вор", category: "mafia" }
};
const FACTION_LABELS = {
    civilians: "Мирные жители",
    mafia: "Мафия",
    neutrals: "Нейтралы"
};

// Сложный режим: вместо роли погибшего показываем, "от чьей руки" он погиб.
const KILLER_LABELS = {
    mafia: "мафии",
    manyak: "маньяка",
    potroshitel: "потрошителя",
    sherif: "шерифа",
    sveshennik: "священника",
    krasotka_redirect: "неизвестного"
};

function openAbilityWindow(room, phase) {
    room.abilityWindow = { phase, expiresAt: Date.now() + ABILITY_WINDOW_MS };
    room.abilityEffects = {
        extraVoteWeight: {},
        voteImmune: [],
        nightImmune: [],
        hiddenNames: []
    };
}

io.on("connection", (socket) => {

    console.log("🟢 Игрок подключился:", socket.id);

    // ==========================
    // Presence: регистрация онлайн-статуса (для системы друзей)
    // ==========================
    socket.on("presence:hello", (accountId, name) => {
        if (!accountId) return;
        socket.data.accountId = accountId;
        presence[accountId] = {
            socketId: socket.id,
            name: name || presence[accountId]?.name || "Игрок",
            roomCode: presence[accountId]?.roomCode || null,
            isMayor: presence[accountId]?.isMayor || false
        };
        if (name) {
            accountProfiles[accountId] = { ...accountProfiles[accountId], name };
        }
        broadcastPresence(accountId);
    });

    // Поиск игрока по ID (для вкладки "Друзья")
    socket.on("presence:search", (id, callback) => {
        if (typeof callback !== "function") return;
        callback(presenceStatus(String(id || "").trim()));
    });

    // Массовый статус (для списка друзей / недавних игроков)
    socket.on("presence:bulk", (ids, callback) => {
        if (typeof callback !== "function") return;
        const list = (Array.isArray(ids) ? ids : []).map((id) => presenceStatus(id));
        callback(list);
    });

    // ==========================
    // Друзья: постучаться в комнату мэра
    // ==========================
    socket.on("friend:knock", ({ toAccountId, roomCode, fromAccountId, fromName }, callback) => {
        const cb = typeof callback === "function" ? callback : () => {};
        const room = RoomManager.getRoom(roomCode);

        if (!room || !room.mayor?.id) {
            cb({ success: false, message: "Комната не найдена" });
            return;
        }

        io.to(room.mayor.id).emit("friend:incoming-request", {
            requesterSocketId: socket.id,
            requesterAccountId: fromAccountId,
            requesterName: fromName,
            roomCode
        });

        cb({ success: true });
    });

    // Мэр принял/отклонил заявку друга
    socket.on("friend:mayor-response", ({ roomCode, requesterSocketId, accepted }) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;

        io.to(requesterSocketId).emit("friend:join-decision", {
            accepted: !!accepted,
            roomCode
        });
    });

    // ==========================
    // Публичный профиль (иконка/любимая роль/победы)
    // ==========================
    socket.on("profile:update", ({ accountId, icon, favoriteRole, wins, name }) => {
        if (!accountId) return;
        accountProfiles[accountId] = {
            ...accountProfiles[accountId],
            ...(icon !== undefined ? { icon } : {}),
            ...(favoriteRole !== undefined ? { favoriteRole } : {}),
            ...(typeof wins === "number" ? { wins } : {}),
            ...(name ? { name } : {})
        };
        io.emit("profile:changed", publicProfile(accountId));
    });

    socket.on("profile:get", (accountId, callback) => {
        if (typeof callback !== "function") return;
        callback(publicProfile(accountId));
    });

    // ==========================
    // Заявки в друзья
    // ==========================

    // Отправить заявку
    socket.on("friend:request-send", ({ toAccountId, fromAccountId, fromName, fromIcon }, callback) => {
        const cb = typeof callback === "function" ? callback : () => {};
        if (!toAccountId || !fromAccountId || toAccountId === fromAccountId) {
            return cb({ success: false, message: "Некорректный запрос" });
        }

        if (!friendRequests[toAccountId]) friendRequests[toAccountId] = [];
        const already = friendRequests[toAccountId].some((r) => r.fromAccountId === fromAccountId);
        if (!already) {
            friendRequests[toAccountId].push({
                fromAccountId,
                fromName: fromName || "Игрок",
                fromIcon: fromIcon || null,
                createdAt: Date.now()
            });
        }

        const targetSocketId = presence[toAccountId]?.socketId;
        if (targetSocketId) {
            io.to(targetSocketId).emit("friend:request-received", {
                fromAccountId,
                fromName: fromName || "Игрок",
                fromIcon: fromIcon || null
            });
        }

        cb({ success: true });
    });

    // Отменить свою отправленную заявку (повторное нажатие "Дружить")
    socket.on("friend:request-cancel", ({ toAccountId, fromAccountId }) => {
        if (!toAccountId || !friendRequests[toAccountId]) return;
        friendRequests[toAccountId] = friendRequests[toAccountId].filter(
            (r) => r.fromAccountId !== fromAccountId
        );
    });

    // Получить свои входящие заявки (вкладка "Заявки")
    socket.on("friend:get-requests", (accountId, callback) => {
        if (typeof callback !== "function") return;
        callback(friendRequests[accountId] || []);
    });

    // Принять/отклонить заявку
    socket.on("friend:request-respond", ({ toAccountId, fromAccountId, accepted }, callback) => {
        const cb = typeof callback === "function" ? callback : () => {};

        if (friendRequests[toAccountId]) {
            friendRequests[toAccountId] = friendRequests[toAccountId].filter(
                (r) => r.fromAccountId !== fromAccountId
            );
        }

        if (accepted) {
            const requesterSocketId = presence[fromAccountId]?.socketId;
            if (requesterSocketId) {
                io.to(requesterSocketId).emit("friend:request-accepted", {
                    byAccountId: toAccountId,
                    byName:
                        presence[toAccountId]?.name ||
                        accountProfiles[toAccountId]?.name ||
                        "Игрок"
                });
            }
        }

        cb({ success: true });
    });

    // ==========================
    // Активация купленной способности (10 сек окно в начале дня/ночи)
    // ==========================
    socket.on("ability:activate", ({ roomCode, abilityId, targetId }, callback) => {
        const cb = typeof callback === "function" ? callback : () => {};
        const room = RoomManager.getRoom(roomCode);
        if (!room) return cb({ success: false, message: "Комната не найдена" });

        if (room.abilitiesEnabled === false) {
            return cb({ success: false, message: "Мэр запретил способности в этой игре" });
        }

        const def = ABILITY_DEFS[abilityId];
        if (!def) return cb({ success: false, message: "Неизвестная способность" });

        if (!room.abilityWindow || Date.now() > room.abilityWindow.expiresAt) {
            return cb({ success: false, message: "Окно активации закрыто" });
        }
        if (room.abilityWindow.phase !== def.type) {
            return cb({ success: false, message: "Сейчас нельзя использовать эту способность" });
        }

        const me = room.players.find((p) => p.id === socket.id && p.alive !== false);
        if (!me) return cb({ success: false, message: "Недоступно" });

        if (def.needsTarget && !targetId) {
            return cb({ success: false, message: "Нужна цель" });
        }

        room.abilityEffects = room.abilityEffects || {
            extraVoteWeight: {},
            voteImmune: [],
            nightImmune: [],
            hiddenNames: []
        };

        let info = null;

        switch (abilityId) {
            case "voice_change":
                room.abilityEffects.hiddenNames.push(socket.id);
                break;

            case "extra_vote":
                room.abilityEffects.extraVoteWeight[socket.id] =
                    (room.abilityEffects.extraVoteWeight[socket.id] || 1) + 1;
                break;

            case "vote_immunity":
                room.abilityEffects.voteImmune.push(socket.id);
                break;

            case "reveal_faction": {
                const target = room.players.find((p) => p.id === targetId && p.alive !== false);
                if (!target) return cb({ success: false, message: "Цель не найдена" });
                const meta = ROLE_META[target.role];
                info = `${target.name}: фракция «${FACTION_LABELS[meta?.category] || "неизвестно"}»`;
                break;
            }

            case "night_immortality":
                room.abilityEffects.nightImmune.push(socket.id);
                break;

            case "reveal_role": {
                const target = room.players.find((p) => p.id === targetId && p.alive !== false);
                if (!target) return cb({ success: false, message: "Цель не найдена" });
                const meta = ROLE_META[target.role];
                info = `${target.name}: роль «${meta?.name || target.role}»`;
                break;
            }

            default:
                return cb({ success: false, message: "Неизвестная способность" });
        }

        cb({ success: true, info });
    });

    // ==========================
    // Создание комнаты
    // ==========================
    socket.on("create-room", (mayorName, avatar, accountId, callback) => {
        // поддержка старой сигнатуры (mayorName, avatar, callback)
        if (typeof accountId === "function") {
            callback = accountId;
            accountId = null;
        }

        const room = RoomManager.createRoom(socket, mayorName, avatar);
        if (accountId) {
            room.mayor.accountId = accountId;
            if (presence[accountId]) {
                presence[accountId].roomCode = room.code;
                presence[accountId].isMayor = true;
                broadcastPresence(accountId);
            }
        }

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
    socket.on("join-room", (roomCode, playerName, avatar, accountId, callback) => {
        // поддержка старой сигнатуры (roomCode, playerName, avatar, callback)
        if (typeof accountId === "function") {
            callback = accountId;
            accountId = null;
        }

        const result = RoomManager.joinRoom(socket, roomCode, {
            name: playerName,
            avatar
        });

        if (!result.success) {
            if (typeof callback === "function") callback(result);
            return;
        }

        const amMayor = result.room.mayor.id === socket.id;

        if (accountId) {
            if (amMayor) {
                result.room.mayor.accountId = accountId;
            } else {
                const me = result.room.players.find((p) => p.id === socket.id);
                if (me) me.accountId = accountId;
            }
            if (presence[accountId]) {
                presence[accountId].roomCode = roomCode;
                presence[accountId].isMayor = amMayor;
                broadcastPresence(accountId);
            }
        }

        // Если это мэр вернулся после F5 — отменяем таймер закрытия комнаты
        if (amMayor && mayorGraceTimers[roomCode]) {
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

    // Мэр может запретить способности в этой игре — вызывается перед стартом
    socket.on("set-abilities-enabled", (roomCode, enabled) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;
        room.abilitiesEnabled = !!enabled;
        console.log(`🧩 Способности в ${roomCode}: ${room.abilitiesEnabled ? "разрешены" : "запрещены"}`);
    });

    // Сложность игры: "easy" — как обычно (мэр не знает роли, роли погибших видны);
    // "hard" — роли погибших никогда не раскрываются, только имя/причина смерти.
    socket.on("set-difficulty", (roomCode, difficulty) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.mayor?.id !== socket.id) return;
        room.difficulty = difficulty === "hard" ? "hard" : "easy";
        console.log(`🎚️ Сложность в ${roomCode}: ${room.difficulty}`);
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

        if (target.role === "mafia" || target.role === "otez" || target.role === "vor") {
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
        const myAccountId = socket.data.accountId;
        if (myAccountId && presence[myAccountId]?.socketId === socket.id) {
            delete presence[myAccountId];
            broadcastPresence(myAccountId);
        }

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
        // Лёгкий режим: роль погибшего игрока раскрывается всем (как в обычной мафии).
        // Сложный режим: роль не раскрывается никогда, даже после смерти.
        const isEasy = room.difficulty !== "hard";
        return room.players.map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            alive: p.alive !== false,
            role: !p.alive && isEasy ? p.role : undefined,
            // Мэр никогда не знает роли живых игроков — независимо от сложности.
            readyForGame: !!p.readyForGame
        }));
    }

    function emitPhase(roomCode, data) {
        io.to(roomCode).emit("game-phase", data);
    }

    // Единая точка завершения игры: считает "Игрока матча" и рассылает результат.
    function endGame(roomCode, win) {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;
        room.phase = "ended";
        room.winner = win;
        const mvp = GameFlowManager.getMVP(roomCode, win);
        emitPhase(roomCode, { phase: "ended", winner: win, mvp, players: publicPlayers(room) });
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

        room.players.forEach((p) => {
            io.to(p.id).emit("your-role", p.role);
        });

        // Роли намеренно не отправляются мэру — он не должен знать,
        // кто есть кто, как и остальные игроки.

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
        if (room.abilitiesEnabled !== false) {
            openAbilityWindow(room, "night");
            io.to(roomCode).emit("ability-window", room.abilityWindow);
        }
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

        const isEasy = room.difficulty !== "hard";
        const formattedResults = results
            .filter(
                (r) => !r.privateTo || r.type === "death" || r.type === "saved" || r.type === "block"
            )
            .map((r) => {
                if (r.type !== "death") return r;
                if (isEasy) {
                    const roleName = ROLE_META[r.role]?.name || r.role;
                    return { ...r, text: `${r.name} погиб этой ночью. Роль: ${roleName}` };
                }
                const killerLabel = KILLER_LABELS[r.killedBy] || "неизвестного";
                return {
                    ...r,
                    role: undefined,
                    text: `${r.name} погиб этой ночью от руки ${killerLabel}.`
                };
            });

        emitPhase(roomCode, {
            phase: "morning",
            results: formattedResults,
            players: publicPlayers(room)
        });

        const win = GameFlowManager.checkWin(roomCode);
        if (win) {
            endGame(roomCode, win);
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
            if (room.abilitiesEnabled !== false) {
                openAbilityWindow(room, "day");
                io.to(roomCode).emit("ability-window", room.abilityWindow);
            }
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
                endGame(roomCode, win);
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

        const isEasy = room.difficulty !== "hard";
        const roleName = ROLE_META[executed.role]?.name || executed.role;
        const executedText = isEasy
            ? `${executed.name} казнён! Роль: ${roleName}`
            : `Игрок ${executed.name} казнён!`;

        io.to(executed.id).emit("you-died", {
            reason: "Город приговорил вас к казни.",
            killedBy: "execution"
        });

        emitPhase(roomCode, {
            phase: "vote_result",
            voteResult: {
                type: "executed",
                executed: {
                    id: executed.id,
                    name: executed.name,
                    role: isEasy ? executed.role : undefined,
                    text: executedText
                }
            },
            players: publicPlayers(room)
        });

        setTimeout(() => {
            const win = GameFlowManager.checkWin(roomCode);
            if (win) {
                endGame(roomCode, win);
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
        endGame(roomCode, { winner: side, label: side, reason });
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