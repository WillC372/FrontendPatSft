import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { session } from "../core/Session.js";
import { theme } from "../core/Theme.js";
import { liveStream } from "../core/LiveStream.js";
import { browserMeter } from "../core/BrowserMeter.js";
import { esc, fmt, relativeTime } from "../core/Format.js";
import { icon, logo } from "../ui/Icons.js";
import { avatarMarkup, avatarUrl, forgetAvatar } from "../core/Avatar.js";
import { openAccountDialog } from "./AccountDialog.js";
import { confirmDialog, modal, toast } from "../ui/Components.js";
import { AquaBot } from "./AquaBot.js";

// Bottom bar (every screen size): four places and, in the middle, the main action of the app.
const TABS = [["dashboard", "Inicio", "home"], ["history", "Historial", "history"]];
const TABS_RIGHT = [["profiles", "Perfiles", "profiles"]];
// Screens reached from "Más"; while one is open, "Más" is shown as the active tab.
const MORE = [
  ["devices", "Conectar medidor", "bluetooth", "USB (ESP32 o de bolsillo) o cámara"],
  ["official", "Datos oficiales", "globe", "pH real de ríos medidos por el USGS"],
  ["sessions", "Mis sesiones", "clock", "Cuándo entraste y qué hiciste"],
  ["settings", "Configuración", "settings", "Tema, alertas y tu cuenta"],
  ["billing", "Plan y pagos", "card", "Plan gratuito o Premium"],
];
const MORE_ROUTES = new Set([...MORE.map(([r]) => r), "admin"]);

const tab = ([r, label, ic]) => `<a class="tab-link" data-route="${r}" data-tab="${r}" href="#/${r}">${icon(ic)}<span>${label}</span></a>`;

// Frame of the authenticated application: top bar, bottom bar, Aqua (the AI) and alerts.
export class Shell {
  #offs = [];
  #lastCriticalToast = 0;

  constructor(root, ctx) {
    this.ctx = ctx;
    const user = session.user;
    root.innerHTML = `
      <div class="shell">
        <button type="button" class="skip-link" data-skip>Saltar al contenido</button>
        <div class="main">
          <header class="topbar">
            <a class="topbar-brand" href="#/dashboard" aria-label="AquaSense AI, ir al inicio">${logo("")}<span>AquaSense <b>AI</b></span></a>
            <h1 class="topbar-h1" data-title></h1>
            <div class="topbar-actions">
              <a class="device-chip" href="#/devices" data-device-pill aria-label="Estado del medidor"></a>
              <button class="btn btn-ghost icon-btn" data-theme-toggle aria-label="Cambiar tema">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")}</button>
              <div style="position:relative">
                <button class="btn btn-ghost icon-btn" data-bell aria-label="Alertas" aria-expanded="false">${icon("bell")}<span class="count" data-count hidden></span></button>
                <div class="dropdown" data-alerts hidden></div>
              </div>
              <button type="button" class="user-chip" data-account aria-label="Tu cuenta y foto de perfil"><span data-avatar>${avatarMarkup(user, null)}</span><span class="user-name">${esc(user?.fullName?.split(" ")[0] || "")}</span></button>
            </div>
          </header>
          ${user?.demo ? `<aside class="demo-banner" aria-label="Cuenta de demostración">${icon("info")}<span>Estás en una <strong>cuenta de demostración compartida</strong>${user.role === "ADMIN" ? " de administración (solo lectura)" : ""}. Lo que hagas es real y queda guardado, pero otras personas que usen este botón también lo ven. <a href="#/register" data-demo-register>Crea tu cuenta</a> para tener tus datos privados.</span></aside>` : ""}
          <main class="page" id="page" tabindex="-1"></main>
        </div>
        <nav class="tabbar" aria-label="Navegación principal">
          ${TABS.map(tab).join("")}
          <button type="button" class="tab-measure" data-tab="measure" data-measure-tab aria-haspopup="dialog"><span class="tab-measure-ring">${icon("drop")}</span><span>Medir</span></button>
          ${TABS_RIGHT.map(tab).join("")}
          <button type="button" class="tab-link" data-tab="more" data-more aria-haspopup="dialog">${icon("menu")}<span>Más</span></button>
        </nav>
      </div>`;
    this.root = root;
    this.page = root.querySelector("#page");
    this.aqua = new AquaBot(root.querySelector(".shell"));
    this.#bind();
    this.refreshDevice();
    this.refreshAlerts();
    this.aqua.maybeFirstTour();
  }

  activate(name, title) {
    this.root.querySelectorAll("[data-route]").forEach((link) => {
      const active = link.dataset.route === name;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    const more = this.root.querySelector("[data-more]");
    more.classList.toggle("active", MORE_ROUTES.has(name));
    this.root.querySelector("[data-title]").textContent = title;
    document.title = `${title} · AquaSense AI`;
    this.aqua.onRoute(name);
  }

  async refreshDevice() {
    const pill = this.root.querySelector("[data-device-pill]");
    try {
      const status = await api.get("/devices/status");
      this.renderDevice(status);
    } catch {
      pill.innerHTML = `<span class="dot" style="color:var(--muted)"></span><span class="device-chip-text">Medidor</span>${icon("bluetooth")}`;
    }
  }

  renderDevice(status) {
    const pill = this.root.querySelector("[data-device-pill]");
    if (browserMeter.connected) {
      pill.innerHTML = `<span class="dot" style="color:var(--ok)"></span><span class="device-chip-text">${esc(browserMeter.name)}</span>${icon("usb")}`;
      pill.setAttribute("aria-label", `Medidor conectado por USB: ${browserMeter.name}`);
      pill.classList.add("on");
      return;
    }
    const connected = status.ownedByYou && status.state !== "DISCONNECTED";
    // Live readings only exist for a meter connected to the server itself (local installation).
    if (connected) liveStream.start(); else liveStream.stop();
    const color = status.state === "ERROR" ? "var(--crit)" : connected ? "var(--ok)" : "var(--muted)";
    const label = connected ? (status.state === "ERROR" ? "Error de conexión" : `${status.deviceName}${status.simulated ? " · SIMULADO" : ""}`) : "Sin medidor";
    pill.innerHTML = `<span class="dot ${status.state === "LIVE" ? "dot-live" : ""}" style="color:${color}"></span><span class="device-chip-text">${esc(label)}</span>${icon("bluetooth")}`;
    pill.setAttribute("aria-label", connected ? `Medidor: ${label}` : "Sin medidor conectado. Toca para conectar");
    pill.classList.toggle("on", connected && status.state !== "ERROR");
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
    panel.innerHTML = `<div class="row-between" style="margin-bottom:8px"><h2 class="h-sm">Alertas</h2>
        ${alerts.length ? `<button class="link-btn" data-read-all>Marcar como leidas</button>` : ""}</div>
      ${alerts.length ? alerts.slice(0, 8).map((a) => `<div class="alert-item ${esc(a.severity)}">${icon(a.severity === "CRITICAL" ? "error" : "alert")}
        <div><strong>${esc(a.title)}</strong><p>${esc(a.message)}</p><small class="muted">${relativeTime(a.createdAt)}</small></div></div>`).join("")
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
    // Keyboard users skip the menu (a "#page" link would change the screen, because the router uses the hash).
    this.root.querySelector("[data-skip]").addEventListener("click", () => {
      this.page.focus();
      this.page.scrollIntoView({ block: "start" });
    });
    this.root.querySelector("[data-account]").addEventListener("click", () => openAccountDialog());
    // The photo is downloaded after the frame is drawn, and again whenever the user changes it.
    const showAvatar = async (current) => {
      const slot = this.root.querySelector("[data-avatar]");
      if (!slot || !current) return;
      slot.innerHTML = avatarMarkup(current, await avatarUrl(current));
      const name = this.root.querySelector(".user-chip .user-name");
      if (name) name.textContent = current.fullName?.split(" ")[0] || "";
    };
    showAvatar(session.user);
    this.#offs.push(bus.on("session:changed", (current) => { if (current) showAvatar(current.user); else forgetAvatar(); }));
    // From a demonstration account, "Crea tu cuenta" closes that shared session and opens the registration form.
    this.root.querySelector("[data-demo-register]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      try { await api.post("/auth/logout"); } catch { /* the session is cleared locally anyway */ }
      liveStream.stop();
      session.clear();
      this.ctx.router.go("register");
    });
    this.root.querySelector("[data-more]").addEventListener("click", () => this.#moreMenu());
    this.root.querySelector("[data-measure-tab]").addEventListener("click", async () => {
      // The measuring flows are downloaded the first time "Medir" is pressed.
      try {
        const { openMeasureSheet } = await import("./MeasureSheet.js");
        openMeasureSheet();
      } catch {
        toast("No se pudo abrir Medir. Revisa tu conexión y recarga la página.", "error");
      }
    });
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
    const tile = ([r, label, ic, text]) => `<a class="sheet-option" href="#/${r}" data-close><span class="sheet-ic">${icon(ic)}</span><span><strong>${label}</strong><small>${text}</small></span>${icon("chevronRight")}</a>`;
    await modal({
      title: "Más opciones",
      body: `<div class="sheet-options">
        ${MORE.map(tile).join("")}
        ${session.user?.role === "ADMIN" ? tile(["admin", "Administración", "users", "Cuentas, roles y uso del sistema"]) : ""}
        <button type="button" class="sheet-option" data-tour-again><span class="sheet-ic">${icon("info")}</span><span><strong>Ver el recorrido</strong><small>Aqua te muestra para qué sirve cada parte</small></span>${icon("chevronRight")}</button>
        <button type="button" class="sheet-option sheet-danger" data-logout-mobile><span class="sheet-ic">${icon("logout")}</span><span><strong>Cerrar sesión</strong><small>Lo que hiciste queda guardado</small></span>${icon("chevronRight")}</button>
      </div>`,
      onMount: (node, close) => {
        node.querySelector("[data-logout-mobile]").addEventListener("click", () => { close(); this.logout(); });
        node.querySelector("[data-tour-again]").addEventListener("click", () => { close(); this.aqua.tour(); });
      },
    });
  }

  async logout() {
    const ok = await confirmDialog("Cerrar sesión", "Se cerrará esta sesión. Lo que hiciste queda guardado en tu historial de sesiones.", "Cerrar sesión");
    if (!ok) return;
    try { await api.post("/auth/logout"); } catch { /* session cleared locally anyway */ }
    liveStream.stop();
    session.clear();
    this.ctx.router.clearReturn();
    toast("Sesión cerrada.", "ok");
    this.ctx.router.go("login");
  }

  destroy() {
    this.#offs.forEach((off) => off());
    document.removeEventListener("click", this.#closePanel);
    this.aqua.destroy();
  }
}
