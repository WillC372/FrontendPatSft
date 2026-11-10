import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { session } from "../core/Session.js";
import { theme } from "../core/Theme.js";
import { liveStream } from "../core/LiveStream.js";
import { browserMeter } from "../core/BrowserMeter.js";
import { esc, fmt } from "../core/Format.js";
import { icon, logo } from "../ui/Icons.js";
import { confirmDialog, modal, toast } from "../ui/Components.js";

const NAV = [
  ["dashboard", "Inicio", "home"],
  ["history", "Historial", "history"],
  ["intelligence", "Inteligencia IA", "brain"],
  ["devices", "Conexión", "bluetooth"],
  ["profiles", "Perfiles", "profiles"],
  ["sessions", "Sesiones", "clock"],
  ["settings", "Configuración", "settings"],
];
const MOBILE = [["dashboard", "Inicio", "home"], ["history", "Historial", "history"], ["intelligence", "IA", "brain"], ["devices", "Equipo", "bluetooth"]];

// Frame of the authenticated application: sidebar, top bar, mobile navigation and alerts.
export class Shell {
  #offs = [];
  #lastCriticalToast = 0;

  constructor(root, ctx) {
    this.ctx = ctx;
    const user = session.user;
    root.innerHTML = `
      <div class="shell">
        <aside class="sidebar" aria-label="Navegación principal">
          <div class="brand">${logo()}<div class="brand-name">AquaSense <span>AI</span></div><div class="brand-tag">Analiza · Cuida · Previene</div></div>
          <nav class="nav">${NAV.map(([r, label, ic]) => `<a class="nav-link" data-route="${r}" href="#/${r}">${icon(ic)}${label}</a>`).join("")}
            ${user?.role === "ADMIN" ? `<a class="nav-link" data-route="admin" href="#/admin">${icon("users")}Administración</a>` : ""}
            <button class="nav-link nav-logout" data-logout>${icon("logout")}Cerrar sesión</button>
          </nav>
          <div class="nav-sep"></div>
          <a class="device-pill" href="#/devices" data-device-pill></a>
        </aside>
        <div class="main">
          <header class="topbar">
            <div class="topbar-title"><div class="mobile-brand">${logo("")}<span>AquaSense AI</span></div><h1 data-title></h1></div>
            <div class="topbar-actions">
              <button class="btn btn-ghost icon-btn" data-theme-toggle aria-label="Cambiar tema">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")}</button>
              <div style="position:relative">
                <button class="btn btn-ghost icon-btn" data-bell aria-label="Alertas" aria-expanded="false">${icon("bell")}<span class="count" data-count hidden></span></button>
                <div class="dropdown" data-alerts hidden></div>
              </div>
              <div class="user-chip"><span class="avatar">${esc((user?.fullName || "?").charAt(0).toUpperCase())}</span><span class="user-name">${esc(user?.fullName?.split(" ")[0] || "")}</span></div>
            </div>
          </header>
          ${user?.demo ? `<div class="demo-banner" role="note">${icon("info")}<span>Estás en una <strong>cuenta de demostración compartida</strong>${user.role === "ADMIN" ? " de administración (solo lectura)" : ""}. Lo que hagas es real y queda guardado, pero otras personas que usen este botón también lo ven. <a href="#/register" data-demo-register>Crea tu cuenta</a> para tener tus datos privados.</span></div>` : ""}
          <main class="page" id="page" tabindex="-1"></main>
        </div>
        <nav class="bottom-nav" aria-label="Navegación móvil">
          ${MOBILE.map(([r, label, ic]) => `<a data-route="${r}" href="#/${r}">${icon(ic)}${label}</a>`).join("")}
          <button data-more>${icon("menu")}Más</button>
        </nav>
      </div>`;
    this.root = root;
    this.page = root.querySelector("#page");
    this.#bind();
    this.refreshDevice();
    this.refreshAlerts();
  }

  activate(name, title) {
    this.root.querySelectorAll("[data-route]").forEach((link) => {
      const active = link.dataset.route === name;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    this.root.querySelector("[data-title]").textContent = title;
    document.title = `${title} · AquaSense AI`;
  }

  async refreshDevice() {
    const pill = this.root.querySelector("[data-device-pill]");
    try {
      const status = await api.get("/devices/status");
      this.renderDevice(status);
    } catch {
      pill.innerHTML = `<span class="dot" style="color:var(--muted)"></span><div>Estado no disponible</div>`;
    }
  }

  renderDevice(status) {
    const pill = this.root.querySelector("[data-device-pill]");
    if (browserMeter.connected) {
      pill.innerHTML = `<span class="dot" style="color:var(--ok)"></span>
        <div><strong style="color:var(--ok)">Medidor conectado</strong><small class="muted">${esc(browserMeter.name)}</small></div>${icon("usb")}`;
      pill.querySelector("svg:last-child").style.cssText = "width:18px;height:18px;margin-left:auto;color:var(--primary-2)";
      return;
    }
    const connected = status.ownedByYou && status.state !== "DISCONNECTED";
    // Live readings only exist for a meter connected to the server itself (local installation).
    if (connected) liveStream.start(); else liveStream.stop();
    const color = status.state === "ERROR" ? "var(--crit)" : connected ? "var(--ok)" : "var(--muted)";
    pill.innerHTML = `<span class="dot ${status.state === "LIVE" ? "dot-live" : ""}" style="color:${color}"></span>
      <div><strong style="color:${color}">${connected ? (status.state === "ERROR" ? "Error de conexión" : "Dispositivo conectado") : "Sin dispositivo"}</strong>
      <small class="muted">${connected ? esc(status.deviceName) + (status.simulated ? " · SIMULADO" : "") : "Toca para conectar"}</small></div>
      ${icon("bluetooth")}`;
    pill.querySelector("svg:last-child").style.cssText = "width:18px;height:18px;margin-left:auto;color:var(--primary-2)";
  }

  async refreshAlerts() {
    try {
      const alerts = await api.get("/alerts", { unreadOnly: true, limit: 20 });
      const count = this.root.querySelector("[data-count]");
      count.hidden = alerts.length === 0;
      count.textContent = alerts.length > 9 ? "9+" : alerts.length;
      this.alerts = alerts;
    } catch { /* ignore */ }
  }

  #renderAlertPanel() {
    const panel = this.root.querySelector("[data-alerts]");
    const alerts = this.alerts || [];
    panel.innerHTML = `<div class="row-between" style="margin-bottom:8px"><h3>Alertas</h3>
        ${alerts.length ? `<button class="link-btn" data-read-all>Marcar como leidas</button>` : ""}</div>
      ${alerts.length ? alerts.slice(0, 8).map((a) => `<div class="alert-item ${esc(a.severity)}">${icon(a.severity === "CRITICAL" ? "error" : "alert")}
        <div><strong>${esc(a.title)}</strong><p>${esc(a.message)}</p><small class="muted">${fmt.relative(a.createdAt)}</small></div></div>`).join("")
        : `<p class="muted" style="padding:10px">No tienes alertas pendientes.</p>`}`;
    panel.querySelector("[data-read-all]")?.addEventListener("click", async () => {
      await api.post("/alerts/read-all");
      await this.refreshAlerts();
      this.#renderAlertPanel();
      bus.emit("alerts:changed");
    });
  }

  #bind() {
    const bell = this.root.querySelector("[data-bell]");
    const panel = this.root.querySelector("[data-alerts]");
    bell.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (panel.hidden) await this.refreshAlerts();
      panel.hidden = !panel.hidden;
      bell.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) this.#renderAlertPanel();
    });
    document.addEventListener("click", this.#closePanel = (event) => {
      if (!panel.hidden && !panel.contains(event.target)) { panel.hidden = true; bell.setAttribute("aria-expanded", "false"); }
    });
    this.root.querySelector("[data-theme-toggle]").addEventListener("click", async (event) => {
      const next = document.documentElement.dataset.theme === "dark" ? "LIGHT" : "DARK";
      theme.apply(next);
      event.currentTarget.innerHTML = icon(next === "DARK" ? "sun" : "moon");
      if (this.ctx.settings) {
        try {
          this.ctx.settings = await api.put("/users/me/settings", { ...this.ctx.settings, theme: next });
          bus.emit("settings:changed", this.ctx.settings);
        } catch { /* local preference still applies */ }
      }
    });
    this.root.querySelector("[data-logout]").addEventListener("click", () => this.logout());
    // From a demonstration account, "Crea tu cuenta" closes that shared session and opens the registration form.
    this.root.querySelector("[data-demo-register]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      try { await api.post("/auth/logout"); } catch { /* the session is cleared locally anyway */ }
      liveStream.stop();
      session.clear();
      this.ctx.router.go("register");
    });
    this.root.querySelector("[data-more]").addEventListener("click", () => this.#moreMenu());
    this.#offs.push(bus.on("live:status", () => this.refreshDevice()));
    this.#offs.push(bus.on("device:changed", (status) => (status ? this.renderDevice(status) : this.refreshDevice())));
    this.#offs.push(bus.on("meter:browser", () => this.refreshDevice()));
    this.#offs.push(bus.on("measurement:saved", () => this.refreshAlerts()));
    this.#offs.push(bus.on("alerts:changed", () => this.refreshAlerts()));
    this.#offs.push(bus.on("live:reading", (reading) => {
      if (reading.status === "CRITICAL" && this.ctx.settings?.notificationsEnabled && Date.now() - this.#lastCriticalToast > 60000) {
        this.#lastCriticalToast = Date.now();
        toast(`Lectura en vivo crítica: pH ${fmt.ph(reading.ph)}${reading.simulated ? " (simulada)" : ""}.`, "error", 7000);
      }
    }));
  }

  #closePanel;

  async #moreMenu() {
    await modal({
      title: "Más opciones",
      body: `<div class="quick-links">
        <a class="quick-link" href="#/profiles" data-close>${icon("profiles")}Perfiles de agua${icon("chevronRight")}</a>
        <a class="quick-link" href="#/sessions" data-close>${icon("clock")}Historial de sesiones${icon("chevronRight")}</a>
        <a class="quick-link" href="#/settings" data-close>${icon("settings")}Configuración${icon("chevronRight")}</a>
        ${session.user?.role === "ADMIN" ? `<a class="quick-link" href="#/admin" data-close>${icon("users")}Administración${icon("chevronRight")}</a>` : ""}
        <button class="quick-link" data-logout-mobile style="width:100%">${icon("logout")}Cerrar sesión${icon("chevronRight")}</button></div>`,
      onMount: (node, close) => node.querySelector("[data-logout-mobile]").addEventListener("click", () => { close(); this.logout(); }),
    });
  }

  async logout() {
    const ok = await confirmDialog("Cerrar sesión", "Se cerrará esta sesión. Lo que hiciste queda guardado en tu historial de sesiones.", "Cerrar sesión");
    if (!ok) return;
    try { await api.post("/auth/logout"); } catch { /* session cleared locally anyway */ }
    liveStream.stop();
    session.clear();
    toast("Sesión cerrada.", "ok");
    this.ctx.router.go("login");
  }

  destroy() {
    this.#offs.forEach((off) => off());
    document.removeEventListener("click", this.#closePanel);
  }
}
