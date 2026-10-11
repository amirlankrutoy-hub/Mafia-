// Простые всплывающие уведомления: toast({ title, text, kind, actions, duration })
let nextId = 1;

export function toast(opts) {
  const t = typeof opts === "string" ? { text: opts } : opts;
  const detail = { id: nextId++, kind: "info", duration: 5000, ...t };
  window.dispatchEvent(new CustomEvent("mafia-toast", { detail }));
  return detail.id;
}

export function dismissToast(id) {
  window.dispatchEvent(new CustomEvent("mafia-toast-dismiss", { detail: { id } }));
}
