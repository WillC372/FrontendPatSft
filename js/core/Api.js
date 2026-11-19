import { session } from "./Session.js";
import { bus } from "./EventBus.js";
import { waitForServer } from "./ServerWake.js";
import { SseParser } from "./SseParser.js";
import { ApiCache } from "./ApiCache.js";

export const apiCache = new ApiCache();
apiCache.startSweeping();
// Another account (or none) must never see answers kept for the previous one.
bus.on("session:changed", () => apiCache.clear());

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// Requests that make the AI work (analyses, chat, photo reading): Aqua shows it is thinking while any is running.
const AI_WORK = /^\/(intelligence|vision)\//;
let aiBusy = 0;
function aiWork(method, path) {
  if (method === "GET" || !AI_WORK.test(path)) return () => {};
  bus.emit("ai:busy", ++aiBusy);
  let done = false;
  return () => { if (!done) { done = true; bus.emit("ai:busy", --aiBusy); } };
}

// What the AI service answers (AIPatSft); everything else is the backend's. Both accept the same session.
const AI_PATHS = /^\/(intelligence|vision|knowledge|reports|i18n)(\/|$)|^\/admin\/ai-usage(\/|$)/;
export const isAiPath = (path) => AI_PATHS.test(path);

// Single REST client of the application: adds the token, normalizes errors and notifies when the session expires.
class ApiClient {
  constructor(baseUrl, aiBaseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.aiBaseUrl = (aiBaseUrl || baseUrl).replace(/\/$/, "");
  }

  baseFor(path) {
    return isAiPath(path) ? this.aiBaseUrl : this.baseUrl;
  }

  url(path, query) {
    const url = new URL(this.baseFor(path) + path);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
    return url.toString();
  }

  headers(json = true, accept = "application/json") {
    const headers = { Accept: accept };
    if (json) headers["Content-Type"] = "application/json";
    if (session.token) headers.Authorization = `Bearer ${session.token}`;
    return headers;
  }

  /**
   * A 401 ends the session only if it answered the token in use: a request sent with an older token (for example
   * just before a password change renewed it) must not sign out the user who already has a new one.
   */
  #unauthorized(sentToken) {
    if (session.isAuthenticated && session.token === sentToken) {
      session.clear();
      bus.emit("session:expired");
      return true;
    }
    return false;
  }

  async request(method, path, options = {}) {
    const finished = aiWork(method, path);
    // A change (save, delete, analysis...) makes the kept answers old: they are dropped before and after it.
    const changes = method !== "GET";
    if (changes) apiCache.clear();
    try {
      return await this.#request(method, path, options);
    } finally {
      finished();
      if (changes) apiCache.clear();
    }
  }

  async #request(method, path, { body, query, raw = false, retried = false } = {}) {
    let response;
    const sentToken = session.token;
    // A free hosted backend sleeps when idle: if the answer takes long, the UI explains why.
    const slow = setTimeout(() => bus.emit("api:slow"), 5000);
    try {
      response = await fetch(this.url(path, query), {
        method,
        // Downloads (CSV, text, PDF) accept any type; with "application/json" the server answers 406.
        headers: this.headers(body !== undefined, raw ? "*/*" : "application/json"),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      clearTimeout(slow);
      // The server was waking up or restarting (an update, or the free plan's sleep). Wait for it and, for reads,
      // repeat the request once; changes are not repeated automatically to avoid saving something twice.
      bus.emit("api:slow");
      const up = await waitForServer(() => {}, this.baseFor(path));
      if (up && method === "GET" && !retried) return this.#request(method, path, { body, query, raw, retried: true });
      throw new ApiError(0, up
        ? "Se perdió la conexión con el servidor por un momento. Vuelve a intentarlo."
        : "No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.");
    } finally {
      clearTimeout(slow);
    }
    if (response.status === 401 && !this.#unauthorized(sentToken) && session.token && session.token !== sentToken && method === "GET" && !retried) {
      // The token changed while this read was on its way: it is repeated with the new one.
      return this.#request(method, path, { body, query, raw, retried: true });
    }
    if (!response.ok) {
      let payload = {};
      try { payload = await response.json(); } catch { /* not json */ }
      throw new ApiError(response.status, payload.message || `Error ${response.status}`, payload.fields || {});
    }
    if (raw) return response;
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async upload(path, formData, method = "POST") {
    const finished = aiWork(method, path);
    apiCache.clear();
    try {
      return await this.#upload(path, formData, method);
    } finally {
      finished();
      apiCache.clear();
    }
  }

  async #upload(path, formData, method) {
    let response;
    const sentToken = session.token;
    const slow = setTimeout(() => bus.emit("api:slow"), 5000);
    try {
      response = await fetch(this.url(path), { method, headers: this.headers(false), body: formData });
    } catch {
      // As with other changes, the upload is not repeated by itself (it would use another AI query): the server is
      // awakened and the user is asked to send it again.
      bus.emit("api:slow");
      const up = await waitForServer(() => {}, this.baseFor(path));
      throw new ApiError(0, up
        ? "Se perdió la conexión con el servidor mientras se enviaba la foto. Vuelve a enviarla."
        : "No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.");
    } finally {
      clearTimeout(slow);
    }
    if (response.status === 401) this.#unauthorized(sentToken);
    let payload = {};
    try { payload = await response.json(); } catch { /* empty body */ }
    if (!response.ok) throw new ApiError(response.status, payload.message || `Error ${response.status}`, payload.fields || {});
    return payload;
  }

  /**
   * POST that answers with Server-Sent Events. Calls {@code onEvent(name, data)} for each event as it arrives and
   * resolves when the server closes the stream. Errors before the first event are thrown like {@code request}.
   */
  async stream(path, body, onEvent, signal) {
    const finished = aiWork("POST", path);
    apiCache.clear();
    try {
      return await this.#stream(path, body, onEvent, signal);
    } finally {
      finished();
      apiCache.clear();
    }
  }

  async #stream(path, body, onEvent, signal) {
    let response;
    const sentToken = session.token;
    try {
      response = await fetch(this.url(path), {
        method: "POST", headers: this.headers(true, "text/event-stream"), body: JSON.stringify(body), signal,
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new ApiError(0, "No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.");
    }
    if (response.status === 401) this.#unauthorized(sentToken);
    if (!response.ok || !response.body) {
      let payload = {};
      try { payload = await response.json(); } catch { /* not json */ }
      throw new ApiError(response.status, payload.message || `Error ${response.status}`, payload.fields || {});
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    const parser = new SseParser();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.push(value).forEach((e) => onEvent(e.name, e.data));
    }
    parser.end().forEach((e) => onEvent(e.name, e.data));
  }

  get(path, query) { return apiCache.get(path, query, () => this.request("GET", path, { query })); }
  post(path, body, query) { return this.request("POST", path, { body, query }); }
  put(path, body) { return this.request("PUT", path, { body }); }
  patch(path, body) { return this.request("PATCH", path, { body }); }
  delete(path, body) { return this.request("DELETE", path, { body }); }

  async download(path, query, fallbackName) {
    const response = await this.request("GET", path, { query, raw: true });
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const name = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }
}

export const api = new ApiClient(window.AQUASENSE_CONFIG?.apiBaseUrl || "http://localhost:8080/api/v1",
  window.AQUASENSE_CONFIG?.aiBaseUrl || "http://localhost:8081/api/v1");
