// The free hosting plan stops the backend after 15 minutes without traffic and needs up to a minute to start again.
// Before the app calls the API it waits for the health check, so the user sees one clear message instead of failed
// requests and buttons that do nothing.

const HEALTH_TIMEOUT_MS = 25000;
const RETRY_MS = 3000;
const GIVE_UP_MS = 150000;
const SLOW_MS = 1200;

function healthUrl() {
  return new URL(window.AQUASENSE_CONFIG?.apiBaseUrl || "http://localhost:8080/api/v1").origin + "/actuator/health";
}

async function ping() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(healthUrl(), { signal: controller.signal, cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves true when the backend answers; calls {@code onSlow} once if it takes long (it is waking up). */
export async function waitForServer(onSlow) {
  const start = Date.now();
  const slowTimer = setTimeout(onSlow, SLOW_MS);
  try {
    while (Date.now() - start < GIVE_UP_MS) {
      if (await ping()) return true;
      onSlow();
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
    return false;
  } finally {
    clearTimeout(slowTimer);
  }
}
