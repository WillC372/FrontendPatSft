import { api } from "../core/Api.js";
import { esc } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { confirmDialog, emptyState, loading, toast } from "../ui/Components.js";

const PAGE_SIZE = 10;
const day = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const hour = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });
const stamp = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const BADGE = { OPEN: "badge-ok", ENDED: "badge-info", EXPIRED: "badge-warn" };

function duration(minutes) {
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `${h} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
}

function period(s) {
  const start = new Date(s.startedAt);
  const end = new Date(s.endedAt || s.lastActivityAt);
  const sameDay = start.toDateString() === end.toDateString();
  const until = s.status === "OPEN" ? "ahora" : sameDay ? hour.format(end) : `${day.format(end)}, ${hour.format(end)}`;
  return `${day.format(start)} · ${hour.format(start)} – ${until}`;
}

function card(s) {
  const done = Object.entries(s.actions || {});
  return `<article class="session-card${s.current ? " current" : ""}" data-sid="${s.id}">
    <div class="row-between">
      <div><strong>${esc(period(s))}</strong>
        <div class="muted small">${esc(duration(s.durationMinutes))}${s.client ? ` · ${esc(s.client)}` : ""}${s.rememberMe ? " · sesión recordada" : ""}</div></div>
      <div class="row"><span class="badge ${BADGE[s.status] || "badge-info"}">${esc(s.current ? "Sesión actual" : s.statusLabel)}</span></div>
    </div>
    <div class="session-actions">${done.length
      ? done.map(([label, n]) => `<span class="chip">${esc(label)} <b>${n}</b></span>`).join("")
      : `<span class="muted small">No hizo cambios en esta sesión (solo consultó).</span>`}</div>
    <button class="btn btn-ghost btn-sm" data-open aria-expanded="false">${icon("history")}Ver lo que se hizo</button>
    <ol class="session-timeline" data-timeline hidden></ol>
  </article>`;
}

/**
 * List of sessions with what was done in each one. {@code base}: "/users/me/sessions" (own history) or
 * "/admin/users/{id}/sessions" (administration).
 */
export async function sessionList(host, base) {
  let page = 0;
  host.innerHTML = loading();
  const load = async () => {
    const data = await api.get(base, { page, size: PAGE_SIZE });
    if (page === 0) host.innerHTML = data.items.length ? `<div class="session-list" data-list></div>` : emptyState("history", "Aún no hay sesiones", "Cada inicio de sesión aparecerá aquí.");
    const list = host.querySelector("[data-list]");
    if (!list) return;
    list.insertAdjacentHTML("beforeend", data.items.map(card).join(""));
    host.querySelector("[data-more]")?.remove();
    if (data.page + 1 < data.totalPages) {
      host.insertAdjacentHTML("beforeend", `<button class="btn" data-more style="margin-top:12px">Ver sesiones anteriores (${data.total - (data.page + 1) * PAGE_SIZE} más)</button>`);
      host.querySelector("[data-more]").addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        page += 1;
        try { await load(); } catch (error) { toast(error.message, "error"); e.currentTarget.disabled = false; }
      });
    }
  };
  host.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-open]");
    if (!button) return;
    const article = button.closest("[data-sid]");
    const timeline = article.querySelector("[data-timeline]");
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    timeline.hidden = open;
    button.lastChild.textContent = open ? "Ver lo que se hizo" : "Ocultar";
    if (open || timeline.dataset.loaded) return;
    timeline.innerHTML = `<li class="muted">Cargando...</li>`;
    try {
      const detail = await api.get(`${base}/${article.dataset.sid}`);
      timeline.dataset.loaded = "1";
      timeline.innerHTML = detail.actions.length ? detail.actions.map((a) => `<li><time>${esc(stamp.format(new Date(a.at)))}</time>
        <span><strong>${esc(a.label)}</strong>${a.detail ? `<small class="muted">${esc(a.detail)}</small>` : ""}</span></li>`).join("")
        : `<li class="muted">No hay acciones registradas en esta sesión.</li>`;
    } catch (error) {
      timeline.innerHTML = `<li class="muted">${esc(error.message)}</li>`;
    }
  });
  try {
    await load();
  } catch (error) {
    host.innerHTML = emptyState("error", "No se pudo cargar el historial de sesiones", error.message);
  }
}

export const sessionsView = {
  name: "sessions",
  title: "Historial de sesiones",
  async render(root) {
    root.innerHTML = `
      <div class="row-between reveal">
        <div><h1>Historial de sesiones</h1>
          <p class="muted">Cada vez que inicias sesión empieza una sesión nueva. Aquí queda lo que hiciste en cada una, desde que entraste hasta que la cerraste.</p></div>
        <button class="btn" data-close-others>${icon("logout")}Cerrar mis otras sesiones</button>
      </div>
      <section class="card reveal" data-sessions></section>`;
    root.querySelector("[data-close-others]").addEventListener("click", async (event) => {
      const ok = await confirmDialog("Cerrar las otras sesiones", "Se cerrarán las sesiones abiertas en otros navegadores o equipos. Esta sesión sigue abierta.", "Cerrar las otras");
      if (!ok) return;
      event.currentTarget.disabled = true;
      try {
        const r = await api.post("/users/me/sessions/close-others");
        toast(r.message, "ok");
        await sessionList(root.querySelector("[data-sessions]"), "/users/me/sessions");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        event.currentTarget.disabled = false;
      }
    });
    await sessionList(root.querySelector("[data-sessions]"), "/users/me/sessions");
    return null;
  },
};
