const RoomManager = require("./RoomManager");

function shuffle(list) {
    // Фишер–Йетс: честное перемешивание (sort(() => Math.random() - 0.5)
    // распределяет роли неравномерно)
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

// ---------- Одиночный режим (без мэра) ----------
// Фракции и роли, которые могут выпасть. Базовые роли (мафиози, обыватель)
// есть у всех; остальные — только у тех, кто открыл их в сундуках.
const SOLO_POOL = {
    mafia: ["mafia", "otez", "vor", "advokat"],
    neutral: ["manyak", "potroshitel", "poklon", "stukach"],
    civil: ["doctor", "sherif", "krasotka", "sveshennik", "sudya", "obivatel"]
};
const SOLO_BASE = ["mafia", "obivatel"];
// Роли, которые в одной партии могут быть только у одного игрока
const SOLO_UNIQUE = new Set(["otez", "vor", "advokat", "sudya", "manyak", "potroshitel", "poklon", "stukach", "doctor", "sherif", "krasotka", "sveshennik"]);

/** Сколько мафии и нейтралов: до 7 — 1+1, 7–10 — 2+1, дальше каждые 5 игроков +1 и +1 */
function soloFactionCounts(n) {
    if (n < 7) return { mafia: 1, neutral: n >= 4 ? 1 : 0 };
    if (n <= 10) return { mafia: 2, neutral: 1 };
    const k = Math.ceil((n - 10) / 5);
    return { mafia: 2 + k, neutral: 1 + k };
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

class RoleManager {
    soloFactionCounts(n) {
        return soloFactionCounts(n);
    }

    assignSoloRoles(room, disabledRoles = new Set()) {
        const players = shuffle([...room.players]);
        const taken = new Set();
        const owns = (p) =>
            new Set([...SOLO_BASE, ...(Array.isArray(p.ownedRoles) ? p.ownedRoles : [])].filter((r) => !disabledRoles.has(r)));
        const available = (p, faction) =>
            SOLO_POOL[faction].filter((r) => owns(p).has(r) && !(SOLO_UNIQUE.has(r) && taken.has(r)));
        const give = (p, role) => {
            p.role = role;
            if (SOLO_UNIQUE.has(role)) taken.add(role);
        };

        let { mafia, neutral } = soloFactionCounts(players.length);
        const free = () => players.filter((p) => !p.role);
        players.forEach((p) => (p.role = null));

        // Нейтралы — только у тех, у кого есть нейтральная роль. Не нашлось — место станет мирным.
        for (let i = 0; i < neutral; i++) {
            const candidates = free().filter((p) => available(p, "neutral").length);
            if (!candidates.length) break;
            const p = pick(candidates);
            give(p, pick(available(p, "neutral")));
        }
        // Мафия — мафиози есть у всех, Крёстный отец и Вор — у кого открыты
        for (let i = 0; i < mafia; i++) {
            const candidates = free();
            if (!candidates.length) break;
            const p = pick(candidates);
            give(p, pick(available(p, "mafia")) || "mafia");
        }
        // Остальные — мирные: случайная роль из своих
        free().forEach((p) => give(p, pick(available(p, "civil")) || "obivatel"));
        return room.players;
    }

    assignRoles(roomCode, disabledRoles = new Set()) {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return null;
        if (room.mode === "solo") return this.assignSoloRoles(room, disabledRoles);

        const roles = [];
        Object.entries(room.selectedRoles || {}).forEach(([role, count]) => {
            if (disabledRoles.has(role)) return;
            const n = Math.max(0, Math.min(30, Math.floor(Number(count)) || 0));
            for (let i = 0; i < n; i++) roles.push(role);
        });

        shuffle(roles);
        const players = shuffle([...room.players]);

        // Мэр роли не получает; не хватило ролей — остальные обыватели
        players.forEach((player, index) => {
            player.role = roles[index] || "obivatel";
        });

        return room.players;
    }
}

module.exports = new RoleManager();
