import { IS_SPANISH, LOCALE } from "./Locale.js";
const dateTime = new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit" });
const timeOnly = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });

export const fmt = {
  ph: (value) => (value === null || value === undefined || Number.isNaN(value) ? "--" : Number(value).toFixed(2)),
  dateTime: (iso) => (iso ? dateTime.format(new Date(iso)) : "--"),
  day: (date) => dateOnly.format(date),
  time: (date) => timeOnly.format(date),
  signed: (value) => (value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)),
  relative(iso) {
    if (!iso) return "--";
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (!IS_SPANISH) {
      // Other languages: the browser writes "5 minutes ago" itself, in the right grammar.
      const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto", style: "short" });
      if (seconds < 60) return rtf.format(-seconds, "second");
      if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), "minute");
      if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), "hour");
      return rtf.format(-Math.round(seconds / 86400), "day");
    }
    if (seconds < 60) return "hace unos segundos";
    if (seconds < 3600) return `hace ${Math.round(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.round(seconds / 3600)} h`;
    return `hace ${Math.round(seconds / 86400)} d`;
  },
};

/** "3 de 20" consultas, or "3 · sin límite" for administrators (the server sends a huge quota for them). */
export function quotaText(used, quota, joiner = " de ") {
  return quota >= 1_000_000 ? `${used} · sin límite` : `${used}${joiner}${quota}`;
}

/**
 * What a person wrote (names, places, notes) is not translated. The place the app creates for everyone, "Mi agua", is
 * the exception: it is the app's own text until the person renames it.
 */
export function own(value) {
  const text = String(value ?? "");
  return text === "Mi agua" ? esc(text) : `<span translate="no">${esc(text)}</span>`;
}

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
  return `<time data-relative ${IS_SPANISH ? "" : 'translate="no" '}datetime="${esc(iso)}" title="${esc(fmt.dateTime(iso))}">${esc(fmt.relative(iso))}</time>`;
}

export function refreshRelativeTimes(root = document) {
  root.querySelectorAll("time[data-relative]").forEach((t) => {
    const text = fmt.relative(t.getAttribute("datetime"));
    if (t.textContent !== text) t.textContent = text;
  });
}
