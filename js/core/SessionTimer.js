import { bus } from "./EventBus.js";
import { session } from "./Session.js";

const WARN_BEFORE_MS = 5 * 60 * 1000;
// setTimeout cannot wait longer than about 24.8 days; longer waits are re-scheduled in steps.
const MAX_DELAY_MS = 2 ** 31 - 1;

/**
 * Watches the expiry of the token: warns 5 minutes before and, when it expires, clears the session and emits
 * "session:expired" (the app shows a notice and goes to the login screen) instead of waiting for a request to fail.
 */
export function watchSessionExpiry({ onWarn }) {
  let timers = [];
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const at = (time, fn) => {
    const delay = time - Date.now();
    if (delay <= 0) { fn(); return; }
    timers.push(setTimeout(() => (delay > MAX_DELAY_MS ? at(time, fn) : fn()), Math.min(delay, MAX_DELAY_MS)));
  };
  const schedule = (current) => {
    clear();
    if (!current?.expiresAt) return;
    const expires = new Date(current.expiresAt).getTime();
    if (Number.isNaN(expires)) return;
    if (expires - Date.now() > WARN_BEFORE_MS) at(expires - WARN_BEFORE_MS, () => onWarn?.());
    at(expires, () => {
      session.clear();
      bus.emit("session:expired");
    });
  };
  bus.on("session:changed", schedule);
  schedule(session.isAuthenticated ? { expiresAt: session.expiresAt } : null);
}
