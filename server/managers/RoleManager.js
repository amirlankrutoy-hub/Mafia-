const RoomManager = require("./RoomManager");

class RoleManager {

    assignRoles(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) return null;

        const roles = [];

        Object.entries(room.selectedRoles).forEach(([role, count]) => {

            for (let i = 0; i < count; i++) {
                roles.push(role);
            }

        });

        // Перемешиваем роли
        roles.sort(() => Math.random() - 0.5);

        // Мэр роли не получает
        room.players.forEach((player, index) => {

            player.role = roles[index] || "obivatel";

        });

        return room.players;

    }

}

module.exports = new RoleManager();