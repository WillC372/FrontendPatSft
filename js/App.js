import { Router } from "./core/Router.js";
import { session } from "./core/Session.js";
import { bus } from "./core/EventBus.js";
import { api } from "./core/Api.js";
import { theme } from "./core/Theme.js";
import { liveStream } from "./core/LiveStream.js";
import { enableRipples, toast } from "./ui/Components.js";
import { Shell } from "./views/Shell.js";
import { loginView, registerView, forgotView, resetView, verifyAdminView } from "./views/Auth.js";
import { dashboardView } from "./views/Dashboard.js";
import { historyView } from "./views/History.js";
import { intelligenceView } from "./views/Intelligence.js";
import { devicesView } from "./views/Devices.js";
import { profilesView } from "./views/Profiles.js";
import { settingsView } from "./views/Settings.js";
import { billingView } from "./views/Billing.js";
import { adminView } from "./views/Admin.js";

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
    liveStream.start();
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
  .add("admin", adminView);

bus.on("session:expired", () => {
  toast("Tu sesión expiro. Inicia sesión de nuevo.", "warn");
  ctx.router.go("login");
});

bus.on("settings:changed", (settings) => { ctx.settings = settings; });

enableRipples();
theme.apply(theme.preference);
if (!session.isAuthenticated && !location.hash.startsWith("#/register") && !location.hash.startsWith("#/forgot")
    && !location.hash.startsWith("#/reset") && !location.hash.startsWith("#/verify-admin")) {
  location.hash = "#/login";
}
ctx.router.resolve();
