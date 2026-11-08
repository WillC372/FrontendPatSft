import { session } from "./session.js";

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

  resolve() {
    const target = this.current();
    let route = this.#routes.get(target.name);
    if (!route) {
      this.go(session.isAuthenticated ? this.#fallback : "login");
      return;
    }
    if (!route.isPublic && !session.isAuthenticated) {
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
