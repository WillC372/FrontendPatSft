import { esc } from "../core/format.js";
import { icon } from "../ui/icons.js";

/**
 * Fuentes normativas (RAG). La cita literal se muestra en su idioma original dentro de <blockquote lang="en">;
 * el resumen en español se rotula como resumen propio para no presentarlo como traducción oficial.
 */
const ORG_CLASS = { "epa-sdws": "org-epa", "who-gdwq-ph": "org-who", "cdc-mahc-2024": "org-cdc", "fao-ipd29": "org-fao" };

export function citationCard(c, index) {
  return `
    <article class="citation reveal" data-cite="${esc(c.id)}" style="--i:${index || 0}">
      <header class="citation-head">
        ${index != null ? `<span class="cite-num">${index + 1}</span>` : ""}
        <span class="org ${ORG_CLASS[c.sourceId] || ""}">${esc(c.organization)}</span>
        <span class="citation-section">${esc(c.section)}</span>
      </header>
      <blockquote lang="${esc(c.quoteLanguage || "en")}">${icon("quote")}<p>${esc(c.quote)}</p></blockquote>
      <p class="citation-summary"><small>Resumen en español (no es traducción oficial)</small>${esc(c.summaryEs)}</p>
      <footer class="citation-foot">
        <small class="muted">${esc(c.title)}${c.edition ? ` · ${esc(c.edition)}` : ""}</small>
        <small class="legal">${icon("shield")}${esc(c.legalStatus)}</small>
        <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${icon("link")}Ver documento original</a>
      </footer>
    </article>`;
}

/** Bloque "Respaldo normativo" para recomendaciones, diagnósticos e informes. */
export function citationBlock(citations, { coverageNote = null, title = "Respaldo normativo", lead = null } = {}) {
  const list = citations || [];
  if (!list.length && !coverageNote) return "";
  return `
    <section class="card citations-block reveal" style="margin-top:16px">
      <div class="card-head"><div class="card-title">${icon("book")}${esc(title)}</div>
        ${list.length ? `<span class="badge badge-info">${list.length} ${list.length === 1 ? "fragmento" : "fragmentos"} · cita literal</span>` : ""}</div>
      ${lead ? `<p class="muted" style="margin-bottom:12px">${esc(lead)}</p>` : ""}
      ${list.length ? `<div class="citation-list">${list.map((c, i) => citationCard(c, i)).join("")}</div>`
        : `<div class="banner banner-warn">${icon("alert")}<p>${esc(coverageNote)}</p></div>`}
    </section>`;
}

/** Texto del chat con las referencias [id] convertidas en marcas numeradas que llevan a la cita. */
export function withReferenceMarks(text, citations) {
  const order = new Map((citations || []).map((c, i) => [c.id, i + 1]));
  return esc(text).replace(/\[([a-z0-9]+(?:-[a-z0-9]+)+)\]/g, (match, id) =>
    order.has(id) ? `<button type="button" class="ref-mark" data-ref="${id}" aria-label="Ver la cita ${order.get(id)}">${order.get(id)}</button>` : "");
}

/** Al pulsar una marca, abre la lista de fuentes de esa respuesta y resalta la cita. */
export function bindReferenceMarks(container) {
  container.addEventListener("click", (event) => {
    const mark = event.target.closest("[data-ref]");
    if (!mark) return;
    const scope = mark.closest(".bubble") || container;
    const details = scope.querySelector(".chat-sources");
    if (details) details.open = true;
    const card = scope.querySelector(`[data-cite="${mark.dataset.ref}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    card.classList.remove("flash");
    void card.offsetWidth;
    card.classList.add("flash");
  });
}

/** Lista compacta y desplegable de citas bajo una burbuja del chat. */
export function chatCitations(citations) {
  if (!citations || !citations.length) return "";
  return `<details class="chat-sources"><summary>${icon("book")}${citations.length} ${citations.length === 1 ? "fuente citada" : "fuentes citadas"}</summary>
    ${citations.map((c, i) => citationCard(c, i)).join("")}</details>`;
}
