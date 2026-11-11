import { icon } from "./Icons.js";
import { esc } from "../core/Format.js";

const TOAST_ICONS = { ok: "check", error: "error", warn: "alert", info: "info" };

const MAX_TOASTS = 4;

export function toast(message, type = "info", timeout = 4500) {
  const host = document.getElementById("toasts");
  // The same text twice in a row (for example two failed requests) is shown once.
  if ([...host.children].some((n) => !n.classList.contains("leaving") && n.dataset.text === message)) return;
  const node = document.createElement("div");
  node.className = `toast toast-${type}`;
  node.dataset.text = message;
  node.setAttribute("role", type === "error" ? "alert" : "status");
  node.innerHTML = `${icon(TOAST_ICONS[type] || "info")}<div>${esc(message)}</div>
    <button type="button" class="toast-close" aria-label="Cerrar aviso">${icon("close")}</button>`;
  let timer;
  const leave = () => {
    if (node.classList.contains("leaving")) return;
    clearTimeout(timer);
    node.classList.add("leaving");
    node.addEventListener("animationend", () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 600);
  };
  node.querySelector(".toast-close").addEventListener("click", leave);
  // While the pointer is over a notice it stays, so a long message can be read to the end.
  node.addEventListener("pointerenter", () => clearTimeout(timer));
  node.addEventListener("pointerleave", () => { timer = setTimeout(leave, 2000); });
  host.append(node);
  const visible = [...host.children].filter((n) => !n.classList.contains("leaving"));
  visible.slice(0, Math.max(0, visible.length - MAX_TOASTS)).forEach((n) => n.querySelector(".toast-close")?.click());
  timer = setTimeout(leave, timeout);
}

export function modal({ title, body, actions = [], onMount, dismissible = true }) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head"><h2 id="modal-title">${esc(title)}</h2>
          ${dismissible ? `<button class="btn btn-ghost icon-btn" data-close aria-label="Cerrar">${icon("close")}</button>` : ""}
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">${actions.map((a, i) =>
          `<button class="btn ${a.className || ""}" data-action="${i}">${a.icon ? icon(a.icon) : ""}${esc(a.label)}</button>`).join("")}</div>
      </div>`;
    const close = (value) => {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      previous?.focus?.();
      resolve(value);
    };
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKey = (event) => {
      // With a dialog opened from another one, only the top one reacts.
      const open = document.querySelectorAll(".modal-backdrop");
      if (open[open.length - 1] !== backdrop) return;
      if (event.key === "Escape" && dismissible) {
        event.stopPropagation();
        close(null);
        return;
      }
      if (event.key !== "Tab") return;
      // Keep keyboard focus inside the dialog while it is open.
      const items = [...backdrop.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !backdrop.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !backdrop.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    backdrop.addEventListener("click", async (event) => {
      if (dismissible && (event.target === backdrop || event.target.closest("[data-close]"))) close(null);
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const action = actions[Number(button.dataset.action)];
      if (action.handler) {
        button.disabled = true;
        try {
          const result = await action.handler(backdrop);
          if (result !== false) close(result ?? action.value ?? true);
        } finally {
          button.disabled = false;
        }
      } else {
        close(action.value ?? null);
      }
    });
    document.addEventListener("keydown", onKey);
    document.body.append(backdrop);
    onMount?.(backdrop, close);
    backdrop.querySelector("input, select, textarea, [data-action]")?.focus();
  });
}

export function confirmDialog(title, message, confirmLabel = "Confirmar", danger = false) {
  return modal({
    title,
    body: `<p>${esc(message)}</p>`,
    actions: [
      { label: "Cancelar", className: "btn-ghost", value: false },
      { label: confirmLabel, className: danger ? "btn-danger" : "btn-primary", value: true },
    ],
  });
}

export function loading(text = "Cargando...") {
  return `<div class="loading-block"><div class="spinner"></div><span>${esc(text)}</span></div>`;
}

export function emptyState(iconName, title, text, action = "") {
  return `<div class="empty">${icon(iconName)}<h2 class="h-sm">${esc(title)}</h2><p>${esc(text)}</p>${action}</div>`;
}

export function statusBadge(status, label) {
  const map = { OPTIMAL: ["ok", "check"], CAUTION: ["warn", "alert"], CRITICAL: ["crit", "error"] };
  const [cls, ic] = map[status] || ["info", "info"];
  return `<span class="badge badge-${cls}">${icon(ic)}${esc(label)}</span>`;
}

export function sourceBadge(source) {
  if (source === "SIMULATED") return `<span class="badge badge-sim">${icon("flask")}SIMULADO</span>`;
  if (source === "PHOTO") return `<span class="badge badge-info">${icon("camera")}Foto IA</span>`;
  if (source === "MANUAL") return `<span class="badge badge-info">${icon("edit")}Manual</span>`;
  return `<span class="badge badge-ok">${icon("chip")}Medidor</span>`;
}

export async function withBusy(button, task) {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner"></span>${esc(button.textContent.trim())}`;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

export function showFieldErrors(form, fields = {}) {
  form.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; });
  form.querySelectorAll(".invalid").forEach((node) => node.classList.remove("invalid"));
  Object.entries(fields).forEach(([name, message]) => {
    const input = form.querySelector(`[name="${name}"]`);
    input?.classList.add("invalid");
    const holder = form.querySelector(`[data-error-for="${name}"]`);
    if (holder) holder.textContent = message;
  });
}

export function enableRipples(root = document) {
  root.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".btn-primary, .nav-link, .tab, .segmented button");
    if (!button || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const wave = document.createElement("span");
    wave.className = "ripple";
    Object.assign(wave.style, { width: `${size}px`, height: `${size}px`, left: `${event.clientX - rect.left - size / 2}px`, top: `${event.clientY - rect.top - size / 2}px` });
    button.style.position ||= "relative";
    button.append(wave);
    wave.addEventListener("animationend", () => wave.remove());
  });
}

export function countUp(node, to, { decimals = 2, duration = 900, from } = {}) {
  const start = from ?? (Number(node.dataset.value) || 0);
  node.dataset.value = to;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    node.textContent = to.toFixed(decimals);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = (start + (to - start) * eased).toFixed(decimals);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * The period and scope selectors (".tabs" without role="tablist") are groups of toggle buttons: this keeps
 * role="group" on the container and aria-pressed on each button in sync with the "active" class that the views
 * set, so screen readers say which option is selected. Real tab lists (role="tablist") are left as they are.
 */
export function enableToggleGroups(root = document.body) {
  const sync = (scope) => {
    scope.querySelectorAll?.(".tabs:not([role=tablist])").forEach((group) => {
      if (!group.hasAttribute("role")) group.setAttribute("role", "group");
      group.querySelectorAll(":scope > .tab").forEach((b) => b.setAttribute("aria-pressed", String(b.classList.contains("active"))));
    });
  };
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && m.target.classList?.contains("tab") && m.target.parentElement?.matches(".tabs:not([role=tablist])")) {
        m.target.setAttribute("aria-pressed", String(m.target.classList.contains("active")));
      } else if (m.type === "childList") {
        m.addedNodes.forEach((n) => { if (n.nodeType === 1) sync(n.matches?.(".tabs") ? n.parentElement || n : n); });
      }
    }
  }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  sync(root);
}

/**
 * A table wider (or taller) than its box scrolls inside it; keyboard users can only scroll it if it can take focus.
 * Tables that do not fit get tabindex, role="region" and a label; the others stay out of the tab order. Checked when
 * tables appear and when the window changes size.
 */
export function enableScrollableTables(root = document.body) {
  const check = (wrap) => {
    const scrolls = wrap.scrollWidth > wrap.clientWidth + 1 || wrap.scrollHeight > wrap.clientHeight + 1;
    if (scrolls) {
      wrap.setAttribute("tabindex", "0");
      wrap.setAttribute("role", "region");
      if (!wrap.hasAttribute("aria-label")) {
        const title = wrap.closest("section, .card, .modal")?.querySelector("h1, h2, h3, .card-title")?.textContent.trim();
        wrap.setAttribute("aria-label", `${title || "Tabla"} (se desplaza)`);
      }
    } else if (wrap.getAttribute("role") === "region") {
      wrap.removeAttribute("tabindex");
      wrap.removeAttribute("role");
    }
  };
  const all = () => root.querySelectorAll(".table-wrap").forEach(check);
  let pending = false;
  const later = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; all(); });
  };
  new MutationObserver((mutations) => {
    if (mutations.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches(".table-wrap") || n.querySelector?.(".table-wrap"))))) later();
  }).observe(root, { subtree: true, childList: true });
  window.addEventListener("resize", later, { passive: true });
  all();
}
