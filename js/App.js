import { Router } from "./core/Router.js";
import { session } from "./core/Session.js";
import { bus } from "./core/EventBus.js";
import { api, ApiError } from "./core/Api.js";
import { theme } from "./core/Theme.js";
import { liveStream } from "./core/LiveStream.js";
import { emptyState, enableCapsLockHints, enableRipples, enableScrollableTables, enableToggleGroups, toast } from "./ui/Components.js";
import { Shell } from "./views/Shell.js";
import { loginView, registerView, forgotView, resetView, verifyAdminView } from "./views/Auth.js";
import { waitForServer } from "./core/ServerWake.js";
import { watchSessionExpiry } from "./core/SessionTimer.js";
import { lazyView } from "./core/LazyView.js";

// Screens of the signed-in application, loaded on first use.
const dashboardView = lazyView({ name: "dashboard", title: "Inicio" }, () => import("./views/Dashboard.js"), "dashboardView");
const historyView = lazyView({ name: "history", title: "Historial de mediciones" }, () => import("./views/History.js"), "historyView");
const intelligenceView = lazyView({ name: "intelligence", title: "Centro de análisis IA" }, () => import("./views/Intelligence.js"), "intelligenceView");
const devicesView = lazyView({ name: "devices", title: "Conexión del dispositivo" }, () => import("./views/Devices.js"), "devicesView");
const profilesView = lazyView({ name: "profiles", title: "Perfiles de agua" }, () => import("./views/Profiles.js"), "profilesView");
const settingsView = lazyView({ name: "settings", title: "Configuración" }, () => import("./views/Settings.js"), "settingsView");
const billingView = lazyView({ name: "billing", title: "Plan y pagos" }, () => import("./views/Billing.js"), "billingView");
const adminView = lazyView({ name: "admin", title: "Administración" }, () => import("./views/Admin.js"), "adminView");
const sessionsView = lazyView({ name: "sessions", title: "Historial de sesiones" }, () => import("./views/Sessions.js"), "sessionsView");
const officialDataView = lazyView({ name: "official", title: "Datos oficiales" }, () => import("./views/OfficialData.js"), "officialDataView");
const LAZY = Object.fromEntries([dashboardView, historyView, intelligenceView, devicesView, profilesView, settingsView, billingView,
  adminView, sessionsView, officialDataView].map((v) => [v.name, v]));

// Pointing at (or tabbing to) a link starts downloading its screen, so opening it feels immediate.
const preloadFrom = (event) => {
  const link = event.target.closest?.('a[href^="#/"]');
  if (link) LAZY[link.getAttribute("href").slice(2).split(/[/?]/)[0]]?.preload();
};
document.addEventListener("pointerover", preloadFrom, { passive: true });
document.addEventListener("focusin", preloadFrom);

const root = document.getElementById("app");
const ctx = { settings: null, router: null };
let shell = null;
let cleanup = null;
let renderId = 0;

async function loadSettings() {
  try {
    ctx.settings = await api.get("/users/me/settings");
    theme.apply(ctx.settings.theme);
  } catch { /* the view will show its own error */ }
}

async function show(view, route) {
  cleanup?.();
  cleanup = null;
  const id = ++renderId;
  const stale = () => id !== renderId;
  if (view.layout === "auth") {
    shell?.destroy();
    shell = null;
    liveStream.stop();
    root.innerHTML = "";
    const done = await view.render(root, { ...ctx, route, stale });
    if (stale()) done?.(); else cleanup = done;
    return;
  }
  if (!shell) {
    shell = new Shell(root, ctx);
    await loadSettings();
    if (stale()) return;
  }
  shell.activate(view.name, view.title);
  const page = shell.page;
  page.innerHTML = "";
  page.classList.remove("page-enter");
  void page.offsetWidth;
  page.classList.add("page-enter");
  let done;
  try {
    done = await view.render(page, { ...ctx, route, shell, stale });
  } catch (error) {
    // The code of the screen could not be downloaded (connection lost, or a new version was published meanwhile).
    if (stale()) return;
    page.innerHTML = emptyState("error", "No se pudo abrir esta pantalla",
      "Revisa tu conexión y recarga la página. Si se publicó una versión nueva de AquaSense, recargar la descarga.",
      `<button class="btn btn-primary" data-reload>Recargar</button>`);
    page.querySelector("[data-reload]").addEventListener("click", () => location.reload());
    console.warn("Screen could not be rendered:", error);
    return;
  }
  if (stale()) done?.(); else cleanup = done;
  // Keyboard and screen reader users continue at the new screen instead of the link they pressed.
  if (!stale() && document.activeElement?.closest?.(".sidebar, .bottom-nav, .quick-links")) page.focus({ preventScroll: true });
}

ctx.router = new Router(show)
  .add("login", loginView, { public: true, guestOnly: true })
  .add("register", registerView, { public: true, guestOnly: true })
  .add("forgot-password", forgotView, { public: true, guestOnly: true })
  .add("reset-password", resetView, { public: true })
  .add("verify-admin", verifyAdminView, { public: true })
  .add("dashboard", dashboardView)
  .add("history", historyView)
  .add("intelligence", intelligenceView)
  .add("devices", devicesView)
  .add("profiles", profilesView)
  .add("settings", settingsView)
  .add("billing", billingView)
  .add("sessions", sessionsView)
  .add("official", officialDataView)
  .add("admin", adminView);

let slowNoticeShown = false;
bus.on("api:slow", () => {
  if (slowNoticeShown) return;
  slowNoticeShown = true;
  toast("El servidor se está activando; la primera respuesta puede tardar hasta un minuto.", "info", 9000);
});

bus.on("session:expired", () => {
  toast("Tu sesión expiró. Inicia sesión de nuevo.", "warn");
  ctx.router.go("login");
});

bus.on("settings:changed", (settings) => { ctx.settings = settings; });

// Without internet nothing can be saved or asked to the AI: a fixed bar says so until the connection returns.
const offline = document.createElement("div");
offline.className = "offline-bar";
offline.setAttribute("role", "status");
offline.hidden = navigator.onLine !== false;
offline.textContent = "Sin conexión a internet. Lo que hagas no se guardará hasta que vuelva la conexión.";
document.body.append(offline);
window.addEventListener("offline", () => { offline.hidden = false; });
window.addEventListener("online", () => {
  offline.hidden = true;
  toast("Conexión recuperada.", "ok", 2500);
});

watchSessionExpiry({ onWarn: () => toast("Tu sesión vence en 5 minutos. Guarda lo que estés haciendo; luego tendrás que iniciar sesión de nuevo.", "warn", 15000) });

enableRipples();

// A failure that no screen handled (for example, a button whose code breaks) shows a notice instead of doing nothing
// in silence. The detail stays in the console for diagnosis.
const unexpected = (error) => {
  if (!error || error.name === "AbortError") return;
  toast(error instanceof ApiError ? error.message : "Algo no funcionó como se esperaba en esta pantalla. Si se repite, recarga la página.", "error", 7000);
};
window.addEventListener("unhandledrejection", (event) => unexpected(event.reason));
window.addEventListener("error", (event) => { if (event.error) unexpected(event.error); });
enableToggleGroups();
enableScrollableTables();
enableCapsLockHints();
theme.apply(theme.preference);
if (!session.isAuthenticated && !location.hash.startsWith("#/register") && !location.hash.startsWith("#/forgot")
    && !location.hash.startsWith("#/reset") && !location.hash.startsWith("#/verify-admin")) {
  location.hash = "#/login";
}
// Wait until the backend is awake before the first API call (see ServerWake.js).
const wake = document.createElement("div");
wake.className = "wake-overlay";
wake.hidden = true;
wake.setAttribute("role", "status");
wake.innerHTML = `<div class="wake-card"><div class="spinner"></div><strong>Activando el servidor...</strong>
  <p>El servidor gratuito se apaga cuando nadie lo usa y tarda hasta un minuto en arrancar. Espera un momento.</p></div>`;
document.body.append(wake);
waitForServer(() => { wake.hidden = false; }).then((up) => {
  if (up) {
    wake.remove();
    ctx.router.resolve();
    return;
  }
  wake.querySelector(".wake-card").innerHTML = `<strong>No se pudo conectar con el servidor</strong>
    <p>Revisa tu conexión a internet e inténtalo de nuevo.</p><button class="btn btn-primary" data-wake-retry>Reintentar</button>`;
  wake.querySelector("[data-wake-retry]").addEventListener("click", () => location.reload());
});
