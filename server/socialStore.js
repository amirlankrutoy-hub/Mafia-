// socialStore.js — постоянное хранилище сервера (профили, друзья, заявки,
// баны, отключённые роли, общая статистика).
//
// Файл лежит в DATA_DIR (по умолчанию server/data). На Railway файловая
// система контейнера стирается при каждом деплое — чтобы друзья и рейтинг
// не пропадали, подключите Volume и укажите DATA_DIR=/data (путь монтирования).
//
// Запись на диск — отложенная и атомарная (через временный файл), чтобы
// частые обновления профилей не блокировали сервер и не портили файл.

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "social.json");
const SAVE_DELAY_MS = 1500;

const EMPTY = () => ({
  accountProfiles: {},
  friends: {},
  friendRequests: {},
  bans: {},
  disabledRoles: {},
  adminTokens: {},
  stats: { gamesPlayed: 0, roomsCreated: 0 }
});

let state = null;
let saveTimer = null;

function load() {
  if (state) return state;
  state = EMPTY();
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    for (const key of Object.keys(state)) {
      if (data[key] && typeof data[key] === "object") {
        state[key] = { ...state[key], ...data[key] };
      }
    }
    // Старый формат заявок ({ toId: { fromId: {...} } } или массивы) — приводим к массиву
    for (const [to, list] of Object.entries(state.friendRequests)) {
      if (!Array.isArray(list)) state.friendRequests[to] = [];
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("⚠️ Не удалось прочитать social.json, начинаем с пустого:", err.message);
    }
  }
  return state;
}

function flush() {
  if (!state) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state), "utf8");
    fs.renameSync(tmp, FILE);
  } catch (err) {
    console.error("⚠️ Не удалось сохранить social.json:", err.message);
  }
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flush();
  }, SAVE_DELAY_MS);
}

function flushNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  flush();
}

module.exports = { load, save, flushNow, DATA_DIR };
