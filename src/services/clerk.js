// clerk.js — вход через Google с помощью Clerk (пока нет своего ключа Google Cloud).
// Clerk только подтверждает Google-аккаунт; сам аккаунт игры живёт на нашем сервере.

const MODE_KEY = "mafia_clerk_mode"; // login | link

function frontendApi(pk) {
  try {
    return atob(pk.replace(/^pk_(test|live)_/, "")).replace(/\$$/, "");
  } catch {
    return "";
  }
}

let clerkPromise = null;
export function loadClerk(publishableKey) {
  if (window.Clerk?.loaded) return Promise.resolve(window.Clerk);
  if (!clerkPromise) {
    clerkPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://${frontendApi(publishableKey)}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.setAttribute("data-clerk-publishable-key", publishableKey);
      s.onload = async () => {
        try {
          await window.Clerk.load();
          resolve(window.Clerk);
        } catch (err) {
          reject(err);
        }
      };
      s.onerror = () => reject(new Error("Clerk недоступен"));
      document.head.appendChild(s);
    }).catch((err) => {
      clerkPromise = null;
      throw err;
    });
  }
  return clerkPromise;
}

/** Уходим на страницу выбора Google-аккаунта; вернёмся на /auth/callback */
export async function startGoogleViaClerk(publishableKey, mode = "login") {
  const clerk = await loadClerk(publishableKey);
  try {
    sessionStorage.setItem(MODE_KEY, mode);
  } catch {}
  if (clerk.session) await clerk.signOut();
  const back = `${window.location.origin}/auth/callback`;
  await clerk.client.signIn.authenticateWithRedirect({
    strategy: "oauth_google",
    redirectUrl: back,
    redirectUrlComplete: back
  });
}

export function takeClerkMode() {
  try {
    const m = sessionStorage.getItem(MODE_KEY) || "login";
    sessionStorage.removeItem(MODE_KEY);
    return m;
  } catch {
    return "login";
  }
}

/** На странице возврата: завершаем вход у Clerk и получаем токен сессии */
export async function finishClerkRedirect(publishableKey) {
  const clerk = await loadClerk(publishableKey);
  if (!clerk.session) {
    try {
      await clerk.handleRedirectCallback(
        {
          signInFallbackRedirectUrl: "/auth/callback",
          signUpFallbackRedirectUrl: "/auth/callback"
        },
        () => Promise.resolve()
      );
    } catch (err) {
      console.warn("Clerk callback:", err);
    }
  }
  for (let i = 0; i < 40 && !clerk.session; i++) await new Promise((r) => setTimeout(r, 250));
  if (!clerk.session) return null;
  const token = await clerk.session.getToken();
  return { token, signOut: () => clerk.signOut().catch(() => {}) };
}
