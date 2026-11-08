import { api } from "../core/Api.js";
import { esc } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { emptyState, loading, toast } from "../ui/Components.js";
import { citationCard } from "./Citations.js";

const TYPES = [["", "Todos los usos"], ["GENERAL", "Uso general"], ["DRINKING", "Agua potable"], ["POOL", "Piscina"],
  ["AQUARIUM", "Acuario"], ["IRRIGATION", "Agricultura y riego"]];
const SUGGESTIONS = ["rango recomendado", "corrosión de tuberías", "cada cuántas horas medir", "cierre de la piscina", "daño a equipos de riego"];

/** Guidelines library: official sources, coverage per water use and search in the fragments. */
export async function libraryPane(host) {
  host.innerHTML = loading("Cargando la biblioteca normativa...");
  let lib;
  try {
    lib = await api.get("/knowledge/sources");
  } catch (error) {
    host.innerHTML = emptyState("error", "No disponible", error.message);
    return;
  }
  const total = lib.sources.reduce((n, s) => n + s.chunkCount, 0);
  host.innerHTML = `
    <div class="dx-head">
      <div><h2>Biblioteca normativa</h2>
        <p class="muted" style="max-width:66ch">Las recomendaciones, diagnósticos, informes y el asistente citan estos fragmentos. Cada cita es el texto literal del documento oficial; el sistema descarta cualquier cita que la IA invente.</p></div>
      <span class="badge badge-info">${icon("book")}${lib.sources.length} fuentes · ${total} fragmentos</span>
    </div>
    <form class="lib-search" data-search>
      <div class="lib-input">${icon("filter")}<input class="input" name="q" maxlength="200" placeholder="Buscar en las normas, por ejemplo: pH bajo y corrosión" aria-label="Buscar en las normas"></div>
      <select class="input" name="type" aria-label="Uso del agua">${TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
      <button class="btn btn-primary" type="submit">${icon("send")}Buscar</button>
    </form>
    <div class="row" style="margin-top:10px">${SUGGESTIONS.map((s) => `<button class="tab" data-sq="${esc(s)}">${esc(s)}</button>`).join("")}</div>
    <div data-results style="margin-top:14px"></div>
    <h3 style="margin-top:22px">Fuentes</h3>
    <div class="lib-sources">${lib.sources.map((e, i) => `
      <article class="card lib-source reveal" style="--i:${i}">
        <div class="row-between"><span class="org">${esc(e.source.organization)}</span><span class="badge">${e.chunkCount} fragmentos</span></div>
        <h4>${esc(e.source.title)}</h4>
        <small class="muted">${esc(e.source.edition)} · consultado el ${esc(e.source.retrievedOn)}</small>
        <p class="legal">${icon("shield")}${esc(e.source.legalStatus)}</p>
        <div class="row">${e.profileTypes.map((t) => `<span class="badge badge-info">${esc((TYPES.find(([v]) => v === t) || [t, t])[1])}</span>`).join("")}</div>
        <details><summary>Ver los ${e.chunkCount} fragmentos</summary><div class="citation-list">${e.chunks.map((c) => citationCard(c)).join("")}</div></details>
        <a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">${icon("link")}Documento original</a>
      </article>`).join("")}</div>
    <h3 style="margin-top:22px">Cobertura por uso del agua</h3>
    <ul class="lib-coverage">${TYPES.slice(1).map(([v, l]) => `<li class="${v === "AQUARIUM" ? "gap" : ""}">${icon(v === "AQUARIUM" ? "alert" : "check")}<div><strong>${l}</strong><p>${esc(lib.coverage[v] || "")}</p></div></li>`).join("")}</ul>
    <p class="disclaimer" style="margin-top:14px">${icon("info")}${esc(lib.note)}</p>`;

  const results = host.querySelector("[data-results]");
  const form = host.querySelector("[data-search]");
  const run = async () => {
    const q = form.q.value.trim();
    if (!q) return;
    results.innerHTML = loading("Buscando...");
    try {
      const r = await api.get("/knowledge/search", { q, limit: 5, ...(form.type.value ? { profileType: form.type.value } : {}) });
      results.innerHTML = r.results.length
        ? `<p class="muted">${r.results.length} resultados para “${esc(r.query)}” · ordenados por relevancia (BM25)</p><div class="citation-list" style="margin-top:10px">${r.results.map((c, i) => citationCard(c, i)).join("")}</div>`
        : `<div class="banner banner-warn">${icon("alert")}<p>Sin fragmentos para “${esc(r.query)}”.${r.coverageNote ? ` ${esc(r.coverageNote)}` : ""}</p></div>`;
    } catch (error) {
      results.innerHTML = "";
      toast(error.message, "error");
    }
  };
  form.addEventListener("submit", (event) => { event.preventDefault(); run(); });
  host.querySelectorAll("[data-sq]").forEach((b) => b.addEventListener("click", () => { form.q.value = b.dataset.sq; run(); }));
}
