const dateTime = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit" });
const timeOnly = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });

export const fmt = {
  ph: (value) => (value === null || value === undefined || Number.isNaN(value) ? "--" : Number(value).toFixed(2)),
  dateTime: (iso) => (iso ? dateTime.format(new Date(iso)) : "--"),
  day: (date) => dateOnly.format(date),
  time: (date) => timeOnly.format(date),
  signed: (value) => (value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)),
  relative(iso) {
    if (!iso) return "--";
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return "hace unos segundos";
    if (seconds < 3600) return `hace ${Math.round(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.round(seconds / 3600)} h`;
    return `hace ${Math.round(seconds / 86400)} d`;
  },
};

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const STATUS_CLASS = { OPTIMAL: "ok", CAUTION: "warn", CRITICAL: "crit" };

/**
 * "hace 5 min" as a <time> element: the full date is its tooltip, and refreshRelativeTimes() keeps the text current
 * while the screen stays open.
 */
export function relativeTime(iso) {
  if (!iso) return "--";
  return `<time data-relative datetime="${esc(iso)}" title="${esc(fmt.dateTime(iso))}">${esc(fmt.relative(iso))}</time>`;
}

export function refreshRelativeTimes(root = document) {
  root.querySelectorAll("time[data-relative]").forEach((t) => {
    const text = fmt.relative(t.getAttribute("datetime"));
    if (t.textContent !== text) t.textContent = text;
  });
}
