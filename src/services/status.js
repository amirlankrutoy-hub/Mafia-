// status.js — особый статус аккаунта, который выдаёт сервер (саппорт).
const KEY = "mafia_account_status_v1";
let status = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
})();

export function setAccountStatus(next) {
  status = next || {};
  try {
    localStorage.setItem(KEY, JSON.stringify(status));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent("mafia-status-changed"));
}

export const isSupport = () => !!status.support;

export function onStatusChanged(cb) {
  window.addEventListener("mafia-status-changed", cb);
  return () => window.removeEventListener("mafia-status-changed", cb);
}
