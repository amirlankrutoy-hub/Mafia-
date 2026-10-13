// settings.js — настройки игрока: громкость музыки и звуков, анимации, вибрация.
const KEY = "mafia_settings_v1";

const DEFAULTS = {
  musicVolume: 70, // 0..100
  soundVolume: 80, // 0..100
  reduceMotion: false,
  vibration: true,
  pauseInBackground: true // музыка замолкает, когда сайт свёрнут или открыт другой
};

export function getSettings() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function updateSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  applySettings(next);
  window.dispatchEvent(new CustomEvent("mafia-settings-changed", { detail: next }));
  return next;
}

export function onSettingsChanged(cb) {
  const h = (e) => cb(e.detail || getSettings());
  window.addEventListener("mafia-settings-changed", h);
  return () => window.removeEventListener("mafia-settings-changed", h);
}

/** Громкость звуковых эффектов 0..1 */
export const soundGain = () => getSettings().soundVolume / 100;
export const musicGain = () => getSettings().musicVolume / 100;

export function vibrate(pattern) {
  if (getSettings().vibration && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

export function applySettings(s = getSettings()) {
  document.documentElement.classList.toggle("reduce-motion", !!s.reduceMotion);
}
