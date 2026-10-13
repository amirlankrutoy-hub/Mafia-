const express = require("express");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");
const cors = require("cors");

const RoomManager = require("./managers/RoomManager");
const GameFlowManager = require("./managers/GameFlowManager");
const NIGHT_ORDER = require("./managers/NightOrder");
const store = require("./socialStore");
const { createTelegram } = require("./telegram");

// ==========================
// Настройки (переменные окружения Railway)
// ==========================
// CORS_ORIGINS — список адресов сайта через запятую. Не задан — разрешены все
// (иначе при смене домена/превью-деплое сокеты молча перестают подключаться).
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "121314$admin";
if (!process.env.ADMIN_PASSWORD) {
    console.warn("⚠️ ADMIN_PASSWORD не задан — используется пароль по умолчанию. Задайте переменную ADMIN_PASSWORD на хостинге.");
}

const ADMIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAYOR_RECONNECT_GRACE_MS = 30000;
const LOBBY_RECONNECT_GRACE_MS = 20000;
const MAX_FRIENDS = 200;

const db = store.load();

const app = express();
app.use(cors({ origin: CORS_ORIGINS.length ? CORS_ORIGINS : true }));
app.use(express.json({ limit: "20kb" }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGINS.length ? CORS_ORIGINS : true,
        methods: ["GET", "POST"],
        credentials: true
    },
    maxHttpBufferSize: 1e5,
    pingInterval: 20000,
    pingTimeout: 25000
});

const startedAt = Date.now();

app.get("/", (req, res) => {
    res.send("Mafia Play Server работает!");
});

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        rooms: RoomManager.getAllRooms().length,
        online: onlineCount()
    });
});

// Публичная статистика для главной страницы
app.get("/stats", (req, res) => {
    res.json({
        online: onlineCount(),
        rooms: RoomManager.getAllRooms().length,
        players: Object.keys(db.accountProfiles).length,
        gamesPlayed: db.stats.gamesPlayed || 0
    });
});

// ==========================
// Утилиты
// ==========================
const isAccountId = (id) => typeof id === "string" && /^\d{4,10}$/.test(id);
const cleanName = (name) =>
    String(name || "")
        .replace(/[\u0000-\u001f<>]/g, "")
        .trim()
        .slice(0, 24);
const cleanText = (text, max = 200) =>
    String(text || "")
        .replace(/[\u0000-\u001f]/g, " ")
        .trim()
        .slice(0, max);
const cleanIcon = (icon) => {
    const s = String(icon || "");
    return /^\/[\w\-./]{1,80}$/.test(s) ? s : null;
};

// Обёртка над socket.on: ошибка в одном обработчике больше не роняет весь
// сервер (раньше любое исключение завершало процесс и выкидывало всех).
function on(socket, event, handler) {
    socket.on(event, (...raw) => {
        // null -> undefined, чтобы срабатывали значения по умолчанию в аргументах
        const args = raw.map((a) => (a === null ? undefined : a));
        try {
            handler(...args);
        } catch (err) {
            console.error(`⚠️ Ошибка в обработчике "${event}":`, err);
            const cb = args[args.length - 1];
            if (typeof cb === "function") {
                try {
                    cb({ success: false, message: "Ошибка сервера. Попробуйте ещё раз." });
                } catch (_) {}
            }
        }
    });
}

function ack(cb) {
    return typeof cb === "function" ? cb : () => {};
}

// ==========================
// Профили
// ==========================
function profileOf(id) {
    return db.accountProfiles[id] || null;
}

function ensureProfile(id, name) {
    if (!db.accountProfiles[id]) {
        db.accountProfiles[id] = {
            name: name || `Игрок #${id}`,
            icon: null,
            favoriteRole: null,
            wins: 0,
            games: 0,
            mvp: 0,
            createdAt: Date.now()
        };
    }
    return db.accountProfiles[id];
}

// Похожие кириллические буквы приводим к латинским, убираем пробелы и
// разделители — чтобы "аdmin", "a d m i n", "Admin_1" тоже ловились.
const LOOKALIKE = { "а": "a", "е": "e", "о": "o", "і": "i", "ı": "i", "д": "d", "м": "m", "н": "n", "1": "i", "!": "i", "0": "o" };
const RESERVED_ADMIN_NAMES = ["admin", "admin2"];

function nameKey(name) {
    return cleanName(name)
        .toLowerCase()
        .split("")
        .map((ch) => LOOKALIKE[ch] || ch)
        .join("")
        .replace(/[\s._\-*|]+/g, "");
}

/** Проверка ника: { ok, message } */
function validateName(name, accountId) {
    const clean = cleanName(name);
    if (clean.length < 2) return { ok: false, message: "Ник слишком короткий (минимум 2 символа)" };
    if (clean.length > 20) return { ok: false, message: "Ник слишком длинный (максимум 20 символов)" };
    const exact = clean.toLowerCase();
    if (nameKey(clean).includes("admin") && !RESERVED_ADMIN_NAMES.includes(exact)) {
        return { ok: false, message: "Ник со словом admin использовать нельзя" };
    }
    const owner = nameTakenBy(clean);
    if (owner && owner !== String(accountId || "")) {
        return { ok: false, message: "Этот ник уже занят другим игроком" };
    }
    return { ok: true, name: clean };
}

function nameTakenBy(name) {
    const key = cleanName(name).toLowerCase();
    if (!key) return null;
    for (const [id, prof] of Object.entries(db.accountProfiles)) {
        if ((prof.name || "").toLowerCase() === key) return id;
    }
    return null;
}

// ==========================
// Присутствие (онлайн-статус)
// accountId -> { sockets: Set, name, roomCode, isMayor }
// ==========================
const presence = {};

function onlineCount() {
    return Object.values(presence).filter((p) => p.sockets.size > 0).length;
}

function isOnline(id) {
    return !!presence[id] && presence[id].sockets.size > 0;
}

function emitToAccount(id, event, data) {
    io.to(`acc:${id}`).emit(event, data);
}

function presenceStatus(id) {
    const prof = profileOf(id) || {};
    const p = presence[id];
    const online = isOnline(id);
    return {
        id,
        known: !!profileOf(id),
        online,
        name: (online && p.name) || prof.name || null,
        icon: prof.icon || null,
        favoriteRole: prof.favoriteRole || null,
        wins: prof.wins || 0,
        games: prof.games || 0,
        mvp: prof.mvp || 0,
        roomCode: online ? p.roomCode || null : null,
        isMayor: online ? !!p.isMayor : false
    };
}

function notifyFriendsAboutMe(id) {
    const status = presenceStatus(id);
    (db.friends[id] || []).forEach((fid) => emitToAccount(fid, "presence:changed", status));
}

function setPresenceRoom(accountId, roomCode, isMayor) {
    if (!accountId || !presence[accountId]) return;
    presence[accountId].roomCode = roomCode || null;
    presence[accountId].isMayor = !!(roomCode && isMayor);
    notifyFriendsAboutMe(accountId);
}

// ==========================
// Баны (на сервере, по ID аккаунта)
// ==========================
function activeBan(accountId) {
    const ban = accountId && db.bans[accountId];
    if (!ban) return null;
    if (ban.until && ban.until < Date.now()) {
        delete db.bans[accountId];
        store.save();
        return null;
    }
    return ban;
}

function banMessage(ban) {
    const until = ban.until ? new Date(ban.until).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" }) : "навсегда";
    return `Вы заблокированы. Причина: ${ban.reason}. Срок: ${until}`;
}

// ==========================
// Отключённые роли (управляет админ)
// ==========================
function disabledRoles() {
    const now = Date.now();
    let changed = false;
    for (const [id, info] of Object.entries(db.disabledRoles)) {
        if (info.until && info.until < now) {
            delete db.disabledRoles[id];
            changed = true;
        }
    }
    if (changed) store.save();
    return db.disabledRoles;
}

// ==========================
// Друзья: заявки -> подтверждение -> взаимная дружба
// friendRequests: toId -> [{ from, at }]
// ==========================
function friendCard(id) {
    const s = presenceStatus(id);
    return {
        id,
        name: s.name || `Игрок #${id}`,
        icon: s.icon,
        wins: s.wins,
        games: s.games,
        online: s.online,
        roomCode: s.roomCode,
        isMayor: s.isMayor
    };
}

function areFriends(a, b) {
    return (db.friends[a] || []).includes(b);
}

function makeFriends(a, b) {
    for (const [x, y] of [[a, b], [b, a]]) {
        if (!db.friends[x]) db.friends[x] = [];
        if (!db.friends[x].includes(y)) db.friends[x].push(y);
    }
    dropRequest(a, b);
    dropRequest(b, a);
    store.save();
}

function dropRequest(from, to) {
    const list = db.friendRequests[to];
    if (!list) return;
    db.friendRequests[to] = list.filter((r) => r.from !== from);
    if (!db.friendRequests[to].length) delete db.friendRequests[to];
}

function hasRequest(from, to) {
    return (db.friendRequests[to] || []).some((r) => r.from === from);
}

function requestsFor(id) {
    const incoming = (db.friendRequests[id] || []).map((r) => ({ ...friendCard(r.from), at: r.at }));
    const outgoing = [];
    for (const [to, list] of Object.entries(db.friendRequests)) {
        const r = list.find((x) => x.from === id);
        if (r) outgoing.push({ ...friendCard(to), at: r.at });
    }
    return { incoming, outgoing };
}

// ==========================
// Админ
// ==========================
const loginAttempts = new Map(); // ip -> [timestamps]

function clientIp(socket) {
    const fwd = socket.handshake.headers["x-forwarded-for"];
    return (fwd ? String(fwd).split(",")[0] : socket.handshake.address || "").trim();
}

function tooManyAttempts(ip) {
    const now = Date.now();
    const list = (loginAttempts.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    loginAttempts.set(ip, list);
    return list.length >= 8;
}

function issueAdminToken() {
    const token = crypto.randomBytes(24).toString("hex");
    db.adminTokens[token] = { createdAt: Date.now(), expiresAt: Date.now() + ADMIN_TOKEN_TTL_MS };
    store.save();
    return token;
}

function validAdminToken(token) {
    const t = typeof token === "string" && db.adminTokens[token];
    if (!t) return false;
    if (t.expiresAt < Date.now()) {
        delete db.adminTokens[token];
        store.save();
        return false;
    }
    return true;
}

function passwordMatches(input) {
    const a = Buffer.from(String(input || ""));
    const b = Buffer.from(ADMIN_PASSWORD);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function roomSummary(room) {
    return {
        code: room.code,
        phase: room.phase,
        started: !!room.started,
        night: room.night || 0,
        createdAt: room.createdAt,
        mayor: { name: room.mayor.name, accountId: room.mayor.accountId || null, connected: room.mayor.connected !== false },
        players: room.players.map((p) => ({
            name: p.name,
            accountId: p.accountId || null,
            alive: p.alive !== false,
            connected: p.connected !== false
        }))
    };
}

// ==========================
// Комнаты: что видят игроки
// ==========================
function lobbyPlayers(room) {
    return room.players.map((p) => ({
        id: p.id,
        accountId: p.accountId || null,
        support: isSupportAcc(p.accountId),
        name: p.name,
        avatar: p.avatar,
        ready: !!p.ready,
        decoration: p.decoration || null,
        connected: p.connected !== false
    }));
}

function publicMayor(room) {
    const m = room.mayor;
    return {
        id: m.id,
        accountId: m.accountId || null,
        name: m.name,
        avatar: m.avatar,
        decoration: m.decoration || null,
        connected: m.connected !== false
    };
}

function broadcastLobby(room) {
    io.to(room.code).emit("players-updated", lobbyPlayers(room));
}

// Роль погибшего видна всем в лёгком режиме; в сложном — никогда.
// После конца игры роли раскрываются всем.
function publicPlayers(room, revealAll = false) {
    const isEasy = room.difficulty !== "hard";
    return room.players.map((p) => ({
        id: p.id,
        accountId: p.accountId || null,
        name: p.name,
        avatar: p.avatar,
        alive: p.alive !== false,
        connected: p.connected !== false,
        role: revealAll || (p.alive === false && isEasy) ? p.role : undefined,
        readyForGame: !!p.readyForGame
    }));
}

function emitPhase(room, data) {
    room.lastPhase = data;
    io.to(room.code).emit("game-phase", data);
}

// Способности доступны всю фазу (голосование днём / ночь). Каждый игрок
// бесплатно использует одну способность за игру; купленные в магазине
// заряды дают дополнительные использования (не больше одной за фазу).
function openAbilityWindow(room, phase) {
    room.abilityWindow = { phase, id: `${room.gameId}:${phase}:${phase === "day" ? room.day : room.night}:${room.voteRound || 0}` };
    const prev = room.abilityEffects || {};
    room.abilityEffects = {
        extraVoteWeight: {},
        voteImmune: [],
        muted: [],
        alibi: [],
        // ночная защита действует только на свою ночь
        nightImmune: phase === "day" ? prev.nightImmune || [] : []
    };
    io.to(room.code).emit("ability-window", { phase });
}

function abilityKey(p) {
    return p.accountId ? `a:${p.accountId}` : `n:${p.name}`;
}

function abilityUsage(room) {
    if (!room.abilityUsage || room.abilityUsage.gameId !== room.gameId) {
        room.abilityUsage = { gameId: room.gameId, free: {}, perWindow: {} };
    }
    return room.abilityUsage;
}

function abilityState(room, socketId) {
    const self = room.players.find((p) => p.id === socketId);
    const enabled = !!room.started && room.abilitiesEnabled !== false;
    const win = room.abilityWindow;
    const activePhase =
        win && ((win.phase === "day" && room.phase === "voting") || (win.phase === "night" && room.phase === "night")) ? win.phase : null;
    if (!self) return { enabled: false };
    const usage = abilityUsage(room);
    const key = abilityKey(self);
    return {
        enabled,
        alive: self.alive !== false,
        phase: activePhase,
        freeUsed: !!usage.free[key],
        usedThisPhase: !!(win && usage.perWindow[`${win.id}|${key}`])
    };
}

const ABILITY_DEFS = {
    voice_change: { type: "day", needsTarget: true },
    extra_vote: { type: "day" },
    vote_immunity: { type: "day" },
    reveal_faction: { type: "day", needsTarget: true },
    alibi: { type: "day" },
    night_immortality: { type: "night" },
    reveal_role: { type: "night", needsTarget: true },
    guardian: { type: "night", needsTarget: true }
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
const WIN_LABELS = {
    town: "Мирные жители",
    mafia: "Мафия",
    neutral: "Нейтралы",
    manyak: "Маньяк",
    potroshitel: "Потрошитель",
    draw: "Ничья"
};
const roleName = (r) => GameFlowManager.ROLE_NAMES[r] || r;

// ---------- Ночь ----------
function sendNight(room, night) {
    if (!night) return;

    if (night.phase === "night_end") {
        // Предпросмотр итогов ночи — только мэру. Раньше он уходил всем
        // игрокам, и в сетевом трафике были видны чужие проверки.
        room.lastPhase = { phase: "night_end" };
        room.players.forEach((p) => io.to(p.id).emit("game-phase", { phase: "night_end" }));
        io.to(room.mayor.id).emit("game-phase", {
            phase: "night_end",
            results: (night.resultsPreview || []).filter((r) => !r.privateTo)
        });
        return;
    }

    // Всем — только кто "просыпается"; цели и состав ходящих — лично ходящим.
    // (Раньше список ходящих уходил всем, и по нему было видно, кто мафия.)
    const publicData = {
        phase: "night",
        phrase: night.phrase,
        nightInfo: {
            step: { role: night.step.role, label: night.step.label },
            actorsCount: night.actors.length,
            night: room.night
        }
    };
    emitPhase(room, publicData);
    room.lastNight = night;

    const team = night.step.teamAction ? night.actors.map((a) => a.name) : null;
    night.actors.forEach((actor) => {
        io.to(actor.id).emit("game-phase", {
            phase: "night",
            phrase: night.phrase,
            nightInfo: {
                step: night.step,
                targets: night.targets,
                yourTurn: true,
                team,
                night: room.night
            }
        });
    });
}

function startNight(room) {
    const night = GameFlowManager.beginNight(room.code);
    if (!night) return;
    if (room.abilitiesEnabled !== false) openAbilityWindow(room, "night");
    sendNight(room, night);
}

// Игрок ушёл/выбыл посреди ночи — если его ждал текущий ход, двигаемся дальше
function nudgeNight(room) {
    if (room.phase !== "night") return;
    const step = NIGHT_ORDER[room.nightStepIndex];
    if (!step) return;
    const actors = GameFlowManager.stepActors(room, step);
    const acted = room.nightActions[step.role] || [];
    if (actors.every((a) => acted.some((x) => x.by === a.id))) {
        sendNight(room, GameFlowManager.advanceNightStep(room.code));
    }
}

// ---------- Конец игры ----------
function endGame(room, win) {
    if (!room || room.phase === "ended") return;
    RoomManager.clearTimers(room);
    room.phase = "ended";
    room.winner = win;

    const winners = GameFlowManager.getWinners(room.code, win);
    const mvp = GameFlowManager.getMVP(room.code, win);

    // Статистика для мирового рейтинга — считает сервер, а не клиент
    db.stats.gamesPlayed = (db.stats.gamesPlayed || 0) + 1;
    room.players.forEach((p) => {
        if (!p.accountId) return;
        const prof = ensureProfile(p.accountId, p.name);
        prof.games = (prof.games || 0) + 1;
        if (winners.includes(p.id)) prof.wins = (prof.wins || 0) + 1;
        if (mvp && mvp.id === p.id) prof.mvp = (prof.mvp || 0) + 1;
        prof.lastGameAt = Date.now();
    });
    store.save();

    emitPhase(room, {
        phase: "ended",
        winner: { ...win, label: win.label || WIN_LABELS[win.winner] || win.winner },
        winners,
        mvp,
        players: publicPlayers(room, true)
    });
}

function checkWinAndEnd(room) {
    const win = GameFlowManager.checkWin(room.code);
    if (win) {
        endGame(room, win);
        return true;
    }
    return false;
}

// После дня (казнь/помилование/никого) — проверка победы и следующая ночь
function afterDay(room) {
    RoomManager.addTimer(room, () => {
        if (checkWinAndEnd(room)) return;
        emitPhase(room, { phase: "loading", loadingText: "Приближается ночь", players: publicPlayers(room) });
        RoomManager.addTimer(room, () => startNight(room), 3000);
    }, 4500);
}

// ---------- Голосование ----------
function scheduleVoteEnd(room) {
    const ms = Math.max(1000, (room.voteEndsAt || Date.now()) - Date.now());
    const round = room.voteRound;
    const endsAt = room.voteEndsAt;
    RoomManager.addTimer(room, () => {
        if (room.phase === "voting" && room.voteRound === round && room.voteEndsAt === endsAt) {
            finishVoting(room);
        }
    }, ms + 500);
}

function finishVoting(room) {
    const voteResult = GameFlowManager.finishVoting(room.code);
    if (!voteResult) return;

    if (voteResult.type === "pending") {
        emitPhase(room, { phase: "vote_pending", candidate: voteResult.candidate, voteResult });
        return;
    }

    if (voteResult.type === "runoff") {
        emitPhase(room, { phase: "voting", vote: GameFlowManager.votingSnapshot(room), voteResult });
        scheduleVoteEnd(room);
        return;
    }

    emitPhase(room, { phase: "vote_result", voteResult, players: publicPlayers(room) });
    afterDay(room);
}

// ---------- Переподключение посреди игры ----------
// socket.id меняется после F5 — переносим старый id во всех структурах игры
function remapSocketId(room, oldId, newId) {
    if (!oldId || oldId === newId) return;
    const swap = (id) => (id === oldId ? newId : id);
    Object.values(room.nightActions || {}).forEach((list) =>
        (list || []).forEach((a) => {
            a.by = swap(a.by);
            a.targetId = swap(a.targetId);
        })
    );
    if (room.votes) {
        const next = {};
        Object.entries(room.votes).forEach(([k, v]) => (next[swap(k)] = swap(v)));
        room.votes = next;
    }
    room.blockedVotes = (room.blockedVotes || []).map(swap);
    room.voteCandidates = (room.voteCandidates || []).map(swap);
    room.players.forEach((p) => (p.linkedTo = swap(p.linkedTo)));
    if (room.pendingExecution) room.pendingExecution.id = swap(room.pendingExecution.id);
    if (room._mafiaTieBreak) room._mafiaTieBreak.target = swap(room._mafiaTieBreak.target);
    const eff = room.abilityEffects;
    if (eff) {
        ["voteImmune", "nightImmune", "muted", "alibi"].forEach((k) => (eff[k] = (eff[k] || []).map(swap)));
        if (eff.extraVoteWeight[oldId]) {
            eff.extraVoteWeight[newId] = eff.extraVoteWeight[oldId];
            delete eff.extraVoteWeight[oldId];
        }
    }
    if (room.lastNight) {
        room.lastNight.actors.forEach((a) => (a.id = swap(a.id)));
        room.lastNight.targets.forEach((t) => (t.id = swap(t.id)));
    }
}

function resumePayload(room, socketId, isMayor) {
    const me = room.players.find((p) => p.id === socketId);
    let phase = room.lastPhase;
    if (phase && phase.phase === "night" && room.lastNight && me) {
        const night = room.lastNight;
        const acted = (room.nightActions[night.step.role] || []).some((a) => a.by === me.id);
        if (night.actors.some((a) => a.id === me.id) && !acted) {
            phase = {
                ...phase,
                nightInfo: { step: night.step, targets: night.targets, yourTurn: true, night: room.night }
            };
        }
    }
    if (phase && phase.phase === "night_end" && isMayor) {
        phase = { phase: "night_end", results: GameFlowManager.resolveNight(room.code, false).filter((r) => !r.privateTo) };
    }
    return {
        isMayor,
        role: me ? me.role : null,
        alive: me ? me.alive !== false : true,
        team: me && ["mafia", "otez", "vor"].includes(me.role) ? mafiaTeam(room) : null,
        players: publicPlayers(room, room.phase === "ended"),
        phase: phase || { phase: room.phase, players: publicPlayers(room) }
    };
}

function mafiaTeam(room) {
    return room.players
        .filter((p) => ["mafia", "otez", "vor"].includes(p.role))
        .map((p) => ({ id: p.id, name: p.name, role: p.role, roleName: roleName(p.role) }));
}

// ==========================
// Саппорты (назначает админ)
// ==========================
const SUPPORT_BONUS = 3000;
const isSupportAcc = (id) => !!(id && db.supports[id]);

function sendStatus(accountId) {
    emitToAccount(accountId, "account:status", { support: isSupportAcc(accountId) });
    const sup = db.supports[accountId];
    // Бонус 3000 Токенов — один раз, при первом входе после назначения
    if (sup && !sup.granted && isOnline(accountId)) {
        sup.granted = true;
        store.save();
        emitToAccount(accountId, "you-received-currency", { amount: SUPPORT_BONUS, from: "support" });
    }
}

function adminSockets() {
    return [...io.sockets.sockets.values()].filter((s) => s.data.isAdmin);
}

// ==========================
// Личные сообщения друзей
// ==========================
const DM_LIMIT = 60;
const dmKey = (a, b) => [a, b].sort().join(":");

// ==========================
// Оплата звёздами Telegram
// ==========================
function deliverTopups(accountId) {
    (db.pendingTopups[accountId] || []).forEach((t) =>
        emitToAccount(accountId, "topup:success", { orderId: t.orderId, amount: t.amount, stars: t.stars })
    );
}

const telegram = createTelegram({
    db,
    save: () => store.save(),
    isAccount: (id) => !!profileOf(id),
    accountName: (id) => profileOf(id)?.name || `Игрок #${id}`,
    isBanned: (id) => !!activeBan(id),
    onPaid: (order) => {
        // Начисление ждёт подтверждения сайта (topup:ack): если игрок сейчас
        // не на сайте, Токены придут при следующем входе.
        if (!db.pendingTopups[order.accountId]) db.pendingTopups[order.accountId] = [];
        db.pendingTopups[order.accountId].push({ orderId: order.id, amount: order.amount, stars: order.stars });
        db.stats.starsEarned = (db.stats.starsEarned || 0) + order.stars;
        db.stats.topups = (db.stats.topups || 0) + 1;
        store.save();
        console.log(`⭐ Оплата ${order.stars}⭐ → +${order.amount} Токенов аккаунту #${order.accountId}`);
        deliverTopups(order.accountId);
    }
});

// ==========================
// Сокеты
// ==========================
const mayorGraceTimers = {};
const lobbyGraceTimers = {};

io.on("connection", (socket) => {
    socket.data.ip = clientIp(socket);

    const me = () => socket.data.accountId || null;
    const requireMayor = (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        return room && room.mayor?.id === socket.id ? room : null;
    };
    const requireAdmin = (cb) => {
        if (socket.data.isAdmin) return true;
        ack(cb)({ success: false, message: "Нет доступа" });
        return false;
    };

    // ==========================
    // Присутствие
    // ==========================
    on(socket, "presence:hello", (accountId, name) => {
        accountId = String(accountId || "");
        if (!isAccountId(accountId)) return;

        const ban = activeBan(accountId);
        if (ban) {
            socket.emit("banned", { reason: ban.reason, until: ban.until || null, message: banMessage(ban) });
        }

        if (socket.data.accountId && socket.data.accountId !== accountId) {
            const old = presence[socket.data.accountId];
            if (old) old.sockets.delete(socket.id);
            socket.leave(`acc:${socket.data.accountId}`);
        }

        socket.data.accountId = accountId;
        socket.join(`acc:${accountId}`);

        const fresh = !profileOf(accountId);
        const check = validateName(name, accountId);
        const prof = ensureProfile(accountId, check.ok ? check.name : null);
        if (check.ok && (fresh || prof.name !== check.name)) prof.name = check.name;
        prof.lastSeen = Date.now();
        store.save();

        const p = presence[accountId] || { sockets: new Set(), roomCode: null, isMayor: false };
        p.sockets.add(socket.id);
        p.name = prof.name;
        presence[accountId] = p;

        notifyFriendsAboutMe(accountId);

        const reqs = requestsFor(accountId);
        if (reqs.incoming.length) socket.emit("friend:requests", reqs);
        deliverTopups(accountId);
        sendStatus(accountId);
    });

    on(socket, "account:check-name", ({ name, accountId } = {}, cb) => {
        const check = validateName(name, accountId);
        ack(cb)({ available: check.ok, message: check.message });
    });

    // Смена ника
    on(socket, "account:rename", ({ name } = {}, cb) => {
        const done = ack(cb);
        const myId = me();
        if (!myId) return done({ success: false, message: "Сначала войдите в аккаунт" });
        const now = Date.now();
        if (socket.data.lastRenameAt && now - socket.data.lastRenameAt < 5000) {
            return done({ success: false, message: "Слишком часто. Подождите пару секунд." });
        }
        const check = validateName(name, myId);
        if (!check.ok) return done({ success: false, message: check.message });
        socket.data.lastRenameAt = now;
        const prof = ensureProfile(myId);
        prof.name = check.name;
        if (presence[myId]) presence[myId].name = check.name;
        store.save();
        notifyFriendsAboutMe(myId);
        done({ success: true, name: check.name });
    });

    on(socket, "presence:search", (id, cb) => {
        if (typeof cb !== "function") return;
        cb(presenceStatus(String(id || "").trim()));
    });

    on(socket, "presence:bulk", (ids, cb) => {
        if (typeof cb !== "function") return;
        const list = (Array.isArray(ids) ? ids : []).slice(0, 300).map((id) => presenceStatus(String(id)));
        cb(list);
    });

    // ==========================
    // Публичный профиль
    // ==========================
    on(socket, "profile:update", ({ accountId, icon, favoriteRole, name } = {}) => {
        // Менять можно только свой профиль. Победы клиент больше не присылает —
        // их считает сервер в конце каждой игры (раньше локальный счётчик
        // перетирал серверный, и рейтинг "прыгал").
        if (!me() || String(accountId) !== me()) return;
        const prof = ensureProfile(me());
        const nextIcon = icon !== undefined ? cleanIcon(icon) : prof.icon;
        const nextFav = favoriteRole !== undefined ? (GameFlowManager.ROLE_NAMES[favoriteRole] ? favoriteRole : null) : prof.favoriteRole;
        const nextName = prof.name; // ник меняется только через account:rename
        if (nextIcon === prof.icon && nextFav === prof.favoriteRole && nextName === prof.name) return;
        prof.icon = nextIcon;
        prof.favoriteRole = nextFav;
        prof.name = nextName;
        store.save();
        notifyFriendsAboutMe(me());
        socket.emit("profile:changed", presenceStatus(me()));
    });

    on(socket, "profile:get", (accountId, cb) => {
        if (typeof cb !== "function") return;
        cb(presenceStatus(String(accountId || "")));
    });

    // Оставлено для старых клиентов: победы теперь начисляет сервер сам
    on(socket, "profile:register-win", () => {});

    // ==========================
    // Мировой рейтинг
    // ==========================
    on(socket, "leaderboard:get", (opts, cb) => {
        if (typeof opts === "function") {
            cb = opts;
            opts = {};
        }
        if (typeof cb !== "function") return;
        const all = Object.entries(db.accountProfiles)
            .filter(([, p]) => (p.wins || 0) > 0 || (p.games || 0) > 0)
            .map(([id, p]) => ({
                id,
                name: p.name || `Игрок #${id}`,
                icon: p.icon || null,
                favoriteRole: p.favoriteRole || null,
                wins: p.wins || 0,
                games: Math.max(p.games || 0, p.wins || 0),
                mvp: p.mvp || 0,
                online: isOnline(id)
            }))
            .sort((a, b) => b.wins - a.wins || b.mvp - a.mvp || a.games - b.games || a.name.localeCompare(b.name));
        all.forEach((p, i) => (p.rank = i + 1));
        const myId = me();
        cb({
            list: all.slice(0, 100),
            me: myId ? all.find((p) => p.id === myId) || null : null,
            total: all.length
        });
    });

    // ==========================
    // Друзья
    // ==========================
    function requestFriend({ toAccountId } = {}, cb) {
        const done = ack(cb);
        const from = me();
        const to = String(toAccountId || "");
        if (!from) return done({ success: false, message: "Сначала войдите в аккаунт" });
        if (!isAccountId(to)) return done({ success: false, message: "Некорректный ID" });
        if (to === from) return done({ success: false, message: "Нельзя добавить себя" });
        if (activeBan(from)) return done({ success: false, message: "Вы заблокированы" });
        if (!profileOf(to)) return done({ success: false, message: "Игрок с таким ID не найден" });
        if (areFriends(from, to)) return done({ success: true, status: "friends", friend: friendCard(to) });
        if ((db.friends[from] || []).length >= MAX_FRIENDS) {
            return done({ success: false, message: "Слишком много друзей" });
        }

        // Встречная заявка уже есть — сразу дружим
        if (hasRequest(to, from)) {
            makeFriends(from, to);
            emitToAccount(to, "friend:accepted", friendCard(from));
            emitToAccount(from, "friend:accepted", friendCard(to));
            return done({ success: true, status: "friends", friend: friendCard(to) });
        }

        if (hasRequest(from, to)) return done({ success: true, status: "sent" });

        if (!db.friendRequests[to]) db.friendRequests[to] = [];
        db.friendRequests[to].push({ from, at: Date.now() });
        store.save();

        emitToAccount(to, "friend:request-incoming", { ...friendCard(from), at: Date.now() });
        done({ success: true, status: "sent", delivered: isOnline(to) });
    }

    on(socket, "friend:request", requestFriend);
    // Совместимость со старым клиентом: "Дружить" теперь отправляет заявку
    on(socket, "friend:add", requestFriend);

    on(socket, "friend:respond", ({ fromAccountId, accept } = {}, cb) => {
        const done = ack(cb);
        const myId = me();
        const from = String(fromAccountId || "");
        if (!myId || !hasRequest(from, myId)) {
            return done({ success: false, message: "Заявка не найдена" });
        }
        if (accept) {
            makeFriends(myId, from);
            emitToAccount(from, "friend:accepted", friendCard(myId));
            return done({ success: true, friend: friendCard(from) });
        }
        dropRequest(from, myId);
        store.save();
        emitToAccount(from, "friend:declined", { id: myId });
        done({ success: true });
    });

    on(socket, "friend:cancel", ({ toAccountId } = {}, cb) => {
        const myId = me();
        if (myId) {
            dropRequest(myId, String(toAccountId || ""));
            store.save();
            emitToAccount(String(toAccountId || ""), "friend:request-cancelled", { id: myId });
        }
        ack(cb)({ success: true });
    });

    on(socket, "friend:requests", (cb) => {
        if (typeof cb !== "function") return;
        cb(me() ? requestsFor(me()) : { incoming: [], outgoing: [] });
    });

    on(socket, "friend:remove", ({ friendId } = {}, cb) => {
        const myId = me();
        const other = String(friendId || "");
        if (!myId) return ack(cb)({ success: false });
        db.friends[myId] = (db.friends[myId] || []).filter((id) => id !== other);
        db.friends[other] = (db.friends[other] || []).filter((id) => id !== myId);
        store.save();
        emitToAccount(other, "friend:removed", { byAccountId: myId });
        ack(cb)({ success: true });
    });

    on(socket, "friend:get-list", (accountId, cb) => {
        if (typeof accountId === "function") {
            cb = accountId;
            accountId = me();
        }
        if (typeof cb !== "function") return;
        const id = me() || String(accountId || "");
        cb((db.friends[id] || []).map(friendCard));
    });

    // Пригласить друга в свою комнату — приходит уведомление, вход без
    // подтверждения мэра (приглашение уже согласовано).
    on(socket, "friend:invite", ({ toAccountId, roomCode } = {}, cb) => {
        const done = ack(cb);
        const myId = me();
        const room = RoomManager.getRoom(roomCode);
        if (!myId || !room) return done({ success: false, message: "Комната не найдена" });
        const inRoom = room.mayor.id === socket.id || room.players.some((p) => p.id === socket.id);
        if (!inRoom) return done({ success: false, message: "Вы не в этой комнате" });
        if (room.started) return done({ success: false, message: "Игра уже идёт" });
        if (!areFriends(myId, String(toAccountId))) return done({ success: false, message: "Можно пригласить только друга" });
        if (!isOnline(String(toAccountId))) return done({ success: false, message: "Друг сейчас не в сети" });
        room.invited = room.invited || {};
        room.invited[String(toAccountId)] = Date.now();
        emitToAccount(String(toAccountId), "friend:invite", {
            from: friendCard(myId),
            roomCode: room.code
        });
        done({ success: true });
    });

    // Постучаться в комнату друга — мэр получает запрос
    on(socket, "friend:knock", ({ roomCode } = {}, cb) => {
        const done = ack(cb);
        const myId = me();
        const room = RoomManager.getRoom(roomCode);
        if (!room || !room.mayor?.id) return done({ success: false, message: "Комната не найдена" });
        if (room.started) return done({ success: false, message: "Игра уже идёт — дождитесь окончания" });
        if (!myId) return done({ success: false, message: "Сначала войдите в аккаунт" });
        io.to(room.mayor.id).emit("friend:incoming-request", {
            requesterSocketId: socket.id,
            requesterAccountId: myId,
            requesterName: presence[myId]?.name || `Игрок #${myId}`,
            requesterIcon: profileOf(myId)?.icon || null,
            roomCode: room.code
        });
        done({ success: true });
    });

    on(socket, "friend:mayor-response", ({ roomCode, requesterSocketId, requesterAccountId, accepted } = {}) => {
        const room = requireMayor(roomCode);
        if (!room) return;
        if (accepted && requesterAccountId) {
            room.invited = room.invited || {};
            room.invited[String(requesterAccountId)] = Date.now();
        }
        io.to(requesterSocketId).emit("friend:join-decision", { accepted: !!accepted, roomCode: room.code });
    });

    // ==========================
    // Способности: одна бесплатная за игру + купленные заряды
    // ==========================
    on(socket, "ability:state", ({ roomCode } = {}, cb) => {
        const done = ack(cb);
        const room = RoomManager.getRoom(roomCode);
        done(room ? abilityState(room, socket.id) : { enabled: false });
    });

    on(socket, "ability:activate", ({ roomCode, abilityId, targetId, paid } = {}, cb) => {
        const done = ack(cb);
        const room = RoomManager.getRoom(roomCode);
        if (!room) return done({ success: false, message: "Комната не найдена" });
        if (room.abilitiesEnabled === false) {
            return done({ success: false, message: "Мэр запретил способности в этой игре" });
        }
        const def = ABILITY_DEFS[abilityId];
        if (!def) return done({ success: false, message: "Неизвестная способность" });
        const state = abilityState(room, socket.id);
        if (!state.phase) return done({ success: false, message: "Способности работают на голосовании и ночью" });
        if (state.phase !== def.type) {
            return done({ success: false, message: def.type === "day" ? "Эта способность — для дневного голосования" : "Эта способность работает только ночью" });
        }
        const self = room.players.find((p) => p.id === socket.id && p.alive !== false);
        if (!self) return done({ success: false, message: "Недоступно" });
        if (state.usedThisPhase) return done({ success: false, message: "В этой фазе вы уже использовали способность" });
        if (state.freeUsed && !paid) return done({ success: false, message: "Вы уже использовали способность в этой игре" });
        if (def.needsTarget && (!targetId || targetId === socket.id)) return done({ success: false, message: "Выберите другого игрока" });
        const target = def.needsTarget ? room.players.find((p) => p.id === targetId && p.alive !== false) : null;
        if (def.needsTarget && !target) return done({ success: false, message: "Цель не найдена" });

        const eff = room.abilityEffects;
        let info = null;
        switch (abilityId) {
            case "voice_change":
                eff.muted.push(targetId);
                info = `Голос игрока ${target.name} в этом раунде не будет засчитан.`;
                break;
            case "alibi":
                eff.alibi.push(socket.id);
                info = "Если город приговорит вас сегодня — у вас найдётся алиби.";
                break;
            case "guardian":
                eff.nightImmune.push(targetId);
                info = `${target.name} под вашей защитой до утра.`;
                break;
            case "extra_vote":
                eff.extraVoteWeight[socket.id] = (eff.extraVoteWeight[socket.id] || 1) + 1;
                break;
            case "vote_immunity":
                eff.voteImmune.push(socket.id);
                break;
            case "reveal_faction": {
                const t = room.players.find((p) => p.id === targetId && p.alive !== false);
                if (!t) return done({ success: false, message: "Цель не найдена" });
                info = `${t.name}: фракция «${FACTION_LABELS[GameFlowManager.ROLE_CATEGORY[t.role]] || "неизвестно"}»`;
                break;
            }
            case "night_immortality":
                eff.nightImmune.push(socket.id);
                break;
            case "reveal_role": {
                const t = room.players.find((p) => p.id === targetId && p.alive !== false);
                if (!t) return done({ success: false, message: "Цель не найдена" });
                info = `${t.name}: роль «${roleName(t.role)}»`;
                break;
            }
            default:
                return done({ success: false, message: "Неизвестная способность" });
        }
        const usage = abilityUsage(room);
        const key = abilityKey(self);
        const free = !usage.free[key];
        if (free) usage.free[key] = abilityId;
        usage.perWindow[`${room.abilityWindow.id}|${key}`] = abilityId;
        done({ success: true, info, free });
    });

    // ==========================
    // Комнаты
    // ==========================
    on(socket, "create-room", (mayorName, avatar, accountId, cb) => {
        if (typeof accountId === "function") {
            cb = accountId;
            accountId = null;
        }
        const done = ack(cb);
        const accId = isAccountId(String(accountId || "")) ? String(accountId) : null;
        const ban = activeBan(accId);
        if (ban) return done({ success: false, message: banMessage(ban) });

        const name = cleanName(mayorName) || "Мэр";
        const room = RoomManager.createRoom(socket, name, cleanIcon(avatar) || "/avatars/avatar1.svg", accId);
        db.stats.roomsCreated = (db.stats.roomsCreated || 0) + 1;
        store.save();
        setPresenceRoom(accId, room.code, true);

        const response = {
            success: true,
            roomCode: room.code,
            mayor: publicMayor(room),
            players: lobbyPlayers(room)
        };
        if (typeof cb === "function") cb(response);
        else socket.emit("room-created", response);
        console.log(`👑 Создана комната ${room.code}`);
    });

    on(socket, "join-room", (roomCode, playerName, avatar, accountId, cb) => {
        if (typeof accountId === "function") {
            cb = accountId;
            accountId = null;
        }
        const done = ack(cb);
        const code = String(roomCode || "").trim().toUpperCase();
        const accId = isAccountId(String(accountId || "")) ? String(accountId) : null;
        const ban = activeBan(accId);
        if (ban) return done({ success: false, message: banMessage(ban) });

        const result = RoomManager.joinRoom(socket, code, {
            name: cleanName(playerName) || "Игрок",
            avatar: cleanIcon(avatar) || "/avatars/avatar1.svg",
            accountId: accId
        });
        if (!result.success) {
            console.log(`🚪 Вход в ${code} отклонён (${cleanName(playerName)} #${accId || "-"}): ${result.message}`);
            return done(result);
        }
        console.log(`👤 ${cleanName(playerName)} #${accId || "-"} ${result.reconnected ? "вернулся в" : "вошёл в"} ${code} (игроков: ${result.room.players.length})`);

        const r = result.room;
        const oldId = result.oldId || null;
        const amMayor = r.mayor.id === socket.id;
        if (result.reconnected) remapSocketId(r, oldId, socket.id);

        if (lobbyGraceTimers[oldId]) {
            clearTimeout(lobbyGraceTimers[oldId]);
            delete lobbyGraceTimers[oldId];
        }
        if (amMayor && mayorGraceTimers[code]) {
            clearTimeout(mayorGraceTimers[code]);
            delete mayorGraceTimers[code];
            io.to(code).emit("mayor-reconnected");
            console.log(`👑 Мэр переподключился, комната ${code} остаётся открытой`);
        }

        setPresenceRoom(accId, code, amMayor);
        if (r.invited && accId) delete r.invited[accId];

        broadcastLobby(r);
        io.to(code).emit("mayor-updated", publicMayor(r));

        done({
            success: true,
            roomCode: code,
            players: lobbyPlayers(r),
            mayor: publicMayor(r),
            isMayor: amMayor,
            started: !!r.started
        });

        // Вернулся посреди игры — сразу возвращаем его на текущий экран
        if (r.started && result.reconnected) {
            socket.emit("resume-game", resumePayload(r, socket.id, amMayor));
        }
    });

    function leaveRoom(roomCode, reason) {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;

        if (room.mayor?.id === socket.id) {
            io.to(roomCode).emit("room-closed", { reason: reason || "Мэр закрыл комнату" });
            [room.mayor, ...room.players].forEach((p) => setPresenceRoom(p.accountId, null, false));
            io.in(roomCode).socketsLeave(roomCode);
            RoomManager.deleteRoom(roomCode);
            return;
        }

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;
        socket.leave(roomCode);
        setPresenceRoom(player.accountId, null, false);

        if (room.started && room.phase !== "ended") {
            // Посреди игры игрок выбывает, но остаётся в списке (для итогов)
            player.alive = false;
            player.connected = false;
            player.left = true;
            io.to(room.code).emit("game-players", publicPlayers(room));
            if (!checkWinAndEnd(room)) nudgeNight(room);
        } else {
            room.players = room.players.filter((p) => p.id !== socket.id);
            broadcastLobby(room);
        }
    }

    on(socket, "leave-room", (roomCode) => leaveRoom(roomCode));

    on(socket, "kick-player", (roomCode, playerId) => {
        const room = requireMayor(roomCode);
        if (!room) return;
        const player = room.players.find((p) => p.id === playerId);
        if (!player) return;

        room.players = room.players.filter((p) => p.id !== playerId);
        setPresenceRoom(player.accountId, null, false);
        const kicked = io.sockets.sockets.get(playerId);
        if (kicked) {
            kicked.leave(room.code);
            kicked.emit("kicked", { reason: "Вас выгнал мэр" });
        }
        broadcastLobby(room);
    });

    // ==========================
    // Настройка партии (только мэр)
    // ==========================
    on(socket, "setup-roles", (roomCode, roles) => {
        const room = requireMayor(roomCode);
        if (!room || room.started) return;
        const clean = {};
        Object.entries(roles && typeof roles === "object" ? roles : {}).forEach(([role, n]) => {
            if (GameFlowManager.ROLE_NAMES[role]) clean[role] = Math.max(0, Math.min(30, Math.floor(Number(n)) || 0));
        });
        room.selectedRoles = clean;
        io.to(roomCode).emit("roles-updated", clean);
    });

    on(socket, "set-abilities-enabled", (roomCode, enabled) => {
        const room = requireMayor(roomCode);
        if (room) room.abilitiesEnabled = !!enabled;
    });

    on(socket, "set-difficulty", (roomCode, difficulty) => {
        const room = requireMayor(roomCode);
        if (room) room.difficulty = difficulty === "hard" ? "hard" : "easy";
    });

    // Мэр нажал "Начать" — игроки видят экран "Мэр раздаёт роли"
    on(socket, "lobby-configuring", (roomCode) => {
        const room = requireMayor(roomCode);
        if (!room || room.started) return;
        socket.to(room.code).emit("loading-game");
    });

    on(socket, "lobby-open", (roomCode) => {
        const room = requireMayor(roomCode);
        if (!room || room.started) return;
        room.phase = "lobby";
        io.to(roomCode).emit("lobby-open");
    });

    on(socket, "set-decoration", (roomCode, decorationId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;
        const deco = decorationId ? String(decorationId).slice(0, 40) : null;
        if (room.mayor?.id === socket.id) {
            room.mayor.decoration = deco;
            io.to(roomCode).emit("mayor-updated", publicMayor(room));
            return;
        }
        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;
        player.decoration = deco;
        broadcastLobby(room);
    });

    on(socket, "send-emoji", (roomCode, emojiId) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return;
        if (!room.players.some((p) => p.id === socket.id) && room.mayor?.id !== socket.id) return;
        const now = Date.now();
        if (socket.data.lastEmojiAt && now - socket.data.lastEmojiAt < 800) return;
        socket.data.lastEmojiAt = now;
        io.to(roomCode).emit("emoji-sent", { playerId: socket.id, emojiId: String(emojiId || "").slice(0, 40) });
    });

    on(socket, "player-ready", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        if (!room || room.started) return;
        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        player.ready = !player.ready;
        broadcastLobby(room);

        const everyoneReady = room.players.length > 0 && room.players.every((p) => p.ready);
        if (everyoneReady) io.to(room.mayor.id).emit("everyone-ready");
    });

    // ==========================
    // Игра
    // ==========================
    on(socket, "start-game", (roomCode) => {
        const room = requireMayor(roomCode);
        if (!room || room.started) return;
        // Отключившиеся гости не должны получить роль
        room.players = room.players.filter((p) => p.connected !== false);
        if (room.players.length < 1) {
            socket.emit("game-error", { message: "В комнате нет игроков" });
            return;
        }

        GameFlowManager.startGame(roomCode, new Set(Object.keys(disabledRoles())));

        const team = mafiaTeam(room);
        room.players.forEach((p) => {
            io.to(p.id).emit("your-role", p.role);
            if (["mafia", "otez", "vor"].includes(p.role)) io.to(p.id).emit("your-team", team);
        });

        emitPhase(room, { phase: "waiting_ready", players: publicPlayers(room), readyCount: 0 });
        console.log(`🎮 Игра стартовала в ${roomCode}`);
    });

    on(socket, "game-player-ready", (roomCode) => {
        const room = RoomManager.getRoom(roomCode);
        const result = GameFlowManager.setPlayerGameReady(roomCode, socket.id);
        if (!room || !result.success) return;

        const readyCount = room.players.filter((p) => p.alive !== false && p.readyForGame).length;
        emitPhase(room, { phase: "waiting_ready", players: publicPlayers(room), readyCount });

        if (result.allReady) {
            RoomManager.addTimer(room, () => {
                if (room.phase === "waiting_ready") startNight(room);
            }, 1200);
        }
    });

    on(socket, "begin-night", (roomCode) => {
        const room = requireMayor(roomCode);
        if (!room || room.phase !== "waiting_ready") return;
        startNight(room);
    });

    on(socket, "night-action", (roomCode, payload, cb) => {
        const done = ack(cb);
        const room = RoomManager.getRoom(roomCode);
        if (!room) return done({ success: false, message: "Комната не найдена" });
        const result = GameFlowManager.submitNightAction(roomCode, socket.id, payload || {});
        done({ success: result.success, message: result.message });
        if (!result.success) return;

        const step = NIGHT_ORDER.find((s) => s.role === result.step);
        if (step?.teamAction && room.lastNight) {
            // Семья видит, кто кого выбрал
            const by = room.players.find((p) => p.id === socket.id);
            const target = room.players.find((p) => p.id === payload.targetId);
            room.lastNight.actors.forEach((a) =>
                io.to(a.id).emit("team-choice", { name: by?.name, targetName: target?.name, targetId: target?.id })
            );
        }

        if (result.waiting) {
            socket.emit("game-phase", { phase: "night_wait", phrase: "Ждём решения остальных..." });
            const acted = (room.nightActions[result.step] || []).length;
            io.to(room.mayor.id).emit("night-progress", { acted, total: room.lastNight?.actors.length || 0 });
            return;
        }
        sendNight(room, result.next);
    });

    // Мэр пропускает текущий ход (если игрок ушёл от экрана)
    on(socket, "night-next", (roomCode) => {
        const room = requireMayor(roomCode);
        if (!room || room.phase !== "night") return;
        sendNight(room, GameFlowManager.skipNightStep(roomCode));
    });

    on(socket, "mayor-morning", (roomCode) => {
        const room = requireMayor(roomCode);
        if (!room || room.phase !== "night_end") return;

        const results = GameFlowManager.resolveNight(roomCode, true);
        const isEasy = room.difficulty !== "hard";

        results
            .filter((r) => r.privateTo)
            .forEach((r) => r.privateTo.forEach((id) => io.to(id).emit("private-info", { text: r.text, type: r.type })));

        results
            .filter((r) => r.type === "death")
            .forEach((r) =>
                io.to(r.playerId).emit("you-died", {
                    reason: "Вас убили этой ночью.",
                    killedBy: r.killedBy || "night"
                })
            );

        const publicResults = results
            .filter((r) => !r.privateTo)
            .map((r) => {
                if (r.type !== "death") return r;
                if (isEasy) {
                    return { ...r, text: `${r.name} погиб этой ночью. Роль: ${roleName(r.role)}` };
                }
                return {
                    ...r,
                    role: undefined,
                    text: `${r.name} погиб этой ночью от руки ${KILLER_LABELS[r.killedBy] || "неизвестного"}.`
                };
            });

        emitPhase(room, { phase: "morning", day: room.day, results: publicResults, players: publicPlayers(room) });
        checkWinAndEnd(room);
    });

    on(socket, "begin-voting", (roomCode) => {
        const room = requireMayor(roomCode);
        if (!room || room.phase !== "morning") return;
        room.phase = "voting_loading";

        emitPhase(room, { phase: "loading", loadingText: "Начинается голосование" });
        RoomManager.addTimer(room, () => {
            const vote = GameFlowManager.beginVoting(roomCode);
            if (room.abilitiesEnabled !== false) openAbilityWindow(room, "day");
            emitPhase(room, { phase: "voting", vote });
            scheduleVoteEnd(room);
        }, 3000);
    });

    on(socket, "cast-vote", (roomCode, targetId, cb) => {
        const done = ack(cb);
        const room = RoomManager.getRoom(roomCode);
        if (!room) return done({ success: false });
        const res = GameFlowManager.castVote(roomCode, socket.id, targetId);
        done(res);
        if (!res.success) return;
        io.to(roomCode).emit("vote-progress", { votedCount: res.votedCount, votersTotal: res.votersTotal });
        if (res.allVoted) {
            const round = room.voteRound;
            RoomManager.addTimer(room, () => {
                if (room.phase === "voting" && room.voteRound === round) finishVoting(room);
            }, 1500);
        }
    });

    on(socket, "finish-voting", (roomCode) => {
        const room = requireMayor(roomCode);
        if (!room || room.phase !== "voting") return;
        finishVoting(room);
    });

    on(socket, "mayor-execute", (roomCode, pardon) => {
        const room = requireMayor(roomCode);
        if (!room) return;
        const pendingId = room.pendingExecution?.id;
        const alibi = pardon !== true && !!pendingId && (room.abilityEffects?.alibi || []).includes(pendingId);
        const executed = GameFlowManager.executePending(roomCode, pardon === true || alibi);
        if (!executed) return;

        if (executed.pardoned) {
            emitPhase(room, {
                phase: "vote_result",
                voteResult: { type: "pardoned", alibi, pardoned: { id: executed.id, name: executed.name } },
                players: publicPlayers(room)
            });
            afterDay(room);
            return;
        }

        const isEasy = room.difficulty !== "hard";
        io.to(executed.id).emit("you-died", { reason: "Город приговорил вас к казни.", killedBy: "execution" });

        emitPhase(room, {
            phase: "vote_result",
            voteResult: {
                type: "executed",
                executed: {
                    id: executed.id,
                    name: executed.name,
                    role: isEasy ? executed.role : undefined,
                    roleName: isEasy ? roleName(executed.role) : undefined
                }
            },
            players: publicPlayers(room)
        });
        afterDay(room);
    });

    on(socket, "mayor-kill", (roomCode, targetId, reason) => {
        const room = requireMayor(roomCode);
        if (!room || !room.started || room.phase === "ended") return;
        const text = cleanText(reason, 140);
        if (!text) return;

        const killed = GameFlowManager.mayorKill(roomCode, targetId, text);
        if (!killed) return;
        io.to(killed.id).emit("you-died", { reason: text, killedBy: "mayor" });
        io.to(roomCode).emit("game-toast", { text: `Мэр устранил игрока ${killed.name}. Причина: ${text}` });

        if (room.votes) delete room.votes[killed.id];
        if (room.voteCandidates) room.voteCandidates = room.voteCandidates.filter((id) => id !== killed.id);
        if (room.pendingExecution?.id === killed.id) room.pendingExecution = null;
        io.to(roomCode).emit("game-players", publicPlayers(room));
        if (!checkWinAndEnd(room)) nudgeNight(room);
    });

    on(socket, "mayor-force-win", (roomCode, side, reason) => {
        const room = requireMayor(roomCode);
        if (!room || !room.started || room.phase === "ended") return;
        const s = ["town", "mafia", "neutral"].includes(side) ? side : "town";
        endGame(room, { winner: s, label: WIN_LABELS[s], reason: cleanText(reason, 140) || "Решение мэра" });
    });

    // "Играть снова" — только мэр. Возвращает всех к чистому лобби комнаты.
    on(socket, "play-again", (roomCode, cb) => {
        const done = ack(cb);
        const room = RoomManager.getRoom(roomCode);
        if (!room) return done({ success: false, message: "Комната не найдена" });
        if (room.mayor?.id !== socket.id) {
            return done({ success: false, message: "Сервер не распознал вас как мэра этой комнаты" });
        }
        const fresh = RoomManager.resetForReplay(roomCode);
        if (!fresh) return done({ success: false, message: "Не удалось сбросить комнату" });

        io.to(roomCode).emit("game-reset", { players: lobbyPlayers(fresh), mayor: publicMayor(fresh) });
        done({ success: true });
    });

    // ==========================
    // Чат: общий (лобби и голосование) и личный канал мафии
    // ==========================
    const CHAT_PHASES = ["voting", "vote_pending", "vote_result"];

    on(socket, "chat:send", ({ roomCode, text, channel } = {}, cb) => {
        const done = ack(cb);
        const room = RoomManager.getRoom(roomCode);
        if (!room) return done({ success: false, message: "Комната не найдена" });
        const msg = cleanText(text, 200);
        if (!msg) return done({ success: false });

        const now = Date.now();
        if (socket.data.lastChatAt && now - socket.data.lastChatAt < 700) {
            return done({ success: false, message: "Не так быстро" });
        }

        const isMayor = room.mayor?.id === socket.id;
        const player = room.players.find((p) => p.id === socket.id);
        if (!isMayor && !player) return done({ success: false, message: "Вы не в этой комнате" });
        const author = isMayor ? room.mayor : player;

        const MAFIA = ["mafia", "otez", "vor"];
        let targets;
        if (channel === "mafia") {
            if (!room.started || room.phase === "ended") return done({ success: false, message: "Игра не идёт" });
            if (!player || player.alive === false || !MAFIA.includes(player.role)) {
                return done({ success: false, message: "Этот чат только для мафии" });
            }
            const team = room.players.filter((p) => p.alive !== false && MAFIA.includes(p.role));
            if (team.length < 2) return done({ success: false, message: "Напарников по мафии нет в живых" });
            targets = team.map((p) => p.id);
        } else {
            channel = "room";
            if (room.started && room.phase !== "ended" && !CHAT_PHASES.includes(room.phase)) {
                return done({ success: false, message: "Общий чат открыт в лобби и во время голосования" });
            }
            if (room.started && room.phase !== "ended" && player && player.alive === false) {
                return done({ success: false, message: "Выбывшие игроки не могут писать" });
            }
        }

        socket.data.lastChatAt = now;
        const message = {
            id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
            channel,
            fromId: socket.id,
            name: author.name,
            avatar: author.avatar,
            isMayor,
            text: msg,
            at: now
        };
        if (channel === "mafia") {
            targets.forEach((id) => io.to(id).emit("chat:message", message));
        } else {
            room.chat = [...(room.chat || []), message].slice(-60);
            io.to(room.code).emit("chat:message", message);
        }
        done({ success: true });
    });

    on(socket, "chat:history", (roomCode, cb) => {
        const room = RoomManager.getRoom(roomCode);
        if (typeof cb !== "function") return;
        const inRoom = room && (room.mayor?.id === socket.id || room.players.some((p) => p.id === socket.id));
        cb(inRoom ? room.chat || [] : []);
    });

    // ==========================
    // Саппорт: сообщить администратору (баг, нарушитель, другое)
    // ==========================
    on(socket, "support:report", ({ type, text, targetId } = {}, cb) => {
        const done = ack(cb);
        const myId = me();
        if (!isSupportAcc(myId)) return done({ success: false, message: "Доступно только саппортам" });
        const msg = cleanText(text, 600);
        if (msg.length < 5) return done({ success: false, message: "Опишите подробнее" });
        const now = Date.now();
        if (socket.data.lastReportAt && now - socket.data.lastReportAt < 15000) {
            return done({ success: false, message: "Подождите немного перед следующим сообщением" });
        }
        socket.data.lastReportAt = now;
        const report = {
            id: `r${now}${Math.random().toString(36).slice(2, 6)}`,
            type: ["bug", "ban", "other"].includes(type) ? type : "other",
            text: msg,
            targetId: isAccountId(String(targetId || "")) ? String(targetId) : null,
            from: myId,
            fromName: profileOf(myId)?.name || `#${myId}`,
            at: now,
            done: false
        };
        db.reports = [report, ...(db.reports || [])].slice(0, 300);
        store.save();
        adminSockets().forEach((s) => s.emit("admin:new-report", report));
        console.log(`📨 Сообщение от саппорта ${report.fromName}: [${report.type}] ${msg.slice(0, 80)}`);
        done({ success: true });
    });

    // ==========================
    // Личные сообщения друзьям
    // ==========================
    on(socket, "dm:send", ({ to, text } = {}, cb) => {
        const done = ack(cb);
        const myId = me();
        const other = String(to || "");
        if (!myId) return done({ success: false, message: "Сначала войдите в аккаунт" });
        if (!areFriends(myId, other)) return done({ success: false, message: "Писать можно только друзьям" });
        if (activeBan(myId)) return done({ success: false, message: "Вы заблокированы" });
        const msg = cleanText(text, 500);
        if (!msg) return done({ success: false });
        const now = Date.now();
        if (socket.data.lastDmAt && now - socket.data.lastDmAt < 600) return done({ success: false, message: "Не так быстро" });
        socket.data.lastDmAt = now;
        const key = dmKey(myId, other);
        const message = { id: `${now}-${Math.random().toString(36).slice(2, 6)}`, from: myId, to: other, text: msg, at: now };
        db.dms[key] = [...(db.dms[key] || []), message].slice(-DM_LIMIT);
        store.save();
        const payload = { ...message, fromName: profileOf(myId)?.name || `#${myId}`, fromIcon: profileOf(myId)?.icon || null };
        emitToAccount(other, "dm:message", payload);
        emitToAccount(myId, "dm:message", payload);
        done({ success: true, message: payload });
    });

    on(socket, "dm:history", ({ with: other } = {}, cb) => {
        if (typeof cb !== "function") return;
        const myId = me();
        if (!myId || !areFriends(myId, String(other || ""))) return cb([]);
        cb(db.dms[dmKey(myId, String(other))] || []);
    });

    // ==========================
    // Покупка Токенов за звёзды
    // ==========================
    on(socket, "topup:packages", (cb) => {
        if (typeof cb === "function") cb(telegram.PACKAGES);
    });

    on(socket, "topup:create", ({ packageId } = {}, cb) => {
        const done = ack(cb);
        if (!me()) return done({ success: false, message: "Сначала войдите в аккаунт" });
        if (activeBan(me())) return done({ success: false, message: "Аккаунт заблокирован" });
        telegram
            .createInvoice(me(), String(packageId || ""))
            .then(done)
            .catch((err) => {
                console.error("⚠️ createInvoice:", err.message);
                done({ success: false, message: "Не удалось создать счёт. Попробуйте позже." });
            });
    });

    // Сайт зачислил Токены — убираем из очереди доставки
    on(socket, "topup:ack", (orderId) => {
        const list = me() && db.pendingTopups[me()];
        if (!list) return;
        db.pendingTopups[me()] = list.filter((t) => t.orderId !== orderId);
        if (!db.pendingTopups[me()].length) delete db.pendingTopups[me()];
        store.save();
    });

    // ==========================
    // Админ-панель (все действия проверяются на сервере)
    // ==========================
    on(socket, "admin:login", (password, cb) => {
        const done = ack(cb);
        const ip = socket.data.ip;
        if (tooManyAttempts(ip)) {
            return done({ success: false, message: "Слишком много попыток. Подождите 10 минут." });
        }
        if (!passwordMatches(password)) {
            loginAttempts.get(ip).push(Date.now());
            return done({ success: false, message: "Неверный пароль" });
        }
        socket.data.isAdmin = true;
        done({ success: true, token: issueAdminToken() });
    });

    on(socket, "admin:resume", (token, cb) => {
        const ok = validAdminToken(token);
        socket.data.isAdmin = ok;
        ack(cb)({ success: ok });
    });

    on(socket, "admin:logout", (token) => {
        if (typeof token === "string") delete db.adminTokens[token];
        store.save();
        socket.data.isAdmin = false;
    });

    on(socket, "admin:overview", (cb) => {
        if (!requireAdmin(cb)) return;
        const rooms = RoomManager.getAllRooms();
        const mem = process.memoryUsage();
        cb({
            success: true,
            online: onlineCount(),
            sockets: io.engine.clientsCount,
            rooms: rooms.length,
            inGame: rooms.filter((r) => r.started).reduce((n, r) => n + r.players.length, 0),
            players: Object.keys(db.accountProfiles).length,
            gamesPlayed: db.stats.gamesPlayed || 0,
            roomsCreated: db.stats.roomsCreated || 0,
            bans: Object.keys(db.bans).length,
            starsEarned: db.stats.starsEarned || 0,
            topups: db.stats.topups || 0,
            uptimeSec: Math.round((Date.now() - startedAt) / 1000),
            memoryMb: Math.round(mem.rss / 1024 / 1024),
            persistent: store.persistent(),
            roomList: rooms.map(roomSummary)
        });
    });

    on(socket, "admin:player", (accountId, cb) => {
        if (!requireAdmin(cb)) return;
        const id = String(accountId || "").trim();
        if (!profileOf(id)) return cb({ success: false, message: "Игрок с таким ID не найден" });
        cb({
            success: true,
            player: { ...presenceStatus(id), friends: (db.friends[id] || []).length, lastSeen: profileOf(id).lastSeen || null, support: isSupportAcc(id) },
            ban: activeBan(id)
        });
    });

    on(socket, "admin:search", (query, cb) => {
        if (!requireAdmin(cb)) return;
        const q = String(query || "").trim().toLowerCase();
        if (!q) return cb({ success: true, list: [] });
        const list = Object.entries(db.accountProfiles)
            .filter(([id, p]) => id.includes(q) || (p.name || "").toLowerCase().includes(q))
            .slice(0, 30)
            .map(([id]) => ({ ...presenceStatus(id), banned: !!activeBan(id) }));
        cb({ success: true, list });
    });

    on(socket, "admin:ban", ({ accountId, duration, reason } = {}, cb) => {
        if (!requireAdmin(cb)) return;
        const id = String(accountId || "").trim();
        const why = cleanText(reason, 140);
        if (!profileOf(id)) return cb({ success: false, message: "Игрок с таким ID не найден" });
        if (!why) return cb({ success: false, message: "Укажите причину" });
        const ms = { "1h": 3600e3, "1d": 86400e3, "7d": 7 * 86400e3, "30d": 30 * 86400e3 }[duration];
        db.bans[id] = {
            reason: why,
            duration: ms ? duration : "permanent",
            until: ms ? Date.now() + ms : null,
            at: Date.now(),
            name: profileOf(id).name
        };
        store.save();

        const ban = db.bans[id];
        emitToAccount(id, "banned", { reason: ban.reason, until: ban.until, message: banMessage(ban) });
        // Выкидываем из комнаты, если он сейчас в лобби
        const roomCode = presence[id]?.roomCode;
        const room = roomCode && RoomManager.getRoom(roomCode);
        if (room && !room.started) {
            const p = room.players.find((x) => x.accountId === id);
            if (p) {
                room.players = room.players.filter((x) => x !== p);
                io.to(p.id).emit("kicked", { reason: "Вы заблокированы администратором" });
                io.sockets.sockets.get(p.id)?.leave(room.code);
                broadcastLobby(room);
            }
        }
        cb({ success: true, message: `${profileOf(id).name} заблокирован` });
    });

    on(socket, "admin:unban", (accountId, cb) => {
        if (!requireAdmin(cb)) return;
        const id = String(accountId || "");
        delete db.bans[id];
        store.save();
        emitToAccount(id, "unbanned", {});
        cb({ success: true, message: "Блокировка снята" });
    });

    on(socket, "admin:bans", (cb) => {
        if (!requireAdmin(cb)) return;
        Object.keys(db.bans).forEach(activeBan);
        cb({ success: true, list: Object.entries(db.bans).map(([id, b]) => ({ id, ...b })) });
    });

    on(socket, "admin:give", ({ accountId, amount } = {}, cb) => {
        if (!requireAdmin(cb)) return;
        const id = String(accountId || "").trim();
        const value = Math.floor(Number(amount));
        if (!value || value < 1 || value > 1000000) return cb({ success: false, message: "Некорректная сумма" });
        if (!isOnline(id)) return cb({ success: false, message: "Игрок не в сети — Токены можно выдать только онлайн" });
        emitToAccount(id, "you-received-currency", { amount: value, from: "admin" });
        cb({ success: true, message: `Выдано ${value} Токенов` });
    });

    on(socket, "admin:set-support", ({ accountId, support } = {}, cb) => {
        if (!requireAdmin(cb)) return;
        const id = String(accountId || "").trim();
        if (!profileOf(id)) return cb({ success: false, message: "Игрок с таким ID не найден" });
        if (support) {
            if (!db.supports[id]) db.supports[id] = { at: Date.now(), granted: false };
        } else {
            delete db.supports[id];
        }
        store.save();
        sendStatus(id);
        if (support && isOnline(id)) {
            emitToAccount(id, "announcement", { text: "Вы назначены саппортом Mafia Play! Вам доступны эксклюзивная аватарка и связь с администрацией." });
        }
        // обновляем значок в лобби, если игрок сейчас в комнате
        const room = presence[id]?.roomCode && RoomManager.getRoom(presence[id].roomCode);
        if (room) broadcastLobby(room);
        cb({ success: true, message: support ? `${profileOf(id).name} теперь саппорт` : "Статус саппорта снят" });
    });

    on(socket, "admin:supports", (cb) => {
        if (!requireAdmin(cb)) return;
        cb({ success: true, list: Object.entries(db.supports).map(([id, s]) => ({ ...presenceStatus(id), at: s.at })) });
    });

    on(socket, "admin:reports", (cb) => {
        if (!requireAdmin(cb)) return;
        cb({ success: true, list: db.reports || [] });
    });

    on(socket, "admin:report-done", ({ id, done: isDone } = {}, cb) => {
        if (!requireAdmin(cb)) return;
        const r = (db.reports || []).find((x) => x.id === id);
        if (r) r.done = !!isDone;
        store.save();
        cb({ success: true });
    });

    on(socket, "admin:close-room", (code, cb) => {
        if (!requireAdmin(cb)) return;
        const room = RoomManager.getRoom(code);
        if (!room) return cb({ success: false, message: "Комната не найдена" });
        io.to(code).emit("room-closed", { reason: "Комната закрыта администратором" });
        [room.mayor, ...room.players].forEach((p) => setPresenceRoom(p.accountId, null, false));
        io.in(code).socketsLeave(code);
        RoomManager.deleteRoom(code);
        cb({ success: true, message: `Комната ${code} закрыта` });
    });

    on(socket, "admin:disable-role", ({ roleId, duration } = {}, cb) => {
        if (!requireAdmin(cb)) return;
        if (!GameFlowManager.ROLE_NAMES[roleId]) return cb({ success: false, message: "Неизвестная роль" });
        const ms = { "1h": 3600e3, "1d": 86400e3, "7d": 7 * 86400e3 }[duration];
        db.disabledRoles[roleId] = { until: ms ? Date.now() + ms : null, duration: ms ? duration : "permanent", at: Date.now() };
        store.save();
        io.emit("roles:disabled", disabledRoles());
        cb({ success: true, message: `Роль «${roleName(roleId)}» отключена` });
    });

    on(socket, "admin:enable-role", (roleId, cb) => {
        if (!requireAdmin(cb)) return;
        delete db.disabledRoles[roleId];
        store.save();
        io.emit("roles:disabled", disabledRoles());
        cb({ success: true, message: `Роль «${roleName(roleId)}» снова доступна` });
    });

    on(socket, "admin:announce", (text, cb) => {
        if (!requireAdmin(cb)) return;
        const msg = cleanText(text, 200);
        if (!msg) return cb({ success: false, message: "Пустое сообщение" });
        io.emit("announcement", { text: msg, at: Date.now() });
        cb({ success: true, message: "Объявление отправлено всем онлайн" });
    });

    // Ошибки на стороне игрока (не смог войти и т.п.) — пишем в лог сервера
    on(socket, "client:log", (info = {}) => {
        const now = Date.now();
        if (socket.data.lastClientLog && now - socket.data.lastClientLog < 2000) return;
        socket.data.lastClientLog = now;
        console.warn(
            `📱 Проблема у игрока #${me() || "-"} [${cleanText(info.where, 40)}]: ${cleanText(info.message, 300)} | ` +
                `transport=${cleanText(info.transport, 20)} online=${info.online} | ${cleanText(info.ua, 200)}`
        );
    });

    on(socket, "roles:get-disabled", (cb) => {
        if (typeof cb === "function") cb(disabledRoles());
    });

    // ==========================
    // Отключение
    // ==========================
    on(socket, "disconnect", () => {
        const accId = socket.data.accountId;
        if (accId && presence[accId]) {
            presence[accId].sockets.delete(socket.id);
            if (presence[accId].sockets.size === 0) {
                notifyFriendsAboutMe(accId);
            }
        }

        const found = RoomManager.markDisconnected(socket.id);
        if (!found) return;
        const { room, isMayor, player } = found;
        const roomCode = room.code;

        if (isMayor) {
            // Не закрываем комнату сразу — это может быть обычный F5
            io.to(roomCode).emit("mayor-disconnected", { graceMs: MAYOR_RECONNECT_GRACE_MS });
            if (mayorGraceTimers[roomCode]) clearTimeout(mayorGraceTimers[roomCode]);
            mayorGraceTimers[roomCode] = setTimeout(() => {
                delete mayorGraceTimers[roomCode];
                const still = RoomManager.getRoom(roomCode);
                if (still && still.mayor && !still.mayor.connected) {
                    io.to(roomCode).emit("room-closed", { reason: "Мэр покинул игру. Комната закрыта." });
                    [still.mayor, ...still.players].forEach((p) => setPresenceRoom(p.accountId, null, false));
                    io.in(roomCode).socketsLeave(roomCode);
                    RoomManager.deleteRoom(roomCode);
                }
            }, MAYOR_RECONNECT_GRACE_MS);
            return;
        }

        broadcastLobby(room);

        // В лобби "призраки" мешают старту — убираем, если не вернулся
        if (!room.started) {
            const sid = socket.id;
            lobbyGraceTimers[sid] = setTimeout(() => {
                delete lobbyGraceTimers[sid];
                const still = RoomManager.getRoom(roomCode);
                if (!still || still.started) return;
                const p = still.players.find((x) => x.id === sid && x.connected === false);
                if (!p) return;
                still.players = still.players.filter((x) => x !== p);
                setPresenceRoom(p.accountId, null, false);
                broadcastLobby(still);
            }, LOBBY_RECONNECT_GRACE_MS);
        } else if (player) {
            io.to(roomCode).emit("game-players", publicPlayers(room));
        }
    });
});

// Последний рубеж: залогировать, но не падать
process.on("uncaughtException", (err) => console.error("⚠️ uncaughtException:", err));
process.on("unhandledRejection", (err) => console.error("⚠️ unhandledRejection:", err));

async function shutdown() {
    await store.flushNow();
    process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

const PORT = process.env.PORT || 3001;
// Сначала загружаем данные (из Upstash или файла), потом принимаем игроков
store.init().finally(async () => {
    await telegram.attach(app);
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
});
