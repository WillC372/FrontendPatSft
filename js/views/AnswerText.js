// Text of the assistant's answers, without DOM: used while the answer is being written and when it is copied.

const REFERENCE = /\[([a-z0-9]+(?:-[a-z0-9]+)+)\]/g;
// The model sometimes writes ids in parentheses or grouped: "(mahc-ph-range)", "[epa-ph-smcl, mahc-ph-range]". The
// server turns them into marks when the answer is complete; while it is written they are hidden too. Ids have at least
// two hyphens, so ordinary parentheses such as "(mg-l)" stay.
const LOOSE = /\s?[[(]\s*(?:[a-z0-9]+-){2,}[a-z0-9]+(?:\s*[,;]\s*(?:[a-z0-9]+-){2,}[a-z0-9]+)*\s*[\])]/g;

/**
 * Text shown while the answer is still arriving: bold marks are removed and so are the reference ids ([who-ph-1]),
 * including one cut in half at the end of what has arrived so far ("[who-ph"); they become numbered buttons later.
 */
export function liveText(text) {
  return String(text).replace(/\*\*/g, "").replace(LOOSE, "").replace(REFERENCE, "").replace(/\[[a-z0-9]+(?:-[a-z0-9]+)*-?$/, "");
}

/** Plain text for the clipboard: references numbered in citation order and the sources listed at the end. */
export function copyText(text, citations = []) {
  const order = new Map(citations.map((c, i) => [c.id, i + 1]));
  const body = String(text).replace(/\*\*/g, "").replace(REFERENCE, (m, id) => (order.has(id) ? `[${order.get(id)}]` : "")).trim();
  const sources = citations.map((c, i) => `[${i + 1}] ${c.organization}, ${c.title}${c.section ? ` (${c.section})` : ""}. ${c.url}`);
  return sources.length ? `${body}\n\nFuentes:\n${sources.join("\n")}` : body;
}

/**
 * A whole conversation as plain text for a file: its title, then each turn in order; every answer carries its own
 * numbered sources. {@code conversation}: { title, messages: [{ role, content, model, citations }] }.
 */
export function conversationText(conversation, exportedAt = new Date()) {
  const lines = [`AquaSense AI · ${conversation.title || "Conversación"}`, `Exportada el ${exportedAt.toLocaleString("es")}`, ""];
  for (const m of conversation.messages || []) {
    if (m.role === "USER") {
      lines.push(`Tú: ${String(m.content).trim()}`, "");
    } else {
      lines.push(`AquaSense IA${m.model ? ` (${m.model})` : ""}:`, copyText(m.content, m.citations || []), "");
    }
  }
  lines.push("Respuestas generadas por IA a partir de tus datos y de las normas citadas. Verifica la norma aplicable a tu caso.");
  return lines.join("\n");
}
