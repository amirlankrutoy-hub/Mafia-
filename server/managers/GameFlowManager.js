const RoomManager = require("./RoomManager");
const RoleManager = require("./RoleManager");
const NIGHT_ORDER = require("./NightOrder");

// Категории ролей — для победы, "Игрока матча" и сведений Стукача.
const ROLE_CATEGORY = {
  doctor: "civilians",
  krasotka: "civilians",
  obivatel: "civilians",
  sherif: "civilians",
  sveshennik: "civilians",
  mafia: "mafia",
  otez: "mafia",
  vor: "mafia",
  manyak: "neutrals",
  potroshitel: "neutrals",
  poklon: "neutrals",
  stukach: "neutrals"
};

const ROLE_NAMES = {
  doctor: "Доктор",
  krasotka: "Красотка",
  mafia: "Мафиози",
  manyak: "Маньяк",
  obivatel: "Обыватель",
  otez: "Крёстный отец",
  poklon: "Поклонница",
  potroshitel: "Потрошитель",
  sherif: "Шериф",
  stukach: "Стукач",
  sveshennik: "Священник",
  vor: "Вор"
};

const FACTION_NAMES = {
  civilians: "мирных жителей",
  mafia: "мафии",
  neutrals: "нейтралов"
};

const MAFIA_ROLES = ["mafia", "otez", "vor"];
const isMafia = (p) => MAFIA_ROLES.includes(p.role);

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

const VOTE_MAIN_MS = 3 * 60 * 1000;
const VOTE_RUNOFF_MS = 60 * 1000;

const roleName = (role) => ROLE_NAMES[role] || role;
const randomPhrase = () => NIGHT_PHRASES[Math.floor(Math.random() * NIGHT_PHRASES.length)];

class GameFlowManager {
  constructor() {
    this.ROLE_CATEGORY = ROLE_CATEGORY;
    this.ROLE_NAMES = ROLE_NAMES;
  }

  startGame(roomCode, disabledRoles) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;

    RoleManager.assignRoles(roomCode, disabledRoles);

    room.gameId = (room.gameId || 0) + 1;
    room.started = true;
    room.phase = "waiting_ready";
    room.day = 0;
    room.night = 0;
    room.nightActions = {};
    room.votes = {};
    room.blockedVotes = [];
    room.nightResults = [];
    room.matchStats = {}; // ключ — имя игрока (переживает переподключение)
    room.players.forEach((p) => {
      p.alive = true;
      p.readyForGame = false;
      p.linkedTo = null;
      p.helped = null;
    });

    return room;
  }

  // Статистика игрока по имени — id меняется при переподключении.
  statFor(room, name) {
    if (!room.matchStats) room.matchStats = {};
    if (!name) return {};
    if (!room.matchStats[name]) {
      room.matchStats[name] = {
        kills: 0,
        blocks: 0,
        correctVotes: 0,
        healedSomeone: false,
        sherifSuccess: false,
        priestSuccess: false,
        seduced: false,
        stukachKnown: []
      };
    }
    return room.matchStats[name];
  }

  nameOf(room, socketId) {
    const p = room.players.find((pl) => pl.id === socketId);
    return p ? p.name : null;
  }

  setPlayerGameReady(roomCode, socketId) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase !== "waiting_ready") return { success: false };

    const player = room.players.find((p) => p.id === socketId);
    if (!player || !player.alive) return { success: false };

    player.readyForGame = true;

    const alive = room.players.filter((p) => p.alive && p.connected !== false);
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

  stepActors(room, step) {
    return room.players.filter(
      (p) =>
        p.alive &&
        (p.role === step.role || (step.withRoles || []).includes(p.role))
    );
  }

  // Цели для хода: живые игроки, кроме себя (Доктор может лечить себя).
  // Мафия не выбирает своих — члены семьи знают друг друга.
  // Потрошителю показываем всех: если он выберет обывателя, удар просто
  // не удастся (иначе по "дыркам" в списке было бы видно, кто обыватель).
  getTargets(room, step, actors) {
    const actorIds = new Set(actors.map((a) => a.id));
    let list = room.players.filter((p) => p.alive);
    if (!step.selfTarget) list = list.filter((p) => !actorIds.has(p.id));
    if (step.role === "mafia") list = list.filter((p) => !isMafia(p));
    return list.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }));
  }

  advanceNightStep(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase !== "night") return null;

    let idx = (room.nightStepIndex ?? -1) + 1;

    while (idx < NIGHT_ORDER.length) {
      const step = NIGHT_ORDER[idx];
      const actors = this.stepActors(room, step);

      if (actors.length > 0) {
        room.nightStepIndex = idx;
        room.currentNightRole = step.role;
        const publicStep = {
          role: step.role,
          label: step.label,
          hint: step.hint,
          modes: step.modes || null,
          teamAction: !!step.teamAction
        };
        return {
          phase: "night",
          step: publicStep,
          actors: actors.map((a) => ({ id: a.id, name: a.name, avatar: a.avatar })),
          targets: this.getTargets(room, step, actors),
          phrase: randomPhrase()
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
      return { success: false, message: "Сейчас не ночь" };
    }

    const step = NIGHT_ORDER[room.nightStepIndex];
    if (!step) return { success: false };

    const actors = this.stepActors(room, step);
    const player = actors.find((p) => p.id === socketId);
    if (!player) return { success: false, message: "Не ваш ход" };

    const targets = this.getTargets(room, step, actors);
    if (!targets.some((t) => t.id === payload.targetId)) {
      return { success: false, message: "Эту цель выбрать нельзя" };
    }

    let mode = null;
    if (step.modes) {
      mode = payload.mode;
      if (!step.modes.some((m) => m.id === mode)) {
        return { success: false, message: "Выберите действие" };
      }
    }

    const key = step.role;
    if (!room.nightActions[key]) room.nightActions[key] = [];
    const list = room.nightActions[key];
    if (list.some((a) => a.by === socketId)) {
      return { success: false, message: "Вы уже сделали выбор" };
    }

    list.push({ by: socketId, role: player.role, targetId: payload.targetId, mode });

    // Ход закончен, когда выбор сделали все, кто ходит на этом шаге
    // (у мафии — вся семья; у остальных — все игроки этой роли).
    const done = actors.every((a) => list.some((x) => x.by === a.id));
    if (!done) {
      return { success: true, waiting: true, step: key };
    }

    return {
      success: true,
      waiting: false,
      step: key,
      next: this.advanceNightStep(roomCode)
    };
  }

  // Мэр пропускает ход (например, игрок ушёл от экрана)
  skipNightStep(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase !== "night") return null;
    return this.advanceNightStep(roomCode);
  }

  // Жертва мафии одна на всю семью: решает большинство. При равенстве —
  // выбор Крёстного отца, если он среди лидеров, иначе случайный из лидеров.
  mafiaTarget(room) {
    const votes = room.nightActions.mafia || [];
    if (!votes.length) return null;
    const counts = {};
    votes.forEach((v) => (counts[v.targetId] = (counts[v.targetId] || 0) + 1));
    const max = Math.max(...Object.values(counts));
    const leaders = Object.keys(counts).filter((id) => counts[id] === max);
    if (leaders.length === 1) return leaders[0];
    const godfatherVote = votes.find((v) => v.role === "otez");
    if (godfatherVote && leaders.includes(godfatherVote.targetId)) {
      return godfatherVote.targetId;
    }
    if (!room._mafiaTieBreak || room._mafiaTieBreak.night !== room.night) {
      room._mafiaTieBreak = {
        night: room.night,
        target: leaders[Math.floor(Math.random() * leaders.length)]
      };
    }
    return room._mafiaTieBreak.target;
  }

  // Подсчёт итогов ночи. apply=false — только предпросмотр для мэра, без
  // изменения состояния игры (раньше предпросмотр и утро считались дважды,
  // и статистика/блокировки голосов задваивались).
  resolveNight(roomCode, apply = true) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return [];

    const actions = room.nightActions || {};
    const byId = (id) => room.players.find((p) => p.id === id);
    const results = [];
    const attacks = {}; // targetId -> [{ source, by }]

    const addAttack = (targetId, source, by) => {
      if (!targetId) return;
      (attacks[targetId] = attacks[targetId] || []).push({ source, by });
    };

    // --- Нападения ---
    const mafiaVictim = this.mafiaTarget(room);
    if (mafiaVictim) {
      (actions.mafia || [])
        .filter((a) => a.targetId === mafiaVictim)
        .forEach((a) => addAttack(mafiaVictim, "mafia", a.by));
    }
    (actions.manyak || []).forEach((a) => addAttack(a.targetId, "manyak", a.by));
    (actions.sherif || []).forEach((a) => addAttack(a.targetId, "sherif", a.by));
    (actions.sveshennik || [])
      .filter((a) => a.mode === "kill")
      .forEach((a) => addAttack(a.targetId, "sveshennik", a.by));

    // Потрошитель не может убить обывателя — удар не удаётся
    (actions.potroshitel || []).forEach((a) => {
      const t = byId(a.targetId);
      if (t && t.role === "obivatel") {
        results.push({
          type: "private",
          privateTo: [a.by],
          text: `Рука не поднялась: ${t.name} — простой обыватель. Убить его вы не можете.`
        });
        return;
      }
      addAttack(a.targetId, "potroshitel", a.by);
    });

    // --- Красотка: если на неё напали, погибает соблазнённый ---
    (actions.krasotka || []).forEach((a) => {
      const krasotka = byId(a.by);
      const seduced = byId(a.targetId);
      if (!krasotka || !seduced) return;
      if (apply) this.statFor(room, krasotka.name).seduced = true;
      const onHer = attacks[krasotka.id];
      if (onHer && onHer.length) {
        delete attacks[krasotka.id];
        attacks[seduced.id] = [
          ...(attacks[seduced.id] || []),
          ...onHer.map((atk) => ({ ...atk, redirected: true }))
        ];
        results.push({
          type: "private",
          privateTo: [krasotka.id],
          text: `На вас напали этой ночью, но удар принял ${seduced.name}.`
        });
      }
    });

    // --- Лечение ---
    const healed = new Set((actions.doctor || []).map((a) => a.targetId));
    (room.abilityEffects?.nightImmune || []).forEach((id) => healed.add(id));

    const deaths = [];
    Object.keys(attacks).forEach((tid) => {
      const target = byId(tid);
      if (!target || !target.alive) return;
      const sources = attacks[tid];

      if (healed.has(tid)) {
        results.push({
          type: "saved",
          playerId: tid,
          name: target.name,
          text: `${target.name} был спасён этой ночью`
        });
        if (apply) {
          (actions.doctor || [])
            .filter((a) => a.targetId === tid)
            .forEach((a) => {
              const n = this.nameOf(room, a.by);
              if (n) this.statFor(room, n).healedSomeone = true;
            });
        }
        return;
      }

      const primary = sources[0];
      const killedBy = primary.redirected ? "krasotka_redirect" : primary.source;
      deaths.push(target);
      results.push({
        type: "death",
        playerId: tid,
        name: target.name,
        role: target.role,
        text: `${target.name} погиб этой ночью`,
        killedBy
      });

      if (apply) {
        sources.forEach((s) => {
          const n = this.nameOf(room, s.by);
          if (n) this.statFor(room, n).kills += 1;
        });
        if (isMafia(target)) {
          (actions.sherif || [])
            .filter((a) => a.targetId === tid)
            .forEach((a) => {
              const n = this.nameOf(room, a.by);
              if (n) this.statFor(room, n).sherifSuccess = true;
            });
        }
        if (["mafia", "neutrals"].includes(ROLE_CATEGORY[target.role])) {
          (actions.sveshennik || [])
            .filter((a) => a.mode === "kill" && a.targetId === tid)
            .forEach((a) => {
              const n = this.nameOf(room, a.by);
              if (n) this.statFor(room, n).priestSuccess = true;
            });
        }
      }
    });

    // --- Блокировка голосов: Крёстный отец и Вор ---
    const blocked = new Set();
    [
      ["otez", "лишён голоса Крёстным отцом"],
      ["vor", "лишён голоса — Вор украл его голос"]
    ].forEach(([role, label]) => {
      (actions[role] || []).forEach((a) => {
        const t = byId(a.targetId);
        if (!t) return;
        blocked.add(t.id);
        if (apply) {
          const n = this.nameOf(room, a.by);
          if (n) this.statFor(room, n).blocks += 1;
        }
        results.push({
          type: "block",
          playerId: t.id,
          name: t.name,
          text: `${t.name} ${label}`
        });
      });
    });

    // --- Священник: проверка ---
    (actions.sveshennik || [])
      .filter((a) => a.mode === "check")
      .forEach((a) => {
        const t = byId(a.targetId);
        if (!t) return;
        if (apply && ["mafia", "neutrals"].includes(ROLE_CATEGORY[t.role])) {
          const n = this.nameOf(room, a.by);
          if (n) this.statFor(room, n).priestSuccess = true;
        }
        results.push({
          type: "check",
          privateTo: [a.by],
          playerId: t.id,
          name: t.name,
          role: t.role,
          text: `Проверка: ${t.name} — ${roleName(t.role)}`
        });
      });

    // --- Поклонница: узнаёт роль и что делал избранник этой ночью ---
    (actions.poklon || []).forEach((a) => {
      const t = byId(a.targetId);
      if (!t) return;
      const did = Object.values(actions)
        .flat()
        .find((x) => x.by === t.id);
      const visited = did ? byId(did.targetId) : null;
      const deed = visited ? `этой ночью ходил(а) к ${visited.name}` : "этой ночью никуда не ходил(а)";
      results.push({
        type: "link",
        privateTo: [a.by],
        playerId: t.id,
        name: t.name,
        role: t.role,
        text: `Ваш избранник ${t.name} — ${roleName(t.role)}, ${deed}.`
      });
      if (apply) {
        const fan = byId(a.by);
        if (fan) fan.linkedTo = t.id;
      }
    });

    // --- Стукач: узнаёт роль и передаёт сведения выбранной стороне ---
    (actions.stukach || []).forEach((a) => {
      const t = byId(a.targetId);
      const snitch = byId(a.by);
      if (!t || !snitch) return;
      const faction = FACTION_NAMES[ROLE_CATEGORY[t.role]] || "неизвестной стороны";

      results.push({
        type: "check",
        privateTo: [a.by],
        playerId: t.id,
        name: t.name,
        role: t.role,
        text: `Вы разузнали: ${t.name} — ${roleName(t.role)}. Сведения переданы ${a.mode === "mafia" ? "мафии" : "городу"}.`
      });

      if (a.mode === "mafia") {
        const family = room.players.filter((p) => p.alive && isMafia(p)).map((p) => p.id);
        if (family.length) {
          results.push({
            type: "private",
            privateTo: family,
            text: `Стукач донёс семье: ${t.name} играет за ${faction}.`
          });
        }
      } else {
        results.push({
          type: "info",
          text: `Анонимный донос: ${t.name} играет за ${faction}.`
        });
      }

      if (apply) {
        const helped = snitch.helped || { town: 0, mafia: 0, last: null };
        const side = a.mode === "mafia" ? "mafia" : "town";
        helped[side] += 1;
        helped.last = side;
        snitch.helped = helped;
        const stat = this.statFor(room, snitch.name);
        if (!stat.stukachKnown.some((k) => k.id === t.id)) {
          stat.stukachKnown.push({ id: t.id, role: t.role });
        }
      }
    });

    if (apply) {
      deaths.forEach((p) => (p.alive = false));
      room.blockedVotes = [...blocked];
      room.nightResults = results;
      room.phase = "morning";
      room.day += 1;
    }
    return results;
  }

  beginVoting(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room) return null;

    room.phase = "voting";
    room.voteRound = "main";
    room.votes = {};
    room.pendingExecution = null;
    room.voteCandidates = room.players.filter((p) => p.alive).map((p) => p.id);
    room.voteEndsAt = Date.now() + VOTE_MAIN_MS;

    return this.votingSnapshot(room);
  }

  votingSnapshot(room) {
    const voters = room.players.filter(
      (p) => p.alive && !(room.blockedVotes || []).includes(p.id)
    );
    return {
      round: room.voteRound,
      endsAt: room.voteEndsAt,
      candidates: room.players
        .filter((p) => (room.voteCandidates || []).includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })),
      blockedVoters: room.blockedVotes || [],
      votedCount: Object.keys(room.votes || {}).length,
      votersTotal: voters.length
    };
  }

  castVote(roomCode, socketId, targetId) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase !== "voting") return { success: false, message: "Голосование не идёт" };

    if ((room.blockedVotes || []).includes(socketId)) {
      return { success: false, message: "Ваш голос заблокирован" };
    }

    const voter = room.players.find((p) => p.id === socketId && p.alive);
    if (!voter) return { success: false, message: "Вы не можете голосовать" };

    if (!room.voteCandidates.includes(targetId)) {
      return { success: false, message: "Недопустимая цель" };
    }

    if ((room.abilityEffects?.voteImmune || []).includes(targetId)) {
      return { success: false, message: "За этого игрока нельзя голосовать в этом раунде" };
    }

    room.votes[socketId] = targetId;
    const snap = this.votingSnapshot(room);
    return {
      success: true,
      votedCount: snap.votedCount,
      votersTotal: snap.votersTotal,
      allVoted: snap.votedCount >= snap.votersTotal
    };
  }

  tallyVotes(room) {
    const counts = {};
    room.voteCandidates.forEach((id) => (counts[id] = 0));
    const weights = room.abilityEffects?.extraVoteWeight || {};
    const muted = room.abilityEffects?.muted || [];
    Object.entries(room.votes).forEach(([voterId, tid]) => {
      if (muted.includes(voterId)) return;
      if (tid != null && counts[tid] != null) {
        counts[tid] += weights[voterId] || 1;
      }
    });
    return counts;
  }

  // Итог раунда голосования:
  // - один явный лидер -> мэр подтверждает казнь ("pending")
  // - ничья в первый раз -> переголосование среди лидеров (1 минута)
  // - ничья второй раз -> никто не казнён
  finishVoting(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase !== "voting") return null;

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
      room.pendingExecution = p ? { id: p.id, name: p.name, votes: max } : null;
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
    room.voteEndsAt = Date.now() + VOTE_RUNOFF_MS;
    room.phase = "voting";

    return {
      type: "runoff",
      counts,
      candidates: room.players
        .filter((p) => top.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))
    };
  }

  // Мэр подтвердил (или помиловал) кандидата, выбранного городом
  executePending(roomCode, pardon = false) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || room.phase !== "vote_pending" || !room.pendingExecution) return null;

    const p = room.players.find((x) => x.id === room.pendingExecution.id);
    room.pendingExecution = null;
    room.phase = "vote_result";
    if (!p) return null;
    if (pardon) return { pardoned: true, id: p.id, name: p.name };

    p.alive = false;

    // Статистика: мирные, правильно проголосовавшие против не-мирного
    if (ROLE_CATEGORY[p.role] !== "civilians") {
      Object.entries(room.votes || {}).forEach(([voterId, targetId]) => {
        if (targetId !== p.id) return;
        const voter = room.players.find((x) => x.id === voterId);
        if (voter && ROLE_CATEGORY[voter.role] === "civilians") {
          this.statFor(room, voter.name).correctVotes += 1;
        }
      });
    }

    return { id: p.id, name: p.name, role: p.role };
  }

  checkWin(roomCode) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || !room.started) return null;

    const alive = room.players.filter((p) => p.alive);
    const mafia = alive.filter(isMafia).length;
    const manyak = alive.filter((p) => p.role === "manyak").length;
    const potro = alive.filter((p) => p.role === "potroshitel").length;
    const others = alive.length - mafia - manyak - potro;
    const killerSides = [mafia, manyak, potro].filter((n) => n > 0).length;

    if (alive.length === 0) {
      return { winner: "draw", label: "Ничья — в городе не осталось никого" };
    }
    if (killerSides === 0) {
      return { winner: "town", label: "Мирные жители" };
    }
    if (killerSides === 1) {
      if (mafia > 0 && mafia >= others) return { winner: "mafia", label: "Мафия" };
      if (manyak > 0 && others <= manyak) return { winner: "manyak", label: "Маньяк" };
      if (potro > 0 && others <= potro) return { winner: "potroshitel", label: "Потрошитель" };
      return null;
    }
    // Несколько враждующих убийц и никого больше — ничья
    if (others === 0) {
      return { winner: "draw", label: "Ничья — убийцы перебили друг друга" };
    }
    return null;
  }

  // Кто из игроков победил (socket id). Поклонница побеждает, если дожила
  // до конца вместе с избранником; Стукач — вместе со стороной, которой
  // помогал чаще (при равенстве — последней).
  getWinners(roomCode, win) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || !win) return [];
    const side = win.winner;
    const ids = new Set();

    room.players.forEach((p) => {
      const cat = ROLE_CATEGORY[p.role];
      if (side === "town" && cat === "civilians") ids.add(p.id);
      if (side === "mafia" && cat === "mafia") ids.add(p.id);
      if ((side === "manyak" || side === "potroshitel") && p.role === side) ids.add(p.id);
      if (side === "neutral" && (p.role === "manyak" || p.role === "potroshitel")) ids.add(p.id);

      if (p.role === "stukach" && p.helped) {
        const fav =
          p.helped.town === p.helped.mafia
            ? p.helped.last
            : p.helped.town > p.helped.mafia
            ? "town"
            : "mafia";
        if (fav === side) ids.add(p.id);
      }

      if (p.role === "poklon" && p.alive && p.linkedTo && side !== "draw") {
        const t = room.players.find((x) => x.id === p.linkedTo);
        if (t && t.alive) ids.add(p.id);
      }
    });

    return [...ids];
  }

  // "Игрок матча" по итогам победы
  getMVP(roomCode, win) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || !win) return null;

    const totalPlayers = room.players.length;
    const stat = (p) => (room.matchStats && room.matchStats[p.name]) || {};
    const pack = (p) => ({ id: p.id, name: p.name, avatar: p.avatar, role: p.role, accountId: p.accountId || null });

    // 1) Поклонница выжила вместе со своим избранником
    const poklon = room.players.find((p) => p.role === "poklon");
    if (poklon && poklon.alive && poklon.linkedTo) {
      const target = room.players.find((p) => p.id === poklon.linkedTo);
      if (target && target.alive) return pack(poklon);
    }

    // 2) Стукач узнал всю мафию, либо 50% жителей, либо всех остальных нейтралов
    const stukach = room.players.find((p) => p.role === "stukach");
    if (stukach) {
      const knownIds = new Set((stat(stukach).stukachKnown || []).map((k) => k.id));
      const mafiaAll = room.players.filter(isMafia);
      const civilAll = room.players.filter((p) => ROLE_CATEGORY[p.role] === "civilians");
      const neutralsOther = room.players.filter(
        (p) => ROLE_CATEGORY[p.role] === "neutrals" && p.id !== stukach.id
      );
      const knowsAllMafia = mafiaAll.length > 0 && mafiaAll.every((p) => knownIds.has(p.id));
      const knowsHalfCivilians =
        civilAll.length > 0 &&
        civilAll.filter((p) => knownIds.has(p.id)).length >= Math.ceil(civilAll.length * 0.5);
      const knowsAllOtherNeutrals =
        neutralsOther.length > 0 && neutralsOther.every((p) => knownIds.has(p.id));
      if (knowsAllMafia || knowsHalfCivilians || knowsAllOtherNeutrals) return pack(stukach);
    }

    // 3) По фракции-победителю
    if (win.winner === "mafia") {
      const mafiaTeam = room.players.filter(isMafia);
      const godfather = mafiaTeam.find((p) => p.role === "otez");
      const killThreshold = totalPlayers * 0.75;
      const blockThreshold = totalPlayers * 0.8;

      let best = null;
      let bestKills = -1;
      mafiaTeam.forEach((p) => {
        const k = stat(p).kills || 0;
        if (k > bestKills) {
          bestKills = k;
          best = p;
        }
      });

      const gfKills = godfather ? stat(godfather).kills || 0 : 0;
      const gfBlocks = godfather ? stat(godfather).blocks || 0 : 0;
      const gfQualifies = godfather && (gfBlocks >= blockThreshold || gfKills >= killThreshold);
      if (gfQualifies) return pack(godfather);
      if (best) return pack(best);
    }

    if (win.winner === "manyak" || win.winner === "potroshitel") {
      const p = room.players.find((pl) => pl.role === win.winner);
      if (p) return pack(p);
    }

    if (win.winner === "town") {
      const townPlayers = room.players.filter((p) => ROLE_CATEGORY[p.role] === "civilians");
      const withRoleAchievement = townPlayers.filter((p) => {
        const s = stat(p);
        if (p.role === "sherif") return !!s.sherifSuccess;
        if (p.role === "doctor") return !!s.healedSomeone;
        if (p.role === "krasotka") return !!s.seduced && p.alive;
        if (p.role === "sveshennik") return !!s.priestSuccess;
        return false;
      });
      const pool =
        withRoleAchievement.length > 0
          ? withRoleAchievement
          : townPlayers.filter((p) => (stat(p).correctVotes || 0) > 0);
      if (pool.length > 0) return pack(pool[Math.floor(Math.random() * pool.length)]);
    }

    return null;
  }

  mayorKill(roomCode, targetId, reason) {
    const room = RoomManager.getRoom(roomCode);
    if (!room || !room.started) return null;
    const p = room.players.find((x) => x.id === targetId && x.alive);
    if (!p) return null;
    p.alive = false;
    return { id: p.id, name: p.name, role: p.role, reason: reason || "" };
  }
}

module.exports = new GameFlowManager();
