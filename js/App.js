import { Router } from "./core/Router.js";
import { session } from "./core/Session.js";
import { bus } from "./core/EventBus.js";
import { api } from "./core/Api.js";
import { theme } from "./core/Theme.js";
import { liveStream } from "./core/LiveStream.js";
import { enableRipples, enableToggleGroups, toast } from "./ui/Components.js";
import { Shell } from "./views/Shell.js";
import { loginView, registerView, forgotView, resetView, verifyAdminView } from "./views/Auth.js";
import { dashboardView } from "./views/Dashboard.js";
import { historyView } from "./views/History.js";
import { intelligenceView } from "./views/Intelligence.js";
import { devicesView } from "./views/Devices.js";
import { profilesView } from "./views/Profiles.js";
import { settingsView } from "./views/Settings.js";
import { billingView } from "./views/Billing.js";
import { waitForServer } from "./core/ServerWake.js";
import { adminView } from "./views/Admin.js";
import { sessionsView } from "./views/Sessions.js";
import { officialDataView } from "./views/OfficialData.js";

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
  const done = await view.render(page, { ...ctx, route, shell, stale });
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

enableRipples();
enableToggleGroups();
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
