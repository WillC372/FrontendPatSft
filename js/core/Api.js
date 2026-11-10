import { session } from "./Session.js";
import { bus } from "./EventBus.js";
import { waitForServer } from "./ServerWake.js";

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// Single REST client of the application: adds the token, normalizes errors and notifies when the session expires.
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  url(path, query) {
    const url = new URL(this.baseUrl + path);
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

  async request(method, path, { body, query, raw = false, retried = false } = {}) {
    let response;
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
      const up = await waitForServer(() => {});
      if (up && method === "GET" && !retried) return this.request(method, path, { body, query, raw, retried: true });
      throw new ApiError(0, up
        ? "Se perdió la conexión con el servidor por un momento. Vuelve a intentarlo."
        : "No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.");
    } finally {
      clearTimeout(slow);
    }
    if (response.status === 401 && session.isAuthenticated) {
      session.clear();
      bus.emit("session:expired");
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

  async upload(path, formData) {
    let response;
    try {
      response = await fetch(this.url(path), { method: "POST", headers: this.headers(false), body: formData });
    } catch {
      throw new ApiError(0, "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.");
    }
    if (response.status === 401 && session.isAuthenticated) {
      session.clear();
      bus.emit("session:expired");
    }
    let payload = {};
    try { payload = await response.json(); } catch { /* empty body */ }
    if (!response.ok) throw new ApiError(response.status, payload.message || `Error ${response.status}`, payload.fields || {});
    return payload;
  }

  /**
   * POST that answers with Server-Sent Events. Calls {@code onEvent(name, data)} for each event as it arrives and
   * resolves when the server closes the stream. Errors before the first event are thrown like {@code request}.
   */
  async stream(path, body, onEvent) {
    let response;
    try {
      response = await fetch(this.url(path), {
        method: "POST", headers: this.headers(true, "text/event-stream"), body: JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, "No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.");
    }
    if (response.status === 401 && session.isAuthenticated) {
      session.clear();
      bus.emit("session:expired");
    }
    if (!response.ok || !response.body) {
      let payload = {};
      try { payload = await response.json(); } catch { /* not json */ }
      throw new ApiError(response.status, payload.message || `Error ${response.status}`, payload.fields || {});
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    const dispatch = (block) => {
      let name = "message";
      const data = [];
      block.split("\n").forEach((line) => {
        if (line.startsWith("event:")) name = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      });
      if (!data.length) return;
      let parsed = data.join("\n");
      try { parsed = JSON.parse(parsed); } catch { /* plain text */ }
      onEvent(name, parsed);
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value.replace(/\r\n/g, "\n");
      let end;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        dispatch(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
      }
    }
    if (buffer.trim()) dispatch(buffer);
  }

  get(path, query) { return this.request("GET", path, { query }); }
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

export const api = new ApiClient(window.AQUASENSE_CONFIG?.apiBaseUrl || "http://localhost:8080/api/v1");
