// The free hosting plan stops the backend after 15 minutes without traffic and needs up to a minute to start again.
// Before the app calls the API it waits for the health check, so the user sees one clear message instead of failed
// requests and buttons that do nothing.

const HEALTH_TIMEOUT_MS = 25000;
const RETRY_MS = 3000;
const GIVE_UP_MS = 150000;
const SLOW_MS = 1200;

const BACKEND = () => window.AQUASENSE_CONFIG?.apiBaseUrl || "http://localhost:8080/api/v1";
const AI = () => window.AQUASENSE_CONFIG?.aiBaseUrl || "http://localhost:8081/api/v1";

function healthUrl(base = BACKEND()) {
  return new URL(base).origin + "/actuator/health";
}

async function ping(base) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(healthUrl(base), { signal: controller.signal, cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves true when the server answers (the backend, or the one of {@code base}); calls {@code onSlow} once if it
 * takes long (it is waking up).
 */
export async function waitForServer(onSlow, base) {
  const start = Date.now();
  const slowTimer = setTimeout(onSlow, SLOW_MS);
  try {
    while (Date.now() - start < GIVE_UP_MS) {
      if (await ping(base)) return true;
      onSlow();
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
    return false;
  } finally {
    clearTimeout(slowTimer);
  }
}

/**
 * The AI service sleeps when nobody uses it (it does not stay awake, to save the free plan's hours). Asking for its
 * health as soon as someone signs in wakes it, so it is ready by the time they open Aqua. Fire and forget.
 */
export function wakeAiService() {
  fetch(healthUrl(AI()), { cache: "no-store" }).catch(() => {});
}
