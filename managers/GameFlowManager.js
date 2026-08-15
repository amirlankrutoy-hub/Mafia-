const RoomManager = require("./RoomManager");
const RoleManager = require("./RoleManager");
const NIGHT_ORDER = require("./NightOrder");

const NIGHT_PHRASES = [
  "Сегодня мне не спится...",
  "Ходят слухи, по ночам происходит что-то страшное...",
  "Я слышу чей-то кровожадный шепот в темноте...",
  "Что-то у меня очень плохое предчувствие...",
  "В шагах за окном чувствуется запах пороха и крови...",
  "Кто-то затаил дыхание совсем рядом...",
  "Заприте двери. Город погрузился во тьму...",
  "Сирены молчат, а тени начинают охоту..."
];

class GameFlowManager {
  startGame(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;

    RoleManager.assignRoles(roomCode);

    room.started = true;
    room.phase = "role_reveal";
    room.day = 0;
    room.night = 0;
    room.nightActions = {};
    room.votes = {};
    room.blockedVotes = [];
    room.nightResults = [];
    room.players.forEach((p) => {
      p.alive = true;
      p.readyForGame = false;
    });

    return room;
  }

  setPlayerGameReady(roomCode, socketId) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return { success: false };

    const player = room.players.find((p) => p.id === socketId);
    if (!player || !player.alive) return { success: false };

    player.readyForGame = true;

    const alive = room.players.filter((p) => p.alive);
    const allReady = alive.length > 0 && alive.every((p) => p.readyForGame);

    return { success: true, allReady, players: room.players };
  }

  beginNight(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;

    room.night += 1;
    room.phase = "night";
    room.nightActions = {};
    room.nightResults = [];
    room.blockedVotes = [];
    room.nightStepIndex = -1;

    return this.advanceNightStep(roomCode);
  }

  getAliveTargets(room, role) {
    let list = room.players.filter((p) => p.alive);
    if (role === "potroshitel") {
      list = list.filter((p) => p.role !== "obivatel");
    }
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar
    }));
  }

  advanceNightStep(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;

    let idx = (room.nightStepIndex ?? -1) + 1;

    while (idx < NIGHT_ORDER.length) {
      const step = NIGHT_ORDER[idx];

      if (step.role === "otez" && step.onlyAfterMafia) {
        const godfather = room.players.find(
          (p) => p.alive && p.role === "otez"
        );
        if (godfather) {
          room.nightStepIndex = idx;
          room.currentNightRole = step.role;
          return {
            phase: "night",
            step,
            actors: [
              {
                id: godfather.id,
                name: godfather.name,
                avatar: godfather.avatar
              }
            ],
            targets: this.getAliveTargets(room),
            phrase:
              NIGHT_PHRASES[Math.floor(Math.random() * NIGHT_PHRASES.length)]
          };
        }
        idx++;
        continue;
      }

      const actors = room.players.filter(
        (p) =>
          p.alive &&
          (p.role === step.role ||
            (step.withRoles || []).includes(p.role))
      );

      if (actors.length > 0) {
        room.nightStepIndex = idx;
        room.currentNightRole = step.role;
        return {
          phase: "night",
          step,
          actors: actors.map((a) => ({
            id: a.id,
            name: a.name,
            avatar: a.avatar
          })),
          targets: this.getAliveTargets(room, step.role),
          phrase:
            NIGHT_PHRASES[Math.floor(Math.random() * NIGHT_PHRASES.length)]
        };
      }

      idx++;
    }

    room.phase = "night_end";
    room.currentNightRole = null;
    return {
      phase: "night_end",
      resultsPreview: this.resolveNight(roomCode, false)
    };
  }

  submitNightAction(roomCode, socketId, payload) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase !== "night") {
      return { success: false };
    }

    const player = room.players.find((p) => p.id === socketId);
    if (!player || !player.alive) return { success: false };

    const step = NIGHT_ORDER[room.nightStepIndex];
    if (!step) return { success: false };

    const allowed =
      player.role === step.role ||
      (step.withRoles || []).includes(player.role);

    if (!allowed) {
      return { success: false, message: "Не ваш ход" };
    }

    const key = step.role;
    if (!room.nightActions[key]) room.nightActions[key] = [];

    room.nightActions[key].push({
      by: socketId,
      targetId: payload.targetId,
      mode: payload.mode || null
    });

    if (step.teamAction) {
      const needed = room.players.filter(
        (p) => p.alive && (p.role === "mafia" || p.role === "otez")
      );
      if (room.nightActions[key].length < needed.length) {
        return { success: true, waiting: true };
      }
    }

    return {
      success: true,
      waiting: false,
      next: this.advanceNightStep(roomCode)
    };
  }

  resolveNight(roomCode, apply = true) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return [];

    const killVotes = {};
    const results = [];

    const addKill = (targetId, source) => {
      if (!targetId) return;
      if (!killVotes[targetId]) killVotes[targetId] = [];
      killVotes[targetId].push(source);
    };

    (room.nightActions.mafia || []).forEach((a) =>
      addKill(a.targetId, "mafia")
    );
    (room.nightActions.manyak || []).forEach((a) =>
      addKill(a.targetId, "manyak")
    );
    (room.nightActions.potroshitel || []).forEach((a) =>
      addKill(a.targetId, "potroshitel")
    );
    (room.nightActions.sherif || []).forEach((a) =>
      addKill(a.targetId, "sherif")
    );
    (room.nightActions.sveshennik || [])
      .filter((a) => a.mode === "kill")
      .forEach((a) => addKill(a.targetId, "sveshennik"));

    // Красотка: атака на неё уходит в выбранную цель
    const krasotka = room.players.find(
      (p) => p.role === "krasotka" && p.alive
    );
    const krasTarget = (room.nightActions.krasotka || [])[0]?.targetId;
    if (krasotka && krasTarget && killVotes[krasotka.id]) {
      delete killVotes[krasotka.id];
      addKill(krasTarget, "krasotka_redirect");
      results.push({
        type: "redirect",
        text: "Красотка перенаправила атаку"
      });
    }

    const healed = new Set(
      (room.nightActions.doctor || []).map((a) => a.targetId)
    );
    (room.abilityEffects?.nightImmune || []).forEach((id) => healed.add(id));

    Object.keys(killVotes).forEach((tid) => {
      const target = room.players.find((p) => p.id === tid);
      if (!target) return;

      if (healed.has(tid)) {
        results.push({
          type: "saved",
          playerId: tid,
          name: target.name,
          text: `${target.name} был спасён Доктором`
        });
      } else {
        results.push({
          type: "death",
          playerId: tid,
          name: target.name,
          text: `${target.name} погиб этой ночью`,
          killedBy: killVotes[tid].includes("mafia") ? "mafia" : "night"
        });
        if (apply) target.alive = false;
      }
    });

    (room.nightActions.otez || []).forEach((a) => {
      if (!a.targetId) return;
      room.blockedVotes.push(a.targetId);
      const t = room.players.find((p) => p.id === a.targetId);
      results.push({
        type: "block",
        playerId: a.targetId,
        name: t?.name,
        text: `${t?.name || "Игрок"} лишён голоса`
      });
    });

    (room.nightActions.sveshennik || [])
      .filter((a) => a.mode === "check")
      .forEach((a) => {
        const t = room.players.find((p) => p.id === a.targetId);
        if (t) {
          results.push({
            type: "check",
            playerId: a.targetId,
            role: t.role,
            name: t.name,
            privateTo: a.by
          });
        }
      });

    (room.nightActions.poklon || []).forEach((a) => {
      const t = room.players.find((p) => p.id === a.targetId);
      if (t) {
        results.push({
          type: "link",
          playerId: a.targetId,
          role: t.role,
          name: t.name,
          privateTo: a.by
        });
        const fan = room.players.find((p) => p.id === a.by);
        if (fan) fan.linkedTo = a.targetId;
      }
    });

    (room.nightActions.stukach || []).forEach((a) => {
      const t = room.players.find((p) => p.id === a.targetId);
      if (t) {
        results.push({
          type: "check",
          playerId: a.targetId,
          role: t.role,
          name: t.name,
          privateTo: a.by
        });
      }
    });

    room.nightResults = results;
    if (apply) room.phase = "morning";
    return results;
  }

  beginVoting(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;

    room.phase = "voting";
    room.voteRound = "main";
    room.votes = {};
    room.pendingExecution = null;
    room.voteCandidates = room.players
      .filter((p) => p.alive)
      .map((p) => p.id);
    room.voteEndsAt = Date.now() + 3 * 60 * 1000;

    return this.votingSnapshot(room);
  }

  votingSnapshot(room) {
    return {
      round: room.voteRound,
      endsAt: room.voteEndsAt,
      candidates: room.players
        .filter((p) => room.voteCandidates.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })),
      blockedVoters: room.blockedVotes || []
    };
  }

  castVote(roomCode, socketId, targetId) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase !== "voting") return { success: false };

    if (room.blockedVotes.includes(socketId)) {
      return { success: false, message: "Ваш голос заблокирован" };
    }

    const voter = room.players.find((p) => p.id === socketId && p.alive);
    if (!voter) return { success: false };

    if (!room.voteCandidates.includes(targetId)) {
      return { success: false, message: "Недопустимая цель" };
    }

    if ((room.abilityEffects?.voteImmune || []).includes(targetId)) {
      return { success: false, message: "За этого игрока нельзя голосовать в этом раунде" };
    }

    room.votes[socketId] = targetId;
    return { success: true, votes: room.votes };
  }

  tallyVotes(room) {
    const counts = {};
    room.voteCandidates.forEach((id) => (counts[id] = 0));
    const weights = room.abilityEffects?.extraVoteWeight || {};
    Object.entries(room.votes).forEach(([voterId, tid]) => {
      if (tid != null && counts[tid] != null) {
        counts[tid] += weights[voterId] || 1;
      }
    });
    return counts;
  }

  // Подводит итог текущего раунда голосования.
  // - Один явный лидер -> отдаём мэру на подтверждение казни ("vote_pending")
  // - Голоса поровну, первый раз -> переголосование среди тех, кто разделил голоса (1 минута)
  // - Голоса поровну второй раз подряд -> никто не казнён
  finishVoting(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;

    const counts = this.tallyVotes(room);

    let max = 0;
    let top = [];
    Object.entries(counts).forEach(([id, c]) => {
      if (c > max) {
        max = c;
        top = [id];
      } else if (c === max && c > 0) {
        top.push(id);
      }
    });

    if (max === 0) {
      room.phase = "vote_result";
      room.pendingExecution = null;
      return { type: "none", counts, executed: null };
    }

    if (top.length === 1) {
      const p = room.players.find((x) => x.id === top[0]);
      room.phase = "vote_pending";
      room.pendingExecution = p ? { id: p.id, name: p.name } : null;
      return { type: "pending", counts, candidate: room.pendingExecution };
    }

    if (room.voteRound === "runoff") {
      room.phase = "vote_result";
      room.pendingExecution = null;
      return { type: "none", counts, tie: true, executed: null };
    }

    room.voteRound = "runoff";
    room.voteCandidates = top;
    room.votes = {};
    room.voteEndsAt = Date.now() + 60 * 1000;
    room.phase = "voting";

    return {
      type: "runoff",
      counts,
      candidates: room.players
        .filter((p) => top.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))
    };
  }

  // Мэр подтвердил казнь выбранного городом кандидата
  executePending(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || !room.pendingExecution) return null;

    const p = room.players.find((x) => x.id === room.pendingExecution.id);
    if (!p) return null;

    p.alive = false;
    // Роль включена намеренно — это единственный момент, когда её
    // законно раскрыть: игрок только что казнён по итогам голосования.
    const info = { id: p.id, name: p.name, role: p.role };
    room.pendingExecution = null;
    room.phase = "vote_result";
    return info;
  }

  checkWin(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;

    const alive = room.players.filter((p) => p.alive);
    const mafia = alive.filter(
      (p) => p.role === "mafia" || p.role === "otez"
    );
    const manyak = alive.filter((p) => p.role === "manyak");
    const potro = alive.filter((p) => p.role === "potroshitel");
    const town = alive.filter(
      (p) =>
        !["mafia", "otez", "manyak", "potroshitel"].includes(p.role)
    );

    if (
      manyak.length === 1 &&
      mafia.length === 0 &&
      potro.length === 0 &&
      town.length <= 1
    ) {
      return { winner: "manyak", label: "Маньяк" };
    }

    if (
      manyak.length >= 1 &&
      mafia.length >= 1 &&
      town.length === 0
    ) {
      return { winner: "draw", label: "Ничья (мафия и маньяк)" };
    }

    if (
      mafia.length === 0 &&
      manyak.length === 0 &&
      potro.length === 0 &&
      town.length > 0
    ) {
      return { winner: "town", label: "Мирные жители" };
    }

    if (
      mafia.length >= town.length &&
      manyak.length === 0 &&
      potro.length === 0
    ) {
      return { winner: "mafia", label: "Мафия" };
    }

    if (
      potro.length === 1 &&
      mafia.length === 0 &&
      manyak.length === 0 &&
      town.length <= 1
    ) {
      return { winner: "potroshitel", label: "Потрошитель" };
    }

    return null;
  }

  mayorKill(roomCode, targetId, reason) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;
    const p = room.players.find((x) => x.id === targetId);
    if (!p) return null;
    p.alive = false;
    return { id: p.id, name: p.name, reason: reason || "" };
  }

  mayorForceWin(roomCode, side, reason) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;
    room.phase = "ended";
    room.winner = { side, reason };
    return room.winner;
  }
}

module.exports = new GameFlowManager();