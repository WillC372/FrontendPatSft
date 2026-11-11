// Readable texts of a session of the history, without DOM.

const day = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const hour = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });

/** "menos de 1 min", "45 min", "2 h", "1 h 5 min". */
export function duration(minutes) {
  const m = Math.max(0, Math.floor(Number(minutes) || 0));
  if (m < 1) return "menos de 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h${m % 60 ? ` ${m % 60} min` : ""}`;
}

/**
 * "mar, 10 nov 2026 · 17:40 – 17:42". An open session ends in "ahora"; one that ended on another day shows that day.
 * An expired session ends at its last activity.
 */
export function period(s) {
  const start = new Date(s.startedAt);
  const end = new Date(s.endedAt || s.lastActivityAt);
  const sameDay = start.toDateString() === end.toDateString();
  const until = s.status === "OPEN" ? "ahora" : sameDay ? hour.format(end) : `${day.format(end)}, ${hour.format(end)}`;
  return `${day.format(start)} · ${hour.format(start)} – ${until}`;
}
