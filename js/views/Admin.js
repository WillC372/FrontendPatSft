import { api } from "../core/Api.js";
import { esc, fmt, relativeTime } from "../core/Format.js";
import { session } from "../core/Session.js";
import { icon } from "../ui/Icons.js";
import { countUp, emptyState, loading, modal, toast } from "../ui/Components.js";
import { sessionList } from "./Sessions.js";

const PAGE_SIZE = 12;
const SOURCES = { REAL: "Medidor", MANUAL: "Manual", PHOTO: "Foto IA", SIMULATED: "Simulador" };
const PAY_STATUS = { APPROVED: "badge-ok", PENDING: "badge-warn", DECLINED: "badge-crit", ERROR: "badge-crit", EXPIRED: "" };
const longDate = (iso) => new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(iso));
const money = (value, currency) => `${currency} ${Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
const int = (v) => Number(v || 0).toLocaleString("es");
const many = (n, one, other) => `${int(n)} ${Number(n) === 1 ? one : other}`;

function initials(name) {
  return esc((name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join(""));
}

function roleBadge(u) {
  if (u.role !== "ADMIN") return `<span class="badge badge-plain">${icon("user")}Usuario</span>`;
  return `<span class="badge badge-info">${icon("shield")}${u.configuredAdmin ? "Admin principal" : "Administrador"}</span>`;
}

function planBadge(u) {
  if (u.plan !== "PREMIUM") return `<span class="badge badge-ok">Gratuito</span>`;
  const until = u.manualPremium ? "sin vencimiento" : `hasta ${fmt.day(new Date(u.premiumUntil))}`;
  return `<span class="badge badge-info">${icon("star")}Premium</span><small class="muted cell-note">${until}</small>`;
}

function statusBadge(u) {
  return u.enabled ? `<span class="badge badge-ok">${icon("check")}Activa</span>` : `<span class="badge badge-crit">${icon("ban")}Desactivada</span>`;
}

function summaryCards(s) {
  const p = s.payments;
  return `
    <div class="admin-kpis">
      <div class="stat"><span>Usuarios</span><strong data-count-to="${s.users}">0</strong><small>${many(s.newLast7Days, "nuevo", "nuevos")} en 7 días</small></div>
      <div class="stat"><span>Activos 7 días</span><strong data-count-to="${s.activeLast7Days}">0</strong><small>iniciaron sesión</small></div>
      <div class="stat"><span>Premium</span><strong data-count-to="${s.premium}">0</strong><small>${int(s.premiumPaid)} pagado · ${int(s.premiumManual)} asignado</small></div>
      <div class="stat"><span>Administradores</span><strong data-count-to="${s.admins}">0</strong><small>${many(s.disabled, "cuenta desactivada", "cuentas desactivadas")}</small></div>
      <div class="stat"><span>Mediciones</span><strong data-count-to="${s.measurements}">0</strong><small>${int(s.measurementsLast7Days)} en 7 días</small></div>
      <div class="stat"><span>Ingresos reales</span><strong>${money(p.amountReal, p.currency)}</strong>
        <small>${many(p.approvedReal, "pago real", "pagos reales")} · ${int(p.approvedTest)} de prueba</small></div>
    </div>`;
}

function planCard(s) {
  const plan = s.plan;
  return `
    <section class="card admin-plan reveal">
      <div class="card-head"><div class="card-title">${icon("card")}Plan Premium</div>
        ${plan.testMode ? `<span class="badge badge-sim">${icon("flask")}Modo de pruebas</span>` : `<span class="badge badge-ok">Cobro real</span>`}</div>
      <dl class="kv">
        <dt>Precio</dt><dd>${money(plan.price, plan.currency)} por ${plan.periodDays} días</dd>
        <dt>Pasarela</dt><dd>${esc(plan.provider)} · ${plan.paymentsEnabled ? "pagos habilitados" : "pagos deshabilitados"}</dd>
        <dt>De prueba</dt><dd>${many(s.payments.approvedTest, "aprobado", "aprobados")} (${money(s.payments.amountTest, s.payments.currency)}, sin dinero real)</dd>
        <dt>Otros</dt><dd>${many(s.payments.pending, "pendiente", "pendientes")} · ${many(s.payments.declined, "rechazado", "rechazados")}</dd>
      </dl>
      <p class="muted admin-note">${icon("info")}<span>El precio y la pasarela se configuran en el servidor (variables <span class="mono">PAYMENTS_*</span>). Desde aquí puedes dar Premium a mano, con o sin vencimiento.</span></p>
    </section>`;
}

function usersTable(page) {
  if (!page.items.length) return emptyState("users", "Sin resultados", "Ninguna cuenta coincide con la búsqueda o los filtros.");
  const rows = page.items.map((u) => `
    <tr data-user="${u.id}" class="${u.enabled ? "" : "row-off"}" tabindex="0" aria-label="Gestionar ${esc(u.fullName)}">
      <td><div class="who"><span class="avatar">${initials(u.fullName)}</span><div><strong>${esc(u.fullName)}${u.self ? ` <small class="muted">(tú)</small>` : ""}${u.demo ? ` <span class="badge badge-sim">Demo</span>` : ""}</strong><small>${esc(u.email)}</small></div></div></td>
      <td>${roleBadge(u)}</td>
      <td><div class="plan-cell">${planBadge(u)}</div></td>
      <td>${statusBadge(u)}</td>
      <td class="num" data-label="mediciones">${int(u.measurements)}</td>
      <td>${u.lastLoginAt ? `${relativeTime(u.lastLoginAt)}` : `<span class="muted">Nunca</span>`}</td>
      <td class="num">${fmt.dateTime(u.createdAt)}</td>
      <td><button class="btn btn-ghost icon-btn manage-btn" data-manage="${u.id}" aria-label="Gestionar ${esc(u.fullName)}" title="Gestionar">${icon("chevronRight")}</button></td>
    </tr>`).join("");
  const from = page.page * page.size + 1;
  const to = page.page * page.size + page.items.length;
  return `
    <div class="table-wrap admin-users"><table>
      <thead><tr><th>Usuario</th><th>Rol</th><th>Plan</th><th>Estado</th><th>Mediciones</th><th>Último ingreso</th><th>Registro</th><th><span class="sr-only">Acciones</span></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div class="row-between pager">
      <span class="muted">${from}–${to} de ${int(page.total)}</span>
      <div class="row">
        <button class="btn btn-sm" data-page="${page.page - 1}" ${page.page <= 0 ? "disabled" : ""}>Anterior</button>
        <span class="muted">Página ${page.page + 1} de ${Math.max(1, page.totalPages)}</span>
        <button class="btn btn-sm" data-page="${page.page + 1}" ${page.page + 1 >= page.totalPages ? "disabled" : ""}>Siguiente</button>
      </div>
    </div>`;
}

function paymentsTable(list) {
  if (!list.length) return emptyState("card", "Sin pagos", "Todavía nadie ha iniciado un pago.");
  return `<div class="table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Usuario</th><th>Referencia</th><th>Valor</th><th>Estado</th><th>Medio</th><th>Modo</th></tr></thead>
    <tbody>${list.map((p) => `<tr>
      <td class="num">${fmt.dateTime(p.createdAt)}</td>
      <td>${p.userId ? `<button class="link-btn" data-user-link="${p.userId}">${esc(p.userEmail || `#${p.userId}`)}</button>` : "--"}</td>
      <td class="mono">${esc(p.referenceCode)}</td>
      <td class="num">${money(p.amount, p.currency)}</td>
      <td><span class="badge ${PAY_STATUS[p.status] ?? ""}">${esc(p.statusLabel)}</span></td>
      <td>${esc(p.paymentMethod || "--")}</td>
      <td>${p.testMode ? `<span class="badge badge-sim">Prueba</span>` : `<span class="badge badge-ok">Real</span>`}</td>
    </tr>`).join("")}</tbody></table></div>`;
}

function activityList(list, withUser) {
  if (!list.length) return `<p class="muted">Sin actividad registrada.</p>`;
  return `<ol class="admin-log">${list.map((a) => `
    <li><span class="when" title="${esc(fmt.dateTime(a.createdAt))}">${esc(fmt.dateTime(a.createdAt))}</span>
      <div><strong>${esc(a.label)}</strong>${withUser && a.userEmail ? ` <small class="muted">por ${esc(a.userEmail)}</small>` : ""}
      ${a.detail ? `<small class="detail">${esc(a.detail)}</small>` : ""}</div></li>`).join("")}</ol>`;
}

/** Account management dialog: details, plan, role, status, payments and activity. */
async function manageUser(id, onChange) {
  let detail;
  try {
    detail = await api.get(`/admin/users/${id}`);
  } catch (error) {
    toast(error.message, "error");
    return;
  }
  await modal({
    title: "Gestionar cuenta",
    body: `<div data-detail>${detailBody(detail)}</div>`,
    actions: [{ label: "Cerrar", className: "btn-ghost", value: null }],
    onMount: (node, close) => {
      node.querySelector(".modal").classList.add("modal-wide");
      const host = node.querySelector("[data-detail]");
      host.addEventListener("click", (event) => {
        const open = event.target.closest("[data-sessions-open]");
        if (!open) return;
        const box = open.nextElementSibling;
        open.remove();
        box.hidden = false;
        sessionList(box, `/admin/users/${id}/sessions`);
      });
      const bind = () => {
        const send = async (button, path, body, okText) => {
          button.disabled = true;
          try {
            detail = await api.put(`/admin/users/${id}/${path}`, body);
            const typed = path === "status" ? "" : host.querySelector("[data-reason]")?.value ?? "";
            host.innerHTML = detailBody(detail);
            const reasonBox = host.querySelector("[data-reason]");
            if (reasonBox) reasonBox.value = typed;
            bind();
            toast(okText, "ok");
            onChange();
          } catch (error) {
            toast(error.message, "error");
            button.disabled = false;
          }
        };
        const planSel = host.querySelector("[data-plan]");
        const daysSel = host.querySelector("[data-days]");
        const syncDays = () => { daysSel.disabled = planSel.value !== "PREMIUM"; };
        planSel.addEventListener("change", syncDays);
        syncDays();
        host.querySelector("[data-save-plan]").addEventListener("click", (e) => {
          const body = { plan: planSel.value };
          if (planSel.value === "PREMIUM" && daysSel.value) body.days = Number(daysSel.value);
          send(e.currentTarget, "plan", body, "Plan actualizado.");
        });
        host.querySelector("[data-role]")?.addEventListener("click", (e) => {
          const target = e.currentTarget.dataset.role;
          confirmInline(e.currentTarget, target === "ADMIN"
            ? "Tendrá acceso a esta pantalla y a los datos de todos los usuarios. Sus sesiones abiertas se cerrarán."
            : "Perderá el acceso a la administración. Sus sesiones abiertas se cerrarán.",
          () => send(e.currentTarget, "role", { role: target }, target === "ADMIN" ? "Ahora es administrador." : "Ahora es usuario."));
        });
        host.querySelector("[data-disable]")?.addEventListener("click", (e) => {
          const reason = host.querySelector("[data-reason]").value.trim();
          confirmInline(e.currentTarget, "No podrá iniciar sesión y sus sesiones abiertas se cerrarán. Sus datos se conservan.",
            () => send(e.currentTarget, "status", { enabled: false, reason: reason || null }, "Cuenta desactivada."));
        });
        host.querySelector("[data-enable]")?.addEventListener("click", (e) => send(e.currentTarget, "status", { enabled: true }, "Cuenta reactivada."));
        const typed = host.querySelector("[data-delete-confirm]");
        const remove = host.querySelector("[data-delete]");
        typed?.addEventListener("input", () => { remove.disabled = typed.value.trim().toLowerCase() !== detail.user.email.toLowerCase(); });
        remove?.addEventListener("click", (e) => {
          confirmInline(e.currentTarget, "Se borran para siempre la cuenta y todos sus datos. No se puede deshacer.", async () => {
            remove.disabled = true;
            try {
              await api.delete(`/admin/users/${id}`);
              toast("Cuenta eliminada con todos sus datos.", "ok");
              onChange();
              close(true);
            } catch (error) {
              toast(error.message, "error");
              remove.disabled = false;
            }
          });
        });
      };
      bind();
    },
  });
}

/** Second click to confirm, inside the same dialog (avoids opening a dialog on top of another). */
function confirmInline(button, warning, action) {
  if (button.dataset.armed) { action(); return; }
  button.dataset.armed = "1";
  const original = button.innerHTML;
  button.innerHTML = `${icon("alert")}Confirmar`;
  button.classList.add("btn-danger");
  const note = document.createElement("p");
  note.className = "confirm-note";
  note.textContent = warning;
  button.closest(".admin-action").append(note);
  setTimeout(() => {
    if (!button.isConnected) return;
    delete button.dataset.armed;
    button.innerHTML = original;
    button.classList.remove("btn-danger");
    note.remove();
  }, 6000);
}

function detailBody(d) {
  const u = d.user;
  const s = d.stats;
  const blockedRole = d.guards.roleBlockedReason;
  const blockedStatus = d.guards.statusBlockedReason;
  const sources = Object.entries(s.measurementsBySource).filter(([, n]) => n > 0)
    .map(([k, n]) => `${SOURCES[k] || k}: ${int(n)}`).join(" · ") || "Sin mediciones";
  return `
    <div class="admin-detail">
      <div class="who who-lg"><span class="avatar">${initials(u.fullName)}</span>
        <div><strong>${esc(u.fullName)}${u.self ? ` <small class="muted">(tú)</small>` : ""}${u.demo ? ` <span class="badge badge-sim">Demo</span>` : ""}</strong><small>${esc(u.email)}</small>
          <div class="row" style="margin-top:6px">${roleBadge(u)}${statusBadge(u)}</div></div></div>
      ${!u.enabled ? `<div class="banner banner-crit">${icon("ban")}<p>Desactivada${d.disabledAt ? ` el ${esc(longDate(d.disabledAt))}` : ""}.${d.disabledReason ? ` Motivo: ${esc(d.disabledReason)}` : ""}</p></div>` : ""}

      <div class="stats admin-mini">
        <div class="stat"><span>Mediciones</span><strong>${int(s.measurements)}</strong></div>
        <div class="stat"><span>Perfiles propios</span><strong>${int(s.profiles)}</strong></div>
        <div class="stat"><span>IA (30 días)</span><strong>${int(s.aiCallsLast30Days)}</strong></div>
      </div>
      <dl class="kv">
        <dt>Origen</dt><dd>${esc(sources)}</dd>
        <dt>Última medición</dt><dd>${s.lastMeasurementAt ? esc(fmt.dateTime(s.lastMeasurementAt)) : "--"}</dd>
        <dt>Último ingreso</dt><dd>${u.lastLoginAt ? esc(fmt.dateTime(u.lastLoginAt)) : "Nunca"}</dd>
        <dt>Registro</dt><dd>${esc(fmt.dateTime(u.createdAt))}</dd>
      </dl>

      <section class="admin-action">
        <h3>${icon("star")}Plan</h3>
        <p class="muted">Actual: ${u.plan === "PREMIUM" ? (u.manualPremium ? "Premium sin vencimiento" : `Premium hasta el ${esc(longDate(u.premiumUntil))}`) : "Gratuito"}.
          ${u.plan === "PREMIUM" && !u.manualPremium ? "Cambiarlo reemplaza la fecha pagada." : ""}</p>
        <div class="row">
          <span class="muted">Asignar</span>
          <select class="input" data-plan aria-label="Plan"><option value="FREE" ${u.plan === "FREE" ? "selected" : ""}>Gratuito</option><option value="PREMIUM" ${u.plan === "PREMIUM" ? "selected" : ""}>Premium</option></select>
          <select class="input" data-days aria-label="Duración de Premium">
            <option value="">Sin vencimiento</option><option value="30" ${u.plan === "FREE" ? "selected" : ""}>30 días</option><option value="90">90 días</option><option value="365">1 año</option></select>
          <button class="btn btn-primary" data-save-plan>${icon("check")}Aplicar</button>
        </div>
      </section>

      <section class="admin-action">
        <h3>${icon("shield")}Rol</h3>
        ${blockedRole ? `<p class="muted">${icon("lock")}<span>${esc(blockedRole)}</span></p>`
          : `<button class="btn" data-role="${u.role === "ADMIN" ? "USER" : "ADMIN"}">${icon(u.role === "ADMIN" ? "user" : "shield")}${u.role === "ADMIN" ? "Quitar rol de administrador" : "Hacer administrador"}</button>`}
      </section>

      <section class="admin-action">
        <h3>${icon(u.enabled ? "ban" : "check")}Estado de la cuenta</h3>
        ${u.enabled
          ? (blockedStatus ? `<p class="muted">${icon("lock")}<span>${esc(blockedStatus)}</span></p>`
            : `<textarea class="input" data-reason rows="2" maxlength="300" placeholder="Motivo (opcional). Se incluye en el correo al usuario."></textarea>
               <button class="btn" data-disable>${icon("ban")}Desactivar cuenta</button>`)
          : `<button class="btn btn-primary" data-enable>${icon("check")}Reactivar cuenta</button>`}
      </section>

      <section class="admin-action admin-danger">
        <h3>${icon("trash")}Eliminar cuenta</h3>
        ${d.guards.deleteBlockedReason ? `<p class="muted">${icon("lock")}<span>${esc(d.guards.deleteBlockedReason)}</span></p>`
          : `<p class="muted"><span>Borra para siempre la cuenta y sus mediciones, perfiles, informes y conversaciones. Para conservar sus datos, desactívala en su lugar.</span></p>
             <input class="input" data-delete-confirm placeholder="Escribe ${esc(u.email)} para confirmar" aria-label="Confirma el correo de la cuenta" autocomplete="off">
             <button class="btn btn-danger" data-delete disabled>${icon("trash")}Eliminar definitivamente</button>`}
      </section>

      <section class="admin-action">
        <h3>${icon("card")}Pagos</h3>
        ${d.payments.length ? `<ul class="admin-pays">${d.payments.map((p) => `<li><span class="mono">${esc(p.referenceCode)}</span>
          <span class="badge ${PAY_STATUS[p.status] ?? ""}">${esc(p.statusLabel)}</span>${p.testMode ? `<span class="badge badge-sim">Prueba</span>` : ""}
          <small class="muted">${esc(fmt.dateTime(p.createdAt))} · ${money(p.amount, p.currency)}</small></li>`).join("")}</ul>` : `<p class="muted">Sin pagos.</p>`}
      </section>

      <section class="admin-action">
        <h3>${icon("history")}Actividad reciente</h3>
        ${activityList(d.activity, false)}
      </section>

      <section class="admin-action">
        <h3>${icon("clock")}Historial de sesiones</h3>
        <button class="btn btn-sm" data-sessions-open>Ver sus sesiones y lo que hizo en cada una</button>
        <div data-sessions-box hidden></div>
      </section>
      <p class="muted admin-note">${icon("mail")}<span>Si el correo está configurado, el usuario recibe un aviso de cada cambio de plan, rol o estado.</span></p>
    </div>`;
}

export const adminView = {
  name: "admin",
  title: "Administración",
  async render(root) {
    if (session.user?.role !== "ADMIN") {
      root.innerHTML = emptyState("lock", "Acceso restringido", "Esta sección es solo para administradores.");
      return;
    }
    const state = { tab: "users", q: "", role: "", plan: "", status: "", page: 0 };
    root.innerHTML = `
      <div class="row-between reveal">
        <div><h1>Administración</h1><p class="muted">Usuarios, planes y pagos. Cada cambio queda registrado en la auditoría.</p></div>
        <a class="btn" href="#/settings">${icon("mail")}Correo del sistema</a>
      </div>
      <div data-summary class="reveal">${loading("Cargando cifras...")}</div>
      <section class="card reveal">
        <div class="row-between">
          <div class="tabs" role="tablist" aria-label="Sección">
            <button class="tab active" role="tab" data-tab="users">${icon("users")}Usuarios</button>
            <button class="tab" role="tab" data-tab="payments">${icon("card")}Pagos</button>
            <button class="tab" role="tab" data-tab="activity">${icon("history")}Actividad</button>
          </div>
        </div>
        <div data-filters class="admin-filters">
          <div class="input-wrap">${icon("search")}<input class="input" type="search" data-q placeholder="Buscar por nombre o correo" aria-label="Buscar" maxlength="100"></div>
          <select class="input" data-f="role" aria-label="Rol"><option value="">Todos los roles</option><option value="USER">Usuarios</option><option value="ADMIN">Administradores</option></select>
          <select class="input" data-f="plan" aria-label="Plan"><option value="">Todos los planes</option><option value="FREE">Gratuito</option><option value="PREMIUM">Premium</option></select>
          <select class="input" data-f="status" aria-label="Estado"><option value="">Todos los estados</option><option value="ACTIVE">Activas</option><option value="DISABLED">Desactivadas</option></select>
        </div>
        <div data-body style="margin-top:14px">${loading()}</div>
      </section>
      <div data-plan-card></div>`;

    const body = root.querySelector("[data-body]");
    const filters = root.querySelector("[data-filters]");
    let seq = 0;

    const loadSummary = async () => {
      try {
        const s = await api.get("/admin/summary");
        root.querySelector("[data-summary]").innerHTML = summaryCards(s);
        root.querySelectorAll("[data-count-to]").forEach((n) => countUp(n, Number(n.dataset.countTo), { decimals: 0, duration: 700 }));
        root.querySelector("[data-plan-card]").innerHTML = planCard(s);
      } catch (error) {
        root.querySelector("[data-summary]").innerHTML = `<div class="banner banner-warn">${icon("alert")}<p>${esc(error.message)}</p></div>`;
      }
    };

    const loadBody = async () => {
      const id = ++seq;
      filters.hidden = state.tab !== "users";
      body.innerHTML = loading();
      try {
        let html;
        if (state.tab === "users") {
          const query = { page: state.page, size: PAGE_SIZE };
          for (const k of ["q", "role", "plan", "status"]) if (state[k]) query[k] = state[k];
          html = usersTable(await api.get("/admin/users", query));
        } else if (state.tab === "payments") {
          html = paymentsTable(await api.get("/admin/payments", { limit: 50 }));
        } else {
          html = activityList(await api.get("/admin/activity", { limit: 50 }), true);
        }
        if (id === seq) body.innerHTML = html;
      } catch (error) {
        if (id === seq) body.innerHTML = emptyState("error", "No disponible", error.message);
      }
    };

    const refresh = () => { loadSummary(); loadBody(); };
    const open = (id) => manageUser(id, refresh);

    root.querySelectorAll("[data-tab]").forEach((t) => t.addEventListener("click", () => {
      root.querySelectorAll("[data-tab]").forEach((x) => { x.classList.toggle("active", x === t); x.setAttribute("aria-selected", String(x === t)); });
      state.tab = t.dataset.tab;
      loadBody();
    }));
    let timer;
    root.querySelector("[data-q]").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = e.target.value.trim(); state.page = 0; loadBody(); }, 300);
    });
    root.querySelectorAll("[data-f]").forEach((sel) => sel.addEventListener("change", () => {
      state[sel.dataset.f] = sel.value;
      state.page = 0;
      loadBody();
    }));
    body.addEventListener("click", (e) => {
      const pager = e.target.closest("[data-page]");
      if (pager) { state.page = Number(pager.dataset.page); loadBody(); return; }
      const link = e.target.closest("[data-user-link]");
      if (link) { open(Number(link.dataset.userLink)); return; }
      const row = e.target.closest("[data-user]");
      if (row) open(Number(row.dataset.user));
    });
    body.addEventListener("keydown", (e) => {
      const row = e.target.closest("[data-user]");
      if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(Number(row.dataset.user)); }
    });

    await Promise.all([loadSummary(), loadBody()]);
    return () => clearTimeout(timer);
  },
};
