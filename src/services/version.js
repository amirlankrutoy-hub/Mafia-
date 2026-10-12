// version.js — защита от устаревшей версии сайта во вкладке.
// Раз в несколько минут и при возвращении на вкладку сверяем номер сборки
// с /version.json. Если сайт обновился — перезагружаем страницу (вне игры
// сразу, в игре — только с подтверждения, чтобы не выкинуть из партии).
import { toast } from "./toast";

const CURRENT = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
const CHECK_EVERY_MS = 5 * 60 * 1000;
let notified = false;

async function latestBuild() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()).build || null;
  } catch {
    return null;
  }
}

function inGame() {
  return window.location.pathname.startsWith("/online") && !!localStorage.getItem("mafia_lobby");
}

async function check() {
  if (CURRENT === "dev") return;
  const latest = await latestBuild();
  if (!latest || latest === CURRENT) return;
  if (!inGame()) {
    window.location.reload();
    return;
  }
  if (notified) return;
  notified = true;
  toast({
    kind: "info",
    title: "Сайт обновился",
    text: "Обновите страницу после игры, чтобы получить новую версию.",
    duration: 0,
    actions: [{ label: "Обновить сейчас", onClick: () => window.location.reload() }]
  });
}

export function startVersionWatch() {
  check();
  setInterval(check, CHECK_EVERY_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}
