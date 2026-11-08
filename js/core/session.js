import { bus } from "./event-bus.js";

const KEY = "aquasense.session";

// Session singleton. "Remember me" uses localStorage; otherwise sessionStorage (cleared when the browser closes).
class SessionStore {
  #session = null;

  constructor() {
    this.#session = this.#read(localStorage) || this.#read(sessionStorage);
    if (this.#session && this.isExpired()) this.clear();
  }

  #read(storage) {
    try { return JSON.parse(storage.getItem(KEY)); } catch { return null; }
  }

  save(auth, remember) {
    this.#session = { token: auth.token, expiresAt: auth.expiresAt, user: auth.user };
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(this.#session));
    } catch { /* storage unavailable: session stays in memory */ }
    bus.emit("session:changed", this.#session);
  }

  updateUser(user) {
    if (!this.#session) return;
    this.#session.user = user;
    const storage = localStorage.getItem(KEY) ? localStorage : sessionStorage;
    try { storage.setItem(KEY, JSON.stringify(this.#session)); } catch { /* ignore */ }
    bus.emit("session:changed", this.#session);
  }

  clear() {
    this.#session = null;
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    bus.emit("session:changed", null);
  }

  isExpired() {
    return !this.#session?.expiresAt || new Date(this.#session.expiresAt).getTime() <= Date.now();
  }

  get token() { return this.isAuthenticated ? this.#session.token : null; }
  get user() { return this.#session?.user ?? null; }
  get isAuthenticated() { return Boolean(this.#session?.token) && !this.isExpired(); }
}

export const session = new SessionStore();
