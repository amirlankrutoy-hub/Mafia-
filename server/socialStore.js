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

// Убираем пробелы и кавычки — их часто случайно вставляют вместе со значением
const cleanEnv = (v) => String(v || "").trim().replace(/^["']+|["']+$/g, "").trim();
let REDIS_URL = cleanEnv(process.env.UPSTASH_REDIS_REST_URL).replace(/\/$/, "");
if (REDIS_URL && !/^https?:\/\//.test(REDIS_URL)) REDIS_URL = "https://" + REDIS_URL;
const REDIS_TOKEN = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
const REDIS_KEY = process.env.UPSTASH_KEY || "mafia:social";
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

const EMPTY = () => ({
  accountProfiles: {},
  friends: {},
  friendRequests: {},
  bans: {},
  disabledRoles: {},
  adminTokens: {},
  adminLog: [], // журнал входов в админ-панель
  adminPassword: {}, // { salt, hash } — пароль, сменённый из панели (иначе ADMIN_PASSWORD)
  pendingGrants: {}, // accountId -> [выдачи админа, ждущие входа игрока]
  orders: {}, // заказы Токенов за звёзды Telegram
  pendingTopups: {}, // accountId -> [{ orderId, amount }] — ещё не доставлены на сайт
  supports: {}, // accountId -> { at, granted } — саппорты, назначенные админом
  reports: [], // сообщения саппортов администратору
  dms: {}, // "id1:id2" -> [{ from, text, at }] — личные сообщения друзей
  authEmails: {}, // почта -> { id, salt, hash }
  authGoogle: {}, // Google sub -> id
  authSessions: {}, // токен входа -> { id, at, seen }
  authLinks: {}, // id -> { email, google, googleEmail }
  stats: { gamesPlayed: 0, roomsCreated: 0, starsEarned: 0, topups: 0 }
});

let state = EMPTY();
let saveTimer = null;
let saving = false;
let dirty = false;

function merge(data) {
  for (const key of Object.keys(state)) {
    if (data && Array.isArray(data[key])) {
      state[key] = data[key];
    } else if (data && data[key] && typeof data[key] === "object") {
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
      // Первый запуск с пустой базой — переносим данные из старого файла
      if (!raw) {
        try {
          merge(JSON.parse(fs.readFileSync(FILE, "utf8")));
          save();
        } catch (_) {}
      }
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

// Отдельные записи (облачные сохранения игроков) — не раздувают общий документ
const blobFile = (key) => path.join(DATA_DIR, "blobs", key.replace(/[^\w.-]/g, "_") + ".json");

async function getBlob(key) {
  if (useRedis) {
    const raw = await redis(["GET", `mafia:${key}`]);
    return raw ? JSON.parse(raw) : null;
  }
  try {
    return JSON.parse(fs.readFileSync(blobFile(key), "utf8"));
  } catch {
    return null;
  }
}

async function setBlob(key, value) {
  const json = JSON.stringify(value);
  if (useRedis) {
    await redis(["SET", `mafia:${key}`, json]);
    return;
  }
  fs.mkdirSync(path.join(DATA_DIR, "blobs"), { recursive: true });
  fs.writeFileSync(blobFile(key), json, "utf8");
}

module.exports = { init, load, save, flushNow, persistent, DATA_DIR, getBlob, setBlob };
