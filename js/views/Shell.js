import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { session } from "../core/Session.js";
import { liveStream } from "../core/LiveStream.js";
import { browserMeter } from "../core/BrowserMeter.js";
import { esc, fmt, own, relativeTime } from "../core/Format.js";
import { icon, logo } from "../ui/Icons.js";
import { avatarMarkup, avatarUrl, forgetAvatar } from "../core/Avatar.js";
import { openAccountDialog } from "./AccountDialog.js";
import { confirmDialog, toast } from "../ui/Components.js";
import { AquaBot } from "./AquaBot.js";
import { reducedMotion } from "../core/Motion.js";

// Bottom bar (every screen size): Inicio, Historial, Medir (the main action, in the middle), Cuidado and Plan, or for
// the administrator Plan and Admin (care then opens from the place menu). Lugares opens from the place menu (top),
// Configuración from the account menu; Perfiles lives inside
// Lugares, the meter and the activity inside Configuración, the official data inside Aqua's library (ui/SubNav.js).
// [route, label, icon, full name for screen readers when the label is shortened]
const LEFT = [["dashboard", "Inicio", "home"], ["history", "Historial", "history"]];
const RIGHT = [["billing", "Plan", "card", "Plan y pagos"]];
// A person's bar has "Cuidado" next to "Plan"; the administrator's has "Admin" there and opens the care of the water
// from the place menu.
const CARE = ["care", "Cuidado", "flask", "Cuidado del agua: dosis, tratamientos y recordatorios"];
const ADMIN = ["admin", "Admin", "users", "Administración"];

// A label too long for a phone has a short one ("Ajustes"); the full name stays for screen readers.
const tab = ([r, label, ic, full, short]) => `<a class="tab-link" data-route="${r}" data-tab="${r}" href="#/${r}"${full || short ? ` aria-label="${full || label}" title="${full || label}"` : ""}>${icon(ic)}${short
  ? `<span class="tab-full">${label}</span><span class="tab-short" aria-hidden="true">${short}</span>` : `<span>${label}</span>`}</a>`;

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
            <span class="topbar-brand">${logo("")}<span>Aqua Assistant <b>AI</b></span></span>
            <h1 class="topbar-h1" data-title></h1>
            <div class="topbar-actions">
              <div class="place-menu-wrap">
                <button type="button" class="place-chip" data-place-chip aria-haspopup="menu" aria-expanded="false" aria-controls="place-menu" title="Lugar que estás viendo. Toca para cambiar de piscina, acuario o tanque.">${icon("pin")}<span data-place-name>Mi agua</span>${icon("chevronRight", "user-chev")}</button>
                <div class="dropdown place-menu" id="place-menu" role="menu" aria-label="Elegir lugar" data-place-menu hidden></div>
              </div>
              <span class="device-chip" data-device-pill role="status" aria-label="Estado del medidor"></span>
              <div style="position:relative">
                <button class="btn btn-ghost icon-btn" data-bell aria-label="Alertas" aria-expanded="false">${icon("bell")}<span class="count" data-count hidden></span></button>
                <div class="dropdown" data-alerts hidden></div>
              </div>
              <div class="user-menu-wrap">
                <button type="button" class="user-chip" data-account aria-haspopup="menu" aria-expanded="false" aria-controls="user-menu" aria-label="Tu cuenta"><span data-avatar>${avatarMarkup(user, null)}</span><span class="user-name" translate="no">${esc(user?.fullName?.split(" ")[0] || "")}</span>${icon("chevronRight", "user-chev")}</button>
                <div class="dropdown user-menu" id="user-menu" role="menu" aria-label="Tu cuenta" data-user-menu hidden>
                  <div class="user-menu-head"><span data-avatar-big>${avatarMarkup(user, null, "avatar-lg")}</span><div><strong translate="no">${esc(user?.fullName || "")}</strong><small class="muted" translate="no">${esc(user?.email || "")}</small>
                    <small class="muted">${user?.role === "ADMIN" ? "Administrador" : "Usuario"} · ${user?.role === "ADMIN" ? "sin límites" : user?.plan === "PREMIUM" ? "Premium" : "Plan gratuito"}</small></div></div>
                  <button type="button" class="user-menu-item" role="menuitem" data-my-account>${icon("user")}Mi cuenta</button>
                  <a class="user-menu-item" role="menuitem" href="#/settings" data-close-menu>${icon("settings")}Configuración</a>
                  <button type="button" class="user-menu-item danger" role="menuitem" data-logout>${icon("logout")}Cerrar sesión</button>
                </div>
              </div>
            </div>
          </header>
          ${user?.demo ? `<aside class="demo-banner" aria-label="Cuenta de demostración">${icon("info")}<span>Estás en una <strong>cuenta de demostración compartida</strong>${user.role === "ADMIN" ? " de administración (solo lectura)" : ""}. Lo que hagas es real y queda guardado, pero otras personas que usen este botón también lo ven. <a href="#/register" data-demo-register>Crea tu cuenta</a> para tener tus datos privados.</span></aside>` : ""}
          <main class="page" id="page" tabindex="-1"></main>
        </div>
        <nav class="tabbar" aria-label="Navegación principal">
          <div class="tabbar-scroll" data-tab-scroll>
            ${LEFT.map(tab).join("")}
            <button type="button" class="tab-measure" data-tab="measure" data-measure-tab aria-haspopup="dialog"><span class="tab-measure-ring">${icon("drop")}</span><span>Medir</span></button>
            ${user?.role === "ADMIN" ? "" : tab(CARE)}
            ${RIGHT.map(tab).join("")}
            ${user?.role === "ADMIN" ? tab(ADMIN) : ""}
          </div>
        </nav>
      </div>`;
    this.root = root;
    this.page = root.querySelector("#page");
    this.aqua = new AquaBot(root.querySelector(".shell"), { onTourEnd: () => this.#centerActive() });
    this.#bind();
    this.refreshDevice();
    this.refreshAlerts();
    this.refreshPlace();
    this.aqua.maybeFirstTour();
  }

  activate(name, title) {
    bus.emit("topmenu:open", null);
    this.root.querySelectorAll("[data-route]").forEach((link) => {
      const active = link.dataset.route === name;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    this.#centerActive();
    this.root.querySelector("[data-title]").textContent = title;
    document.title = `${title} · Aqua Assistant AI`;
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
    pill.setAttribute("aria-label", connected ? `Medidor: ${label}` : "Sin medidor conectado");
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
    // Only one menu of the top bar is open at a time: opening one closes the others (they stop the click, so their
    // "click outside" would never hear it), and changing screens closes them all.
    this.#offs.push(bus.on("topmenu:open", (which) => {
      if (which !== "alerts" && !panel.hidden) { panel.hidden = true; bell.setAttribute("aria-expanded", "false"); }
    }));
    bell.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (panel.hidden) { bus.emit("topmenu:open", "alerts"); await this.refreshAlerts(); }
      panel.hidden = !panel.hidden;
      bell.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) this.#renderAlertPanel();
    });
    document.addEventListener("click", this.#closePanel = (event) => {
      if (!panel.hidden && !panel.contains(event.target)) { panel.hidden = true; bell.setAttribute("aria-expanded", "false"); }
    });
    // Keyboard users skip the menu (a "#page" link would change the screen, because the router uses the hash).
    this.root.querySelector("[data-skip]").addEventListener("click", () => {
      this.page.focus();
      this.page.scrollIntoView({ block: "start" });
    });
    this.#bindUserMenu();
    this.#bindPlaceMenu();
    // The photo is downloaded after the frame is drawn, and again whenever the user changes it.
    const showAvatar = async (current) => {
      const slot = this.root.querySelector("[data-avatar]");
      if (!slot || !current) return;
      const url = await avatarUrl(current);
      slot.innerHTML = avatarMarkup(current, url);
      const big = this.root.querySelector("[data-avatar-big]");
      if (big) big.innerHTML = avatarMarkup(current, url, "avatar-lg");
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

  /** The active place in the top bar, and the list to change it. */
  async refreshPlace() {
    try {
      this.places = await api.get("/places");
      const active = this.places.find((p) => p.active) || this.places[0];
      const chip = this.root.querySelector("[data-place-chip]");
      if (!active || !chip) return;
      const label = chip.querySelector("[data-place-name]");
      label.textContent = active.name;
      // The person's own name for the place is not translated ("Mi agua", created by the app, is).
      if (active.name === "Mi agua") label.removeAttribute("translate"); else label.setAttribute("translate", "no");
      chip.setAttribute("aria-label", "Cambiar de lugar");
      chip.classList.toggle("shared", active.role !== "OWNER");
    } catch { /* the chip keeps its text */ }
  }

  #renderPlaceMenu() {
    const menu = this.root.querySelector("[data-place-menu]");
    menu.innerHTML = `<p class="menu-title">¿Qué agua quieres ver?</p><p class="menu-hint">Cada lugar guarda sus propias mediciones. Elige uno y toda la app cambia a ese lugar.</p>${(this.places || []).map((p) => `<button type="button" class="user-menu-item ${p.active ? "current" : ""}" role="menuitemradio" aria-checked="${p.active}" data-place="${p.id}">
        ${icon(p.active ? "check" : "pin")}<span>${own(p.name)}<small class="muted">${esc(p.kindLabel)}${p.role !== "OWNER" ? ` · ${esc(p.roleLabel)}` : ""}</small></span></button>`).join("")}
      <div class="menu-sep" role="separator"></div>
      ${session.user?.role === "ADMIN" ? `<a class="user-menu-item" role="menuitem" href="#/care" data-manage>${icon("flask")}Cuidado de este lugar</a>` : ""}
      <a class="user-menu-item" role="menuitem" href="#/places" data-manage>${icon("pin")}Crear, editar o compartir lugares</a>`;
  }

  #bindPlaceMenu() {
    const chip = this.root.querySelector("[data-place-chip]");
    const menu = this.root.querySelector("[data-place-menu]");
    const items = () => [...menu.querySelectorAll("[role^=menuitem]")];
    const close = (focusChip = false) => {
      if (menu.hidden) return;
      menu.hidden = true;
      chip.setAttribute("aria-expanded", "false");
      if (focusChip) chip.focus();
    };
    this.#offs.push(bus.on("topmenu:open", (which) => { if (which !== "place") close(); }));
    chip.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!menu.hidden) { close(); return; }
      bus.emit("topmenu:open", "place");
      this.#renderPlaceMenu();
      menu.hidden = false;
      chip.setAttribute("aria-expanded", "true");
      (menu.querySelector(".current") || items()[0])?.focus();
    });
    menu.addEventListener("keydown", (event) => {
      const list = items();
      const at = list.indexOf(document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); close(true); }
      else if (event.key === "ArrowDown") { event.preventDefault(); list[(at + 1) % list.length].focus(); }
      else if (event.key === "ArrowUp") { event.preventDefault(); list[(at - 1 + list.length) % list.length].focus(); }
      else if (event.key === "Tab") close();
    });
    menu.addEventListener("click", async (event) => {
      const item = event.target.closest("[data-place]");
      if (event.target.closest("[data-manage]")) { close(); return; }
      if (!item) return;
      close();
      if (item.classList.contains("current")) return;
      try {
        const place = await api.post(`/places/${item.dataset.place}/activate`);
        toast(`Ahora estás en "${place.name}".`, "ok", 2500);
        bus.emit("place:changed", place);
      } catch (error) {
        toast(error.message, "error");
      }
    });
    const outside = (event) => { if (!menu.hidden && !menu.contains(event.target) && !chip.contains(event.target)) close(); };
    document.addEventListener("click", outside);
    this.#offs.push(() => document.removeEventListener("click", outside));
    // Another place means other measurements, alerts and analyses: the open screen is drawn again.
    this.#offs.push(bus.on("place:changed", () => {
      this.refreshPlace();
      this.refreshAlerts();
      this.ctx.router.resolve();
    }));
  }

  /** On a phone the bar scrolls sideways: the open screen is brought into view. */
  #centerActive() {
    const current = this.root.querySelector(".tabbar .active");
    const scroller = this.root.querySelector("[data-tab-scroll]");
    if (!current || !scroller) return;
    const left = current.offsetLeft - (scroller.clientWidth - current.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: reducedMotion() ? "auto" : "smooth" });
  }

  /** The user's menu (initial or name, top right): the account and the only place to sign out. */
  #bindUserMenu() {
    const chip = this.root.querySelector("[data-account]");
    const menu = this.root.querySelector("[data-user-menu]");
    const items = () => [...menu.querySelectorAll("[role=menuitem]")];
    const close = (focusChip = false) => {
      if (menu.hidden) return;
      menu.hidden = true;
      chip.setAttribute("aria-expanded", "false");
      if (focusChip) chip.focus();
    };
    const open = () => {
      bus.emit("topmenu:open", "account");
      menu.hidden = false;
      chip.setAttribute("aria-expanded", "true");
      items()[0].focus();
    };
    this.#offs.push(bus.on("topmenu:open", (which) => { if (which !== "account") close(); }));
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    menu.addEventListener("keydown", (event) => {
      const list = items();
      const at = list.indexOf(document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); close(true); }
      else if (event.key === "ArrowDown") { event.preventDefault(); list[(at + 1) % list.length].focus(); }
      else if (event.key === "ArrowUp") { event.preventDefault(); list[(at - 1 + list.length) % list.length].focus(); }
      else if (event.key === "Tab") close();
    });
    const outside = (event) => { if (!menu.hidden && !menu.contains(event.target) && !chip.contains(event.target)) close(); };
    document.addEventListener("click", outside);
    this.#offs.push(() => document.removeEventListener("click", outside));
    menu.querySelector("[data-my-account]").addEventListener("click", () => { close(); openAccountDialog(); });
    menu.querySelector("[data-close-menu]").addEventListener("click", () => close());
    menu.querySelector("[data-logout]").addEventListener("click", () => { close(); this.logout(); });
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
