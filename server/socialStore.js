// socialStore.js — сохраняет accountProfiles и friendRequests на диск,
// чтобы они не терялись при перезапуске сервера (раньше жили только в
// памяти — рестарт сервера стирал вообще все заявки в друзья и профили,
// это была одна из причин, почему заявки "терялись").
//
// presence (кто сейчас онлайн) НЕ сохраняется — это состояние по своей
// природе живёт только пока открыт сокет, восстанавливать его не нужно.

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "data", "social.json");

function readAll() {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const data = JSON.parse(raw);
    return {
      accountProfiles: data.accountProfiles || {},
      friendRequests: data.friendRequests || {}
    };
  } catch {
    return { accountProfiles: {}, friendRequests: {} };
  }
}

function writeAll(accountProfiles, friendRequests) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(
      FILE,
      JSON.stringify({ accountProfiles, friendRequests }, null, 2),
      "utf8"
    );
  } catch (err) {
    console.error("⚠️ Не удалось сохранить social.json:", err.message);
  }
}

module.exports = { readAll, writeAll };
