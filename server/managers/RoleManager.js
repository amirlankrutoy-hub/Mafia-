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

class RoleManager {
    assignRoles(roomCode, disabledRoles = new Set()) {
        const room = RoomManager.getRoom(roomCode);
        if (!room) return null;

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
