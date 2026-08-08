const RoomManager = require("./RoomManager");
const GameManager = require("./GameManager");

class NightManager {

    startNight(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return {
                success: false,
                message: "Комната не найдена."
            };
        }

        room.night = (room.night || 0) + 1;

        room.phase = "NIGHT";

        room.nightStep = 0;

        room.nightActions = {};

        room.nightResults = [];

        this.buildNightOrder(roomCode);

        return this.nextRole(roomCode);
    }


    buildNightOrder(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) return;

        const order = [];

        const hasAliveRole = (roleId) => {

            return room.players.some(player =>
                player.alive !== false &&
                player.role === roleId
            );

        };


        // Доктор
        if (hasAliveRole("doctor")) {
            order.push("doctor");
        }


        // Мафия
        if (room.players.some(player =>
            player.alive !== false &&
            (
                player.role === "mafia" ||
                player.role === "otez"
            )
        )) {
            order.push("mafia");
        }


        // Крестный отец
        if (hasAliveRole("otez")) {
            order.push("otez");
        }


        // Маньяк
        if (hasAliveRole("manyak")) {
            order.push("manyak");
        }


        // Потрошитель
        if (hasAliveRole("potroshitel")) {
            order.push("potroshitel");
        }


        // Шериф
        if (hasAliveRole("sherif")) {
            order.push("sherif");
        }


        // Священник
        if (hasAliveRole("sveshennik")) {
            order.push("sveshennik");
        }


        // Красотка
        if (hasAliveRole("krasotka")) {
            order.push("krasotka");
        }


        // Поклонница
        if (hasAliveRole("poklon")) {
            order.push("poklon");
        }


        // Стукач
        if (hasAliveRole("stykach")) {
            order.push("stykach");
        }


        room.nightOrder = order;

    }


    nextRole(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return {
                success: false
            };
        }


        // Все роли закончили ход
        if (
            room.nightStep >= room.nightOrder.length
        ) {

            return this.finishNight(roomCode);

        }


        const role = room.nightOrder[room.nightStep];

        room.currentNightRole = role;

        room.phase = `NIGHT_${role.toUpperCase()}`;


        return {
            success: true,
            finished: false,
            role
        };

    }


    getAvailableTargets(roomCode, role) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return [];
        }

        const alivePlayers = room.players.filter(
            player => player.alive !== false
        );


        // Доктор может выбрать любого,
        // включая себя
        if (role === "doctor") {

            return alivePlayers.map(player => ({
                id: player.id,
                name: player.name,
                avatar: player.avatar,
                role: player.role
            }));

        }


        // Остальные роли
        return alivePlayers.map(player => ({
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            role: player.role
        }));

    }


    completeRole(roomCode, role, action) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return {
                success: false
            };
        }


        // Проверяем очередь
        if (room.currentNightRole !== role) {

            return {
                success: false,
                message: "Сейчас не ход этой роли."
            };

        }


        // Сохраняем действие
        room.nightActions[role] = action;


        // Следующая роль
        room.nightStep++;


        return this.nextRole(roomCode);

    }


    finishNight(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return {
                success: false
            };
        }


        // Ночная очередь закончилась
        room.currentNightRole = null;


        // =====================================
        // РАЗРЕШАЕМ ВСЕ НОЧНЫЕ ДЕЙСТВИЯ
        // =====================================

        const result = GameManager.resolveNight(
            roomCode
        );


        if (!result.success) {

            return {
                success: false,
                message:
                    result.message ||
                    "Не удалось обработать ночь."
            };

        }


        // =====================================
        // НОЧЬ ЗАКОНЧЕНА
        // =====================================

        return {

            success: true,

            finished: true,

            phase: "MORNING",

            night: room.night,

            actions: room.nightActions,

            deaths: result.deaths,

            savedPlayers: result.savedPlayers

        };

    }

}


module.exports = new NightManager();