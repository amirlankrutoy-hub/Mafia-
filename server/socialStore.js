// socialStore.js — постоянное хранилище сервера (профили, друзья, заявки,
// баны, отключённые роли, общая статистика).
//
// Где хранится:
//  1) Upstash Redis (бесплатно, переживает перезапуски) — если заданы
//     UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN. Нужно для бесплатного
//     Render: там нет постоянного диска, и файлы стираются при каждом "засыпании".
//  2) Иначе — файл social.json в DATA_DIR (по умолчанию server/data).
//
// Запись — отложенная (раз в ~1.5 сек), чтобы частые обновления не тормозили сервер.

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "social.json");
const SAVE_DELAY_MS = 1500;

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const REDIS_KEY = process.env.UPSTASH_KEY || "mafia:social";
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

const EMPTY = () => ({
  accountProfiles: {},
  friends: {},
  friendRequests: {},
  bans: {},
  disabledRoles: {},
  adminTokens: {},
  stats: { gamesPlayed: 0, roomsCreated: 0 }
});

let state = EMPTY();
let saveTimer = null;
let saving = false;
let dirty = false;

function merge(data) {
  for (const key of Object.keys(state)) {
    if (data && data[key] && typeof data[key] === "object") {
      state[key] = { ...state[key], ...data[key] };
    }
  }
  for (const [to, list] of Object.entries(state.friendRequests)) {
    if (!Array.isArray(list)) state.friendRequests[to] = [];
  }
}

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

/** Загрузить данные при старте сервера (до приёма подключений) */
async function init() {
  if (useRedis) {
    try {
      const raw = await redis(["GET", REDIS_KEY]);
      if (raw) merge(JSON.parse(raw));
      console.log("💾 Данные загружены из Upstash Redis");
      return;
    } catch (err) {
      console.error("⚠️ Не удалось прочитать Upstash, используем файл:", err.message);
    }
  }
  try {
    merge(JSON.parse(fs.readFileSync(FILE, "utf8")));
    console.log("💾 Данные загружены из", FILE);
  } catch (err) {
    if (err.code !== "ENOENT") console.error("⚠️ Не удалось прочитать social.json:", err.message);
  }
}

function load() {
  return state;
}

function writeFile() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state), "utf8");
    fs.renameSync(tmp, FILE);
  } catch (err) {
    console.error("⚠️ Не удалось сохранить social.json:", err.message);
  }
}

async function flush() {
  if (!useRedis) return writeFile();
  if (saving) {
    dirty = true;
    return;
  }
  saving = true;
  try {
    await redis(["SET", REDIS_KEY, JSON.stringify(state)]);
  } catch (err) {
    console.error("⚠️ Не удалось сохранить в Upstash:", err.message);
    writeFile();
  } finally {
    saving = false;
    if (dirty) {
      dirty = false;
      save();
    }
  }
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flush();
  }, SAVE_DELAY_MS);
}

async function flushNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await flush();
}

const persistent = () => useRedis || !!process.env.DATA_DIR;

module.exports = { init, load, save, flushNow, persistent, DATA_DIR };
