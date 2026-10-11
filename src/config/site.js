// Публичный адрес сайта — для canonical/OG-ссылок. Можно переопределить в .env
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://mafia-play-n.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "Mafia Play";
