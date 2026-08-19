import RoomManager from "./RoomManager.js";
import RoleManager from "./RoleManager.js";
class GameManager {

    startGame(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return null;
        }
        RoleManager.assignRoles(roomCode);

        room.started = true;

        room.phase = "ROLE_REVEAL";

        room.day = 1;

        room.night = 0;

        room.logs = [];

        room.votes = {};

        room.actions = {

            doctor: null,

            mafia: [],

            boss: null,

            maniac: null,

            butcher: null,

            sheriff: null,

            priest: null,

            beauty: null,

            fan: null,

            informer: null

        };

        room.players.forEach(player => {

            player.ready = false;
            player.alive = true;
            player.canVote = true;

        });

        return room;
    }


    setPlayerReady(roomCode, playerId) {

    const room = RoomManager.getRoom(roomCode);

    if (!room) {
        return {
            success: false,
            everyoneReady: false
        };
    }

    const player = room.players.find(
        player => player.id === playerId
    );

    if (!player) {
        return {
            success: false,
            everyoneReady: false
        };
    }

    player.ready = !player.ready;

    console.log("===== READY CHECK =====");

    room.players.forEach(p => {
        console.log(
            p.name,
            "ready:",
            p.ready,
            "isMayor:",
            p.isMayor
        );
    });

    console.log(
        "everyoneReady:",
        room.players.every(p => p.ready)
    );

    return {
        success: true,
        ready: player.ready,
        everyoneReady: room.players.every(p => p.ready)
    };
}


    resetReady(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return;
        }

        room.players.forEach(player => {

            player.ready = false;

        });

    }


    setPhase(roomCode, phase) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return;
        }

        room.phase = phase;

    }


    getPhase(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return null;
        }

        return room.phase;

    }


    nextDay(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return;
        }

        room.day++;

    }


    nextNight(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return;
        }

        room.night++;

    }
    resolveNight(roomCode) {

        const room = RoomManager.getRoom(roomCode);

        if (!room) {
            return {
                success: false,
                message: "Комната не найдена."
            };
        }

        const actions = room.nightActions || {};

        const deaths = [];
        const savedPlayers = [];

        // =====================================
        // 1. ДОКТОР
        // =====================================

        const doctorTarget =
            actions.doctor?.targetId || null;


        // =====================================
        // 2. КРАСОТКА
        // =====================================

        const beautyTarget =
            actions.krasotka?.targetId || null;


        // =====================================
        // 3. СОБИРАЕМ ВСЕ АТАКИ
        // =====================================

        const attacks = [];


        // Мафия
        if (actions.mafia?.targetId) {

            attacks.push({
                source: "mafia",
                targetId: actions.mafia.targetId,
                reason: "Мафия"
            });

        }


        // Маньяк
        if (actions.manyak?.targetId) {

            attacks.push({
                source: "manyak",
                targetId: actions.manyak.targetId,
                reason: "Маньяк"
            });

        }


        // Потрошитель
        if (actions.potroshitel?.targetId) {

            attacks.push({
                source: "potroshitel",
                targetId: actions.potroshitel.targetId,
                reason: "Потрошитель"
            });

        }


        // Шериф
        if (actions.sherif?.targetId) {

            attacks.push({
                source: "sherif",
                targetId: actions.sherif.targetId,
                reason: "Шериф"
            });

        }


        // Священник
        if (
            actions.sveshennik?.type === "kill" &&
            actions.sveshennik?.targetId
        ) {

            attacks.push({
                source: "sveshennik",
                targetId: actions.sveshennik.targetId,
                reason: "Священник"
            });

        }


        // =====================================
        // 4. ОБРАБОТКА КРАСОТКИ
        // =====================================

        let finalAttacks = [...attacks];


        if (beautyTarget) {

            const krasotka = room.players.find(
                player => player.role === "krasotka"
            );

            if (krasotka && krasotka.alive !== false) {

                const beautyWasAttacked =
                    finalAttacks.some(
                        attack =>
                            attack.targetId === krasotka.id
                    );


                if (beautyWasAttacked) {

                    // Удаляем атаки по Красотке
                    finalAttacks =
                        finalAttacks.filter(
                            attack =>
                                attack.targetId !== krasotka.id
                        );


                    // Вместо Красотки атакуется
                    // выбранный ею игрок
                    finalAttacks.push({
                        source: "krasotka",
                        targetId: beautyTarget,
                        reason: "Красотка"
                    });

                }

            }

        }


        // =====================================
        // 5. РЕШАЕМ, КОГО СПАС ДОКТОР
        // =====================================

        if (doctorTarget) {

            const attackedPlayerIds =
                finalAttacks.map(
                    attack => attack.targetId
                );

            if (
                attackedPlayerIds.includes(
                    doctorTarget
                )
            ) {

                savedPlayers.push(
                    doctorTarget
                );

            }

        }


        // =====================================
        // 6. ПРИМЕНЯЕМ СМЕРТИ
        // =====================================

        finalAttacks.forEach(attack => {

            const player = room.players.find(
                p => p.id === attack.targetId
            );

            if (!player) {
                return;
            }

            // Уже мёртв
            if (player.alive === false) {
                return;
            }

            // Доктор спас
            if (
                savedPlayers.includes(
                    player.id
                )
            ) {

                return;
            }

            player.alive = false;

            deaths.push({
                id: player.id,
                name: player.name,
                avatar: player.avatar,
                reason: attack.reason
            });

        });


        // =====================================
        // 7. КРЕСТНЫЙ ОТЕЦ
        // =====================================

        room.players.forEach(player => {

            player.canVote = player.alive !== false;

        });


        if (actions.otez?.targetId) {

            const target = room.players.find(
                player =>
                    player.id === actions.otez.targetId &&
                    player.alive !== false
            );

            if (target) {

                target.canVote = false;

            }

        }


        // =====================================
        // 8. ПОКЛОННИЦА
        // =====================================

        const poklonAction =
            actions.poklon;

        if (poklonAction?.targetId) {

            const poklonnitsa = room.players.find(
                player =>
                    player.role === "poklon"
            );

            if (poklonnitsa) {

                poklonnitsa.followTargetId =
                    poklonAction.targetId;

                // Если выбранный игрок умер —
                // Поклонница сможет выбрать
                // нового игрока следующей ночью

                const target = room.players.find(
                    player =>
                        player.id === poklonAction.targetId
                );

                if (
                    !target ||
                    target.alive === false
                ) {

                    poklonnitsa.followTargetId =
                        null;

                }

            }

        }


        // =====================================
        // 9. РЕЗУЛЬТАТ НОЧИ
        // =====================================

        room.nightResults = {

            deaths,

            savedPlayers,

            attacks: finalAttacks,

            doctorTarget,

            godfatherTarget:
                actions.otez?.targetId || null,

            beautyTarget,

            night: room.night

        };


        room.phase = "MORNING";


        return {

            success: true,

            phase: "MORNING",

            deaths,

            savedPlayers,

            attacks: finalAttacks,

            night: room.night

        };

    }

}


export default new GameManager();