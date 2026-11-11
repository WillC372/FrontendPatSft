import { icon } from "./Icons.js";
import { esc } from "../core/Format.js";

const TOAST_ICONS = { ok: "check", error: "error", warn: "alert", info: "info" };

export function toast(message, type = "info", timeout = 4500) {
  const host = document.getElementById("toasts");
  const node = document.createElement("div");
  node.className = `toast toast-${type}`;
  node.setAttribute("role", type === "error" ? "alert" : "status");
  node.innerHTML = `${icon(TOAST_ICONS[type] || "info")}<div>${esc(message)}</div>`;
  host.append(node);
  setTimeout(() => {
    node.classList.add("leaving");
    node.addEventListener("animationend", () => node.remove(), { once: true });
  }, timeout);
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
    const onKey = (event) => { if (event.key === "Escape" && dismissible) close(null); };
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
