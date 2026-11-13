import { session } from "./Session.js";

const RETURN_KEY = "aquasense.return";

// Hash router: maps every route to a view and protects the ones that require a session.
export class Router {
  #routes = new Map();
  #fallback = "dashboard";
  #onChange;

  constructor(onChange) {
    this.#onChange = onChange;
    window.addEventListener("hashchange", () => this.resolve());
  }

  add(name, view, { public: isPublic = false, guestOnly = false } = {}) {
    this.#routes.set(name, { view, isPublic, guestOnly });
    return this;
  }

  current() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [path, queryString = ""] = hash.split("?");
    const [name, ...rest] = path.split("/");
    return { name: name || "", sub: rest.join("/"), query: Object.fromEntries(new URLSearchParams(queryString)) };
  }

  go(name) {
    location.hash = `#/${name}`;
  }

  /** Remembers the screen to return to after signing in (only screens of the signed-in app). */
  rememberReturn(hash = location.hash) {
    const target = String(hash || "").replace(/^#\/?/, "");
    const route = this.#routes.get(target.split(/[/?]/)[0]);
    if (!target || !route || route.isPublic) return;
    try { sessionStorage.setItem(RETURN_KEY, target); } catch { /* storage unavailable */ }
  }

  /** After signing out on purpose, the next person to sign in starts at the dashboard. */
  clearReturn() {
    try { sessionStorage.removeItem(RETURN_KEY); } catch { /* storage unavailable */ }
  }

  /** The screen remembered before signing in, once; the dashboard otherwise. */
  takeReturn() {
    let target = null;
    try {
      target = sessionStorage.getItem(RETURN_KEY);
      sessionStorage.removeItem(RETURN_KEY);
    } catch { /* storage unavailable */ }
    return target && this.#routes.has(target.split(/[/?]/)[0]) ? target : this.#fallback;
  }

  resolve() {
    const target = this.current();
    let route = this.#routes.get(target.name);
    if (!route) {
      this.go(session.isAuthenticated ? this.#fallback : "login");
      return;
    }
    if (!route.isPublic && !session.isAuthenticated) {
      this.rememberReturn();
      this.go("login");
      return;
    }
    if (route.guestOnly && session.isAuthenticated) {
      this.go(this.#fallback);
      return;
    }
    this.#onChange(route.view, target);
  }
}
