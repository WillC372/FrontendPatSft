// Text of the assistant's answers, without DOM: used while the answer is being written and when it is copied.

const REFERENCE = /\[([a-z0-9]+(?:-[a-z0-9]+)+)\]/g;

/**
 * Text shown while the answer is still arriving: bold marks are removed and so are the reference ids ([who-ph-1]),
 * including one cut in half at the end of what has arrived so far ("[who-ph"); they become numbered buttons later.
 */
export function liveText(text) {
  return String(text).replace(/\*\*/g, "").replace(REFERENCE, "").replace(/\[[a-z0-9]+(?:-[a-z0-9]+)*-?$/, "");
}

/** Plain text for the clipboard: references numbered in citation order and the sources listed at the end. */
export function copyText(text, citations = []) {
  const order = new Map(citations.map((c, i) => [c.id, i + 1]));
  const body = String(text).replace(/\*\*/g, "").replace(REFERENCE, (m, id) => (order.has(id) ? `[${order.get(id)}]` : "")).trim();
  const sources = citations.map((c, i) => `[${i + 1}] ${c.organization}, ${c.title}${c.section ? ` (${c.section})` : ""}. ${c.url}`);
  return sources.length ? `${body}\n\nFuentes:\n${sources.join("\n")}` : body;
}
