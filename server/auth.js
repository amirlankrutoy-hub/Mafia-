// auth.js — вход через Google и по электронной почте + облачное сохранение
// прогресса. Раньше аккаунт жил только в localStorage браузера: очистка
// данных сайта или другой телефон = новый аккаунт с нуля. Теперь аккаунт
// можно привязать к Google/почте и восстановить на любом устройстве.

const crypto = require("crypto");

const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS_PER_ACCOUNT = 15;
const MAX_SAVE_BYTES = 80 * 1024;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
    return { salt, hash };
}

function checkPassword(password, rec) {
    if (!rec?.salt || !rec?.hash) return false;
    const { hash } = hashPassword(password, rec.salt);
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(rec.hash, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const normEmail = (e) => String(e || "").trim().toLowerCase().slice(0, 254);

async function verifyGoogleToken(credential) {
    if (!GOOGLE_CLIENT_ID) return { ok: false, message: "Вход через Google ещё не настроен" };
    if (typeof credential !== "string" || credential.length > 5000) return { ok: false, message: "Неверный ответ Google" };
    try {
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (!res.ok) return { ok: false, message: "Google не подтвердил вход" };
        const info = await res.json();
        const issOk = info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com";
        if (info.aud !== GOOGLE_CLIENT_ID || !issOk || !info.sub) return { ok: false, message: "Google не подтвердил вход" };
        if (Number(info.exp) * 1000 < Date.now()) return { ok: false, message: "Срок входа истёк, попробуйте ещё раз" };
        return { ok: true, sub: String(info.sub), email: normEmail(info.email), name: info.given_name || info.name || "" };
    } catch (err) {
        console.error("⚠️ Проверка Google:", err.message);
        return { ok: false, message: "Не удалось связаться с Google" };
    }
}

function createAuth({ db, store, on, ack, ensureProfile, profileOf, validateName, isAccountId, cleanName }) {
    db.authEmails = db.authEmails || {}; // email -> { id, salt, hash }
    db.authGoogle = db.authGoogle || {}; // google sub -> id
    db.authSessions = db.authSessions || {}; // token -> { id, at, seen }
    db.authLinks = db.authLinks || {}; // id -> { email?, google?, googleEmail? }

    const links = (id) => db.authLinks[id] || null;
    const isLinked = (id) => {
        const l = links(id);
        return !!(l && (l.email || l.google));
    };

    function newAccountId() {
        let id;
        do id = String(Math.floor(100000 + Math.random() * 900000));
        while (db.accountProfiles[id] || db.authLinks[id]);
        return id;
    }

    function uniqueName(base, id) {
        let name = cleanName(base).replace(/[^\p{L}\p{N} _.-]/gu, "").slice(0, 16) || "Игрок";
        if (name.length < 2) name = "Игрок";
        if (validateName(name, id).ok) return name;
        for (let i = 0; i < 50; i++) {
            const candidate = `${name.slice(0, 14)}${Math.floor(10 + Math.random() * 990)}`;
            if (validateName(candidate, id).ok) return candidate;
        }
        return `Игрок${id}`;
    }

    function issueSession(id) {
        const token = crypto.randomBytes(32).toString("hex");
        const now = Date.now();
        db.authSessions[token] = { id, at: now, seen: now };
        // не копим бесконечно: оставляем последние сессии аккаунта
        const mine = Object.entries(db.authSessions)
            .filter(([, s]) => s.id === id)
            .sort((a, b) => b[1].seen - a[1].seen);
        mine.slice(MAX_SESSIONS_PER_ACCOUNT).forEach(([t]) => delete db.authSessions[t]);
        return token;
    }

    function sessionAccount(token) {
        if (typeof token !== "string" || token.length !== 64) return null;
        const s = db.authSessions[token];
        if (!s) return null;
        if (Date.now() - s.seen > SESSION_TTL_MS) {
            delete db.authSessions[token];
            return null;
        }
        s.seen = Date.now();
        return s.id;
    }

    /** Может ли сокет назваться этим аккаунтом. Привязанные — только с токеном. */
    function canUseAccount(id, token) {
        if (!isLinked(id)) return true;
        return sessionAccount(token) === id;
    }

    // ---------- облачное сохранение ----------
    async function loadSave(id) {
        try {
            return await store.getBlob(`save:${id}`);
        } catch (err) {
            console.error("⚠️ Чтение сохранения:", err.message);
            return null;
        }
    }

    function publicLinks(id) {
        const l = links(id) || {};
        return { email: l.email || null, google: !!l.google, googleEmail: l.googleEmail || null };
    }

    async function finishLogin(socket, id, method, done, extra = {}) {
        const prof = ensureProfile(id, extra.name);
        const token = issueSession(id);
        store.save();
        socket.data.authAccountId = id;
        const save = extra.fresh ? null : await loadSave(id);
        done({
            success: true,
            method,
            token,
            account: { id, name: prof.name, createdAt: prof.createdAt },
            links: publicLinks(id),
            save
        });
    }

    // Аккаунт, который можно привязать: гостевой, ещё не привязанный ни к чему
    function claimable(id) {
        return isAccountId(String(id || "")) && !isLinked(String(id));
    }

    function attempt(socket) {
        const now = Date.now();
        const a = (socket.data.authAttempts = (socket.data.authAttempts || []).filter((t) => now - t < 60000));
        a.push(now);
        return a.length <= 8;
    }

    function register(socket) {
        // обработчики асинхронные: ошибка не должна ронять сервер
        const handle = (event, fn) =>
            on(socket, event, (...args) => {
                const r = fn(...args);
                if (r && typeof r.catch === "function") {
                    r.catch((err) => {
                        console.error(`⚠️ Ошибка в "${event}":`, err);
                        const cb = args[args.length - 1];
                        if (typeof cb === "function") cb({ success: false, message: "Ошибка сервера. Попробуйте ещё раз." });
                    });
                }
            });
        handle("auth:config", (cb) => ack(cb)({ googleClientId: GOOGLE_CLIENT_ID || null }));

        // Регистрация по почте. claimId — текущий гостевой аккаунт: его прогресс сохраняется.
        handle("auth:email-register", async ({ email, password, name, claimId } = {}, cb) => {
            const done = ack(cb);
            if (!attempt(socket)) return done({ success: false, message: "Слишком много попыток. Подождите минуту." });
            const em = normEmail(email);
            if (!EMAIL_RE.test(em)) return done({ success: false, message: "Проверьте адрес почты" });
            if (String(password || "").length < 6) return done({ success: false, message: "Пароль — минимум 6 символов" });
            if (String(password).length > 100) return done({ success: false, message: "Слишком длинный пароль" });
            if (db.authEmails[em]) return done({ success: false, message: "Эта почта уже зарегистрирована — войдите" });

            const reuse = claimable(claimId) ? String(claimId) : null;
            const id = reuse || newAccountId();
            let finalName;
            if (reuse && profileOf(id)) finalName = profileOf(id).name;
            else {
                const check = validateName(name, id);
                if (!check.ok) return done({ success: false, message: check.message });
                finalName = check.name;
            }
            db.authEmails[em] = { id, ...hashPassword(password) };
            db.authLinks[id] = { ...(db.authLinks[id] || {}), email: em };
            await finishLogin(socket, id, "email", done, { name: finalName, fresh: true });
        });

        handle("auth:email-login", async ({ email, password } = {}, cb) => {
            const done = ack(cb);
            if (!attempt(socket)) return done({ success: false, message: "Слишком много попыток. Подождите минуту." });
            const rec = db.authEmails[normEmail(email)];
            if (!rec || !checkPassword(password, rec)) return done({ success: false, message: "Неверная почта или пароль" });
            await finishLogin(socket, rec.id, "email", done);
        });

        handle("auth:google", async ({ credential, claimId } = {}, cb) => {
            const done = ack(cb);
            if (!attempt(socket)) return done({ success: false, message: "Слишком много попыток. Подождите минуту." });
            const g = await verifyGoogleToken(credential);
            if (!g.ok) return done({ success: false, message: g.message });

            const existing = db.authGoogle[g.sub];
            if (existing) return finishLogin(socket, existing, "google", done);

            const reuse = claimable(claimId) ? String(claimId) : null;
            const id = reuse || newAccountId();
            const name = reuse && profileOf(id) ? profileOf(id).name : uniqueName(g.name || g.email.split("@")[0], id);
            db.authGoogle[g.sub] = id;
            db.authLinks[id] = { ...(db.authLinks[id] || {}), google: g.sub, googleEmail: g.email || null };
            await finishLogin(socket, id, "google", done, { name, fresh: !!reuse });
        });

        // Привязать Google/почту к уже вошедшему аккаунту (из настроек)
        handle("auth:link-google", async ({ credential, token } = {}, cb) => {
            const done = ack(cb);
            const id = sessionAccount(token) || (claimable(socket.data.accountId) ? socket.data.accountId : null);
            if (!id) return done({ success: false, message: "Сначала войдите в аккаунт" });
            const g = await verifyGoogleToken(credential);
            if (!g.ok) return done({ success: false, message: g.message });
            if (db.authGoogle[g.sub] && db.authGoogle[g.sub] !== id) {
                return done({ success: false, message: "Этот Google уже привязан к другому аккаунту" });
            }
            db.authGoogle[g.sub] = id;
            db.authLinks[id] = { ...(db.authLinks[id] || {}), google: g.sub, googleEmail: g.email || null };
            const newToken = token && sessionAccount(token) === id ? token : issueSession(id);
            store.save();
            done({ success: true, token: newToken, links: publicLinks(id) });
        });

        handle("auth:link-email", ({ email, password, token } = {}, cb) => {
            const done = ack(cb);
            const id = sessionAccount(token) || (claimable(socket.data.accountId) ? socket.data.accountId : null);
            if (!id) return done({ success: false, message: "Сначала войдите в аккаунт" });
            const em = normEmail(email);
            if (!EMAIL_RE.test(em)) return done({ success: false, message: "Проверьте адрес почты" });
            if (String(password || "").length < 6) return done({ success: false, message: "Пароль — минимум 6 символов" });
            if (db.authEmails[em] && db.authEmails[em].id !== id) return done({ success: false, message: "Эта почта уже занята" });
            const old = links(id)?.email;
            if (old && old !== em) delete db.authEmails[old];
            db.authEmails[em] = { id, ...hashPassword(password) };
            db.authLinks[id] = { ...(db.authLinks[id] || {}), email: em };
            const newToken = token && sessionAccount(token) === id ? token : issueSession(id);
            store.save();
            done({ success: true, token: newToken, links: publicLinks(id) });
        });

        // Проверка сохранённой сессии при открытии сайта
        handle("auth:resume", ({ token, accountId } = {}, cb) => {
            const done = ack(cb);
            const id = sessionAccount(token);
            if (id) {
                socket.data.authAccountId = id;
                return done({ success: true, account: { id, name: profileOf(id)?.name }, links: publicLinks(id) });
            }
            // токена нет/просрочен: гостю можно продолжать, привязанному — войти заново
            const acc = String(accountId || "");
            done({ success: false, needLogin: isAccountId(acc) && isLinked(acc) });
        });

        handle("auth:logout", ({ token } = {}, cb) => {
            if (typeof token === "string") delete db.authSessions[token];
            store.save();
            ack(cb)({ success: true });
        });

        handle("save:push", ({ token, data } = {}, cb) => {
            const done = ack(cb);
            const id = sessionAccount(token);
            if (!id) return done({ success: false });
            if (!data || typeof data !== "object" || Array.isArray(data)) return done({ success: false });
            const json = JSON.stringify(data);
            if (json.length > MAX_SAVE_BYTES) return done({ success: false, message: "Слишком большое сохранение" });
            store
                .setBlob(`save:${id}`, { ...data, _savedAt: Date.now() })
                .then(() => done({ success: true }))
                .catch((err) => {
                    console.error("⚠️ Запись сохранения:", err.message);
                    done({ success: false });
                });
        });

        handle("save:pull", async ({ token } = {}, cb) => {
            const done = ack(cb);
            const id = sessionAccount(token);
            if (!id) return done({ success: false });
            done({ success: true, save: await loadSave(id) });
        });
    }

    return { register, canUseAccount, isLinked, publicLinks };
}

module.exports = { createAuth };
