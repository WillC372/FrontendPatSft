import { api } from "../core/api.js";
import { esc, fmt } from "../core/format.js";
import { brainHolo, icon } from "../ui/icons.js";
import { emptyState, loading, toast } from "../ui/components.js";
import { barChart, lineChart } from "../ui/charts.js";
import { citationBlock } from "./citations.js";

const SUGGESTIONS = [
  "Informe general de la semana",
  "¿Por qué cambió el pH y debo preocuparme?",
  "Prepárame un informe para una inspección",
  "¿Qué debo vigilar en los próximos días?",
];
const TOOL_ICON = {
  get_water_profile: "profiles", get_statistics: "activity", get_anomalies: "alert", get_measurements: "history",
  get_forecast: "trend", get_alerts: "bell", get_latest_diagnosis: "sparkle", submit_report: "file", provider: "error",
};

function timeline(trace, running, freshFrom = trace.length) {
  const items = trace.map((s, i) => `<li class="${s.status} ${s.tool === "submit_report" && s.status === "OK" ? "final" : ""} ${i >= freshFrom ? "fresh" : ""}">
      ${icon(TOOL_ICON[s.tool] || "activity")}<div><strong>${esc(s.label)}</strong><small>${esc(s.summary)}${s.durationMs ? ` · ${s.durationMs} ms` : ""}</small></div></li>`);
  if (running) items.push(`<li class="pending">${icon("refresh")}<div><strong>Pensando el siguiente paso...</strong></div></li>`);
  return `<ol class="timeline">${items.join("")}</ol>`;
}

async function renderCharts(host, r) {
  const needed = new Set(r.report.sections.map((s) => s.chart).filter((c) => c !== "NONE"));
  if (!needed.size) return;
  let series = [];
  let profile = null;
  let anomalies = [];
  let forecast = null;
  try {
    [series, profile] = await Promise.all([api.get("/measurements/series", { days: r.periodDays }), api.get("/profiles/active")]);
    if (needed.has("ANOMALIES")) anomalies = (await api.get("/intelligence/anomalies", { days: r.periodDays })).anomalies;
    if (needed.has("FORECAST")) forecast = (await api.get("/intelligence/forecast", { horizon: 7 })).forecast;
  } catch {
    return;
  }
  const points = series.map((p) => ({ t: new Date(p.measuredAt), v: p.ph, status: p.status }));
  const band = profile ? { min: profile.idealMin, max: profile.idealMax } : undefined;
  host.querySelectorAll("[data-chart]").forEach((slot) => {
    const kind = slot.dataset.chart;
    if (points.length < 2) {
      slot.innerHTML = `<p class="muted">No hay suficientes mediciones para graficar.</p>`;
      return;
    }
    if (kind === "DISTRIBUTION") {
      const count = (s) => series.filter((p) => p.status === s).length;
      barChart(slot, [{ label: "Óptimo", value: count("OPTIMAL"), color: "var(--ok)" },
        { label: "Precaución", value: count("CAUTION"), color: "var(--warn)" }, { label: "Crítico", value: count("CRITICAL"), color: "var(--crit)" }]);
    } else if (kind === "ANOMALIES") {
      lineChart(slot, { points, band, anomalies: anomalies.map((a) => ({ t: new Date(a.measuredAt), v: a.ph })) });
    } else if (kind === "FORECAST" && forecast?.available) {
      lineChart(slot, { points, band, forecast: forecast.points.map((p) => ({ t: new Date(p.at), v: p.predicted, lo: p.lower, hi: p.upper })) });
    } else {
      lineChart(slot, { points, band });
    }
  });
}

function reportView(r) {
  const rep = r.report;
  const v = r.verification;
  const verified = v && v.checked > 0 && v.unverified.length === 0;
  return `
    <article class="report-doc reveal">
      <div class="row">
        <span class="badge ${r.source === "AI" ? "badge-info" : "badge-ok"}">${icon(r.source === "AI" ? "sparkle" : "activity")}${r.source === "AI" ? `${esc(r.provider)} · ${esc(r.model)}` : "Reglas y estadística"}</span>
        ${r.toolCalls ? `<span class="badge badge-info">${icon("database")}${r.toolCalls} consultas · ${(r.durationMs / 1000).toFixed(1)} s</span>` : ""}
        ${v && v.checked ? `<span class="badge ${verified ? "badge-ok" : "badge-warn"}">${icon(verified ? "shield" : "alert")}${v.verified}/${v.checked} cifras verificadas</span>` : ""}
        <small class="muted">${fmt.dateTime(r.createdAt)} · últimos ${r.periodDays} días</small>
      </div>
      <h2 style="margin-top:14px">${esc(rep.title)}</h2>
      <p class="muted" style="margin-top:4px">Objetivo: ${esc(r.focus)}</p>
      <p class="summary" style="margin-top:14px">${esc(rep.executiveSummary)}</p>
      ${v && v.unverified.length ? `<div class="banner banner-warn" style="margin-top:12px">${icon("alert")}<p>Estas cifras no coinciden con los datos consultados; revísalas: <strong>${v.unverified.map(esc).join(", ")}</strong></p></div>` : ""}
      ${rep.keyMetrics.length ? `<div class="stats" style="margin-top:16px">${rep.keyMetrics.map((m) => `<div class="stat"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>`).join("")}</div>` : ""}
      ${rep.sections.map((s) => `<section class="rsec"><h3>${esc(s.heading)}</h3><p>${esc(s.body)}</p>${s.chart !== "NONE" ? `<div data-chart="${s.chart}" style="margin-top:10px">${loading("Preparando gráfica...")}</div>` : ""}</section>`).join("")}
      <section class="rsec"><h3>Recomendaciones</h3>
        <ol class="action-list" style="margin-top:10px">${rep.recommendations.map((a) => `<li><span class="prio prio-${a.priority}">${a.priority}</span><div class="grow">${esc(a.action)}${a.rationale ? `<small class="muted" style="display:block;margin-top:4px">${esc(a.rationale)}</small>` : ""}</div></li>`).join("")}</ol>
      </section>
      ${rep.limitations.length ? `<div class="banner banner-info" style="margin-top:16px">${icon("info")}<div><strong>Limitaciones</strong><ul class="list bullets" style="margin-top:6px">${rep.limitations.map((l) => `<li>${icon("info")}<span>${esc(l)}</span></li>`).join("")}</ul></div></div>` : ""}
      ${citationBlock(r.citations, { title: "Fuentes normativas del informe",
        lead: r.source === "AI" ? "El agente las obtuvo con la herramienta search_guidelines; solo se conservan los ids que esa herramienta devolvió." : "Fragmentos aplicables a la última medición." })}
      ${r.discardedCitations && r.discardedCitations.length ? `<div class="banner banner-warn" style="margin-top:12px">${icon("shield")}<p>Se descartaron citas que no provenían de la biblioteca: <strong>${r.discardedCitations.map(esc).join(", ")}</strong></p></div>` : ""}
      ${r.note ? `<p class="muted" style="margin-top:10px;font-size:13px">${esc(r.note)}</p>` : ""}
      ${r.trace.length ? `<details><summary>Cómo se elaboró este informe (${r.trace.length} pasos)</summary>${timeline(r.trace, false)}</details>` : ""}
      <div class="row" style="margin-top:16px"><button class="btn btn-primary" data-pdf="${r.id}">${icon("file")}Descargar PDF</button><button class="btn" data-download="${r.id}">${icon("download")}Descargar .txt</button></div>
      <p class="disclaimer" style="margin-top:12px">${icon("info")}${esc(r.disclaimer)}</p>
    </article>`;
}

export async function agentReportPane(host) {
  host.innerHTML = `
    <div class="dx-head"><div><h2>Agente de informes</h2>
      <p class="muted" style="max-width:64ch">Dile qué quieres saber. El agente decide qué datos consultar (estadísticas, anomalías, mediciones, predicción, alertas), investiga y redacta el informe. El sistema verifica cada cifra antes de mostrarlo.</p></div></div>
    <form class="stack agent-form" style="margin-top:14px" data-form>
      <div class="field"><label for="ag-focus">Objetivo del informe</label>
        <textarea class="input" id="ag-focus" maxlength="300" placeholder="Ej.: ¿Por qué bajó el pH esta semana?">${SUGGESTIONS[0]}</textarea></div>
      <div class="row">${SUGGESTIONS.map((s) => `<button type="button" class="tab" data-suggest="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <div class="row">
        <select class="input" data-days style="width:auto" aria-label="Periodo"><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días (Premium)</option></select>
        <button class="btn btn-primary btn-pill" type="submit">${icon("sparkle")}Investigar y redactar</button>
      </div>
    </form>
    <div data-run></div>
    <section class="card" style="margin-top:18px"><div class="card-head"><div class="card-title">${icon("file")}Informes anteriores</div></div><div class="agent-history" data-history></div></section>`;

  const run = host.querySelector("[data-run]");
  const form = host.querySelector("[data-form]");
  const focus = host.querySelector("#ag-focus");

  const show = async (r) => {
    run.innerHTML = reportView(r);
    run.querySelector("[data-pdf]")?.addEventListener("click", async (e) => {
      const button = e.currentTarget;
      button.disabled = true;
      try { await api.download(`/intelligence/agent-reports/${r.id}/pdf`, {}, "aquasense-informe-agente.pdf"); } catch (err) { toast(err.message, "error"); } finally { button.disabled = false; }
    });
    run.querySelector("[data-download]")?.addEventListener("click", async () => {
      try { await api.download(`/intelligence/agent-reports/${r.id}/text`, {}, "aquasense-informe-agente.txt"); } catch (e) { toast(e.message, "error"); }
    });
    await renderCharts(run, r);
  };

  const loadHistory = async (activeId) => {
    const box = host.querySelector("[data-history]");
    try {
      const list = await api.get("/intelligence/agent-reports", { limit: 8 });
      box.innerHTML = list.length ? list.map((h) => `<button data-hid="${h.id}" class="${h.id === activeId ? "active" : ""}">
          ${icon(h.source === "AI" ? "sparkle" : "activity").replace("<svg", '<svg style="width:16px;height:16px;color:var(--primary-2)"')}
          <strong>${esc(h.title)}</strong><small>${h.source === "AI" ? esc(h.provider) : "Reglas"} · ${fmt.dateTime(h.createdAt)}</small></button>`).join("")
        : `<p class="muted">Aún no hay informes del agente.</p>`;
      box.querySelectorAll("[data-hid]").forEach((b) => b.addEventListener("click", async () => {
        box.querySelectorAll("[data-hid]").forEach((x) => x.classList.toggle("active", x === b));
        run.innerHTML = loading("Abriendo informe...");
        try { await show(await api.get(`/intelligence/agent-reports/${b.dataset.hid}`)); } catch (e) { run.innerHTML = emptyState("error", "No se pudo abrir", e.message); }
      }));
    } catch (error) {
      box.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
    }
  };

  host.querySelectorAll("[data-suggest]").forEach((b) => b.addEventListener("click", () => { focus.value = b.dataset.suggest; }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const job = await api.post("/intelligence/agent-reports", { days: Number(host.querySelector("[data-days]").value), focus: focus.value.trim() });
      run.innerHTML = `<div class="agent-live card"><div class="brain-holo" style="min-height:120px">${brainHolo()}</div>
        <div><div class="agent-phase"><span class="dot dot-live" style="color:var(--ok)"></span><span data-phase>${esc(job.phase)}</span><small class="muted" data-elapsed></small></div><div data-timeline>${timeline([], true)}</div></div></div>`;
      let state = job;
      let shown = 0;
      while (state.status === "RUNNING") {
        await new Promise((r) => setTimeout(r, 800));
        if (!run.isConnected) return;
        state = await api.get(`/intelligence/agent-reports/jobs/${job.jobId}`);
        run.querySelector("[data-phase]").textContent = state.phase;
        run.querySelector("[data-elapsed]").textContent = ` · ${(state.elapsedMs / 1000).toFixed(0)} s`;
        if (state.trace.length !== shown || state.status !== "RUNNING") {
          run.querySelector("[data-timeline]").innerHTML = timeline(state.trace, state.status === "RUNNING", shown);
          shown = state.trace.length;
        }
      }
      if (state.status === "FAILED") {
        run.innerHTML = `<div class="banner banner-crit" style="margin-top:16px">${icon("error")}<p>${esc(state.error)}</p></div>`;
      } else {
        toast(state.report.source === "AI" ? `Informe elaborado con ${state.report.provider}.` : "Informe generado con reglas.", state.report.source === "AI" ? "ok" : "warn");
        await show(state.report);
        loadHistory(state.report.id);
      }
    } catch (error) {
      toast(error.message, "error");
      run.innerHTML = "";
    } finally {
      button.disabled = false;
    }
  });
  loadHistory();
}
