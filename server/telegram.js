// telegram.js — Telegram-бот (@mafia_users_bot) и оплата Токенов звёздами (Telegram Stars).
//
// Как работает оплата:
//  1. Игрок на сайте выбирает пакет -> сервер создаёт заказ и счёт (createInvoiceLink, валюта XTR).
//  2. Игрок оплачивает счёт в Telegram.
//  3. Telegram присылает на вебхук сервера pre_checkout_query (сервер подтверждает заказ),
//     затем successful_payment — только после этого Токены зачисляются на аккаунт.
//
// Переменные окружения:
//  TELEGRAM_BOT_TOKEN — токен бота от @BotFather (обязательно)
//  PUBLIC_URL         — публичный адрес сервера (на Render берётся RENDER_EXTERNAL_URL автоматически)
//  SITE_URL           — адрес сайта для кнопки "Открыть игру"

const crypto = require("crypto");

const cleanEnv = (v) => String(v || "").trim().replace(/^["']+|["']+$/g, "").trim();

const TOKEN = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
const API_BASE = cleanEnv(process.env.TELEGRAM_API_BASE) || "https://api.telegram.org";
const PUBLIC_URL = cleanEnv(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL).replace(/\/$/, "");
const SITE_URL = cleanEnv(process.env.SITE_URL) || "https://mafia-play-n.vercel.app";
const SUPPORT = cleanEnv(process.env.SUPPORT_CONTACT) || "@Amir4k_Nurmatov";
// Секрет вебхука выводится из токена — чужие запросы на адрес вебхука отклоняются
const WEBHOOK_SECRET = TOKEN ? crypto.createHash("sha256").update(TOKEN).digest("hex").slice(0, 48) : "";

// Цены пакетов — ТОЛЬКО здесь, на сервере (сайт лишь показывает их)
const PACKAGES = {
  coins_999: { amount: 999, stars: 50 },
  coins_3000: { amount: 3000, stars: 100 },
  coins_7000: { amount: 7000, stars: 200 },
  coins_10000: { amount: 10000, stars: 350 }
};

const enabled = () => !!TOKEN;

async function api(method, body) {
  const res = await fetch(`${API_BASE}/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`);
  return data.result;
}

function invoiceParams(order) {
  return {
    title: `${order.amount.toLocaleString("ru-RU")} Токенов`,
    description: `Пополнение аккаунта #${order.accountId} в Mafia Play`,
    payload: order.id,
    currency: "XTR",
    prices: [{ label: `${order.amount} Токенов`, amount: order.stars }],
    photo_url: `${SITE_URL}/logo.png`,
    photo_width: 512,
    photo_height: 512
  };
}

/**
 * ctx — функции сервера:
 *  db, save(), isAccount(id), accountName(id), isBanned(id), onPaid(order)
 */
function createTelegram(ctx) {
  const { db } = ctx;
  if (!db.orders) db.orders = {};
  if (!db.pendingTopups) db.pendingTopups = {};

  function createOrder(accountId, packageId) {
    const pkg = PACKAGES[packageId];
    if (!pkg) return null;
    const order = {
      id: "o" + crypto.randomBytes(9).toString("hex"),
      accountId,
      packageId,
      amount: pkg.amount,
      stars: pkg.stars,
      status: "pending",
      createdAt: Date.now()
    };
    db.orders[order.id] = order;
    // Старые неоплаченные заказы (старше суток) не храним
    const dayAgo = Date.now() - 86400e3;
    for (const [id, o] of Object.entries(db.orders)) {
      if (o.status === "pending" && o.createdAt < dayAgo) delete db.orders[id];
    }
    ctx.save();
    return order;
  }

  /** Ссылка на оплату для сайта */
  async function createInvoice(accountId, packageId) {
    if (!enabled()) return { success: false, message: "Оплата временно недоступна" };
    const order = createOrder(accountId, packageId);
    if (!order) return { success: false, message: "Неизвестный пакет" };
    const link = await api("createInvoiceLink", invoiceParams(order));
    return { success: true, link, orderId: order.id, amount: order.amount, stars: order.stars };
  }

  function sendMessage(chatId, text, extra = {}) {
    return api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra }).catch((e) =>
      console.error("⚠️", e.message)
    );
  }

  const playButton = { inline_keyboard: [[{ text: "🎲 Открыть игру", url: SITE_URL }]] };

  async function handleStart(msg, arg) {
    const chatId = msg.chat.id;
    // Ссылки с сайта вида /start coins_999-123456 — сразу выставляем счёт
    const m = /^(coins_\d+)-(\d{4,10})$/.exec(arg || "");
    if (m && PACKAGES[m[1]] && ctx.isAccount(m[2])) {
      if (ctx.isBanned(m[2])) return sendMessage(chatId, "⛔ Этот аккаунт заблокирован.");
      const order = createOrder(m[2], m[1]);
      await api("sendInvoice", { chat_id: chatId, ...invoiceParams(order) });
      return;
    }
    return sendMessage(
      chatId,
      "🎩 <b>Mafia Play</b> — мафия онлайн с друзьями.\n\n" +
        "Чтобы купить Токены, откройте игру → нажмите на баланс Токенов → выберите пакет. " +
        "Оплата звёздами Telegram, Токены придут на ваш аккаунт автоматически.",
      { reply_markup: playButton }
    );
  }

  async function handleUpdate(update) {
    // 1) Подтверждение перед списанием звёзд
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      const order = db.orders[q.invoice_payload];
      let error = null;
      if (!order) error = "Заказ не найден. Создайте новый на сайте.";
      else if (order.status !== "pending") error = "Этот заказ уже оплачен.";
      else if (q.currency !== "XTR" || q.total_amount !== order.stars) error = "Неверная сумма заказа.";
      else if (ctx.isBanned(order.accountId)) error = "Аккаунт заблокирован.";
      await api(
        "answerPreCheckoutQuery",
        error ? { pre_checkout_query_id: q.id, ok: false, error_message: error } : { pre_checkout_query_id: q.id, ok: true }
      );
      return;
    }

    const msg = update.message;
    if (!msg) return;

    // 2) Оплата прошла — зачисляем
    if (msg.successful_payment) {
      const p = msg.successful_payment;
      const order = db.orders[p.invoice_payload];
      if (!order) {
        console.error("⚠️ Оплата по неизвестному заказу", p.invoice_payload, p.telegram_payment_charge_id);
        return;
      }
      if (order.status === "paid") return; // повторная доставка того же события
      order.status = "paid";
      order.paidAt = Date.now();
      order.chargeId = p.telegram_payment_charge_id;
      order.telegramUserId = msg.from?.id || null;
      ctx.onPaid(order);
      await sendMessage(
        msg.chat.id,
        `✅ <b>Оплата прошла успешно!</b>\n\n+${order.amount.toLocaleString("ru-RU")} Токенов зачислено на аккаунт ` +
          `<b>${ctx.accountName(order.accountId)}</b> (#${order.accountId}).\nВернитесь в игру — Токены уже на балансе.`,
        { reply_markup: playButton }
      );
      return;
    }

    const text = (msg.text || "").trim();
    if (text.startsWith("/start")) return handleStart(msg, text.split(/\s+/)[1]);
    if (text.startsWith("/paysupport")) {
      return sendMessage(
        msg.chat.id,
        `💬 Вопросы по оплате: ${SUPPORT}\nУкажите ID аккаунта и время оплаты — поможем или вернём звёзды.`
      );
    }
    if (text.startsWith("/terms")) {
      return sendMessage(
        msg.chat.id,
        `📄 Токены — внутриигровая валюта Mafia Play для покупки украшений, эмодзи, ролей и способностей. ` +
          `Начисляются сразу после оплаты. Пользовательское соглашение: ${SITE_URL}/terms`
      );
    }
    if (text.startsWith("/")) return handleStart(msg, "");
  }

  /** Подключить вебхук к express-приложению */
  async function attach(app) {
    if (!enabled()) {
      console.warn("⚠️ TELEGRAM_BOT_TOKEN не задан — оплата звёздами отключена.");
      return;
    }
    app.post("/tg/webhook", (req, res) => {
      if (req.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) return res.sendStatus(403);
      res.sendStatus(200); // Telegram ждёт быстрый ответ
      handleUpdate(req.body || {}).catch((e) => console.error("⚠️ Ошибка бота:", e.message));
    });

    if (!PUBLIC_URL) {
      console.warn("⚠️ PUBLIC_URL не задан — вебхук Telegram не настроен.");
      return;
    }
    try {
      await api("setWebhook", {
        url: `${PUBLIC_URL}/tg/webhook`,
        secret_token: WEBHOOK_SECRET,
        allowed_updates: ["message", "pre_checkout_query"],
        drop_pending_updates: false
      });
      await api("setMyCommands", {
        commands: [
          { command: "start", description: "Открыть игру и купить Токены" },
          { command: "paysupport", description: "Помощь с оплатой" },
          { command: "terms", description: "Условия" }
        ]
      });
      const me = await api("getMe");
      console.log(`🤖 Бот @${me.username} подключён, вебхук: ${PUBLIC_URL}/tg/webhook`);
    } catch (e) {
      console.error("⚠️ Не удалось настроить бота:", e.message);
    }
  }

  return { attach, createInvoice, handleUpdate, PACKAGES };
}

module.exports = { createTelegram, PACKAGES, enabled };
