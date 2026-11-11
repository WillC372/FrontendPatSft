import { api } from "../core/Api.js";
import { esc, fmt } from "../core/Format.js";
import { brainHolo, icon } from "../ui/Icons.js";
import { emptyState, loading, statusBadge, toast, withBusy } from "../ui/Components.js";
import { lineChart } from "../ui/Charts.js";
import { flask } from "../ui/Illustrations.js";
import { agentReportPane } from "./AgentReport.js";
import { mlPane } from "./MlPane.js";
import { citationBlock } from "./Citations.js";
import { libraryPane } from "./Library.js";
import { assistantPane } from "./AssistantPane.js";
import { usagePane } from "./UsagePane.js";
import { deepPane } from "./DeepPane.js";

const PANES = [
  ["diagnosis", "Diagnóstico IA", "sparkle"],
  ["anomalies", "Detección de anomalías", "activity"],
  ["ml", "Aprendizaje automático", "brain"],
  ["deep", "Red neuronal (LSTM)", "trend"],
  ["forecast", "Predicción de tendencias", "trend"],
  ["scenario", "Simulador de escenarios", "flask"],
  ["recommendations", "Recomendaciones", "shield"],
  ["reports", "Agente de informes", "file"],
  ["assistant", "Asistente IA", "message"],
  ["library", "Biblioteca normativa", "book"],
  ["usage", "Consumo y costos", "database"],
];

function adviceBlock(advice) {
  return `
    <p>${esc(advice.summary)}</p>
    ${advice.possibleCauses.length ? `<h3 style="margin-top:16px">Posibles causas</h3><ul class="list bullets" style="margin-top:8px">${advice.possibleCauses.map((c) => `<li>${icon("info")}<span>${esc(c)}</span></li>`).join("")}</ul>` : ""}
    ${advice.actions.length ? `<h3 style="margin-top:16px">Acciones recomendadas</h3><ul class="list" style="margin-top:8px">${advice.actions.map((a) => `<li>${icon("check")}<span>${esc(a)}</span></li>`).join("")}</ul>` : ""}
    ${advice.needsExpert ? `<div class="banner banner-warn" style="margin-top:16px">${icon("alert")}<p><strong>Evaluación adicional:</strong> ${esc(advice.expertNote)}</p></div>` : ""}`;
}

const EFFECT_ICON = { INFO: "info", CAUTION: "alert", CRITICAL: "error" };

function hydrogenLabel(factor) {
  if (Math.abs(factor - 1) < 0.005) return "Igual";
  const n = factor >= 1 ? factor : 1 / factor;
  const text = n >= 100 ? Math.round(n).toLocaleString("es") : n.toLocaleString("es", { maximumFractionDigits: 1 });
  return factor >= 1 ? `${text} veces más` : `${text} veces menos`;
}

function scenarioExplanationView(x) {
  const ai = x.source === "AI";
  const v = x.verification;
  const verified = v && v.checked > 0 && v.unverified.length === 0;
  return `
    <div class="scenario-explanation reveal">
      <div class="row">
        <span class="badge ${ai ? "badge-info" : "badge-ok"}">${icon(ai ? "sparkle" : "activity")}${ai ? `${esc(x.provider)} · ${esc(x.model)}` : "Reglas"}</span>
        ${v && v.checked ? `<span class="badge ${verified ? "badge-ok" : "badge-warn"}">${icon(verified ? "shield" : "alert")}${v.verified}/${v.checked} cifras verificadas</span>` : ""}
      </div>
      <h3 style="margin-top:12px">${esc(x.headline)}</h3>
      <p style="margin-top:6px">${esc(x.explanation)}</p>
      <div class="scenario-facts">
        ${x.hydrogenFactor != null ? `<div class="stat"><span>Iones H+ frente a hoy</span><strong>${hydrogenLabel(x.hydrogenFactor)}</strong><small>calculado por el sistema</small></div>` : ""}
        <div class="stat"><span>Estado hipotético</span><strong>${esc(x.hypotheticalStatus)}</strong><small>pH ${fmt.ph(x.hypotheticalPh)}</small></div>
        <div class="stat wide"><span>¿Cuándo llegaría?</span><p>${esc(x.timeToReach)}</p></div>
      </div>
      ${v && v.unverified.length ? `<div class="banner banner-warn" style="margin-top:12px">${icon("alert")}<p>Estas cifras no provienen de los datos entregados; revísalas: <strong>${v.unverified.map(esc).join(", ")}</strong></p></div>` : ""}
      <h4 style="margin-top:14px">Efectos</h4>
      ${x.effects.map((e, i) => `<div class="finding ${e.severity}" style="--i:${i}">${icon(EFFECT_ICON[e.severity])}<div><strong>${esc(e.area)}</strong><p>${esc(e.effect)}</p></div></div>`).join("")}
      <div class="grid grid-2" style="margin-top:14px">
        ${x.earlySignals.length ? `<div><h4>Señales tempranas</h4><ul class="list bullets" style="margin-top:8px">${x.earlySignals.map((s) => `<li>${icon("eye")}<span>${esc(s)}</span></li>`).join("")}</ul></div>` : ""}
        <div><h4>Prevención</h4><ul class="list" style="margin-top:8px">${x.preventiveActions.map((a) => `<li>${icon("check")}<span>${esc(a)}</span></li>`).join("")}</ul></div>
      </div>
      ${x.adjustments && x.adjustments.length ? `<div class="banner banner-info" style="margin-top:12px">${icon("shield")}<div><strong>Salvaguardas aplicadas</strong><ul class="list bullets" style="margin-top:6px">${x.adjustments.map((a) => `<li>${icon("check")}<span>${esc(a)}</span></li>`).join("")}</ul></div></div>` : ""}
      ${citationBlock(x.citations, { coverageNote: x.coverageNote })}
      ${x.note ? `<p class="muted" style="margin-top:10px;font-size:13px">${esc(x.note)}</p>` : ""}
      <p class="disclaimer" style="margin-top:10px">${icon("info")}${esc(x.disclaimer)}</p>
    </div>`;
}

const RISK_FRACTION = { LOW: 0.25, MODERATE: 0.5, HIGH: 0.75, CRITICAL: 1 };
const LIKELIHOOD = { LOW: ["Baja", 33], MEDIUM: ["Media", 66], HIGH: ["Alta", 100] };
const SEVERITY_ICON = { INFO: "info", CAUTION: "alert", CRITICAL: "error" };
const PIPELINE = [["database", "Reuniendo mediciones"], ["activity", "Calculando estadística y anomalías"],
  ["brain", "Consultando IA (Gemini → Groq)"], ["shield", "Validando la respuesta"]];
const RING = 2 * Math.PI * 64;

function diagnosisView(d) {
  const ai = d.source === "AI";
  return `
    <div class="dx-top reveal">
      <div class="risk-ring risk-${d.riskLevel}" role="img" aria-label="Riesgo ${esc(d.riskLabel)}">
        <svg viewBox="0 0 160 160"><circle class="track" cx="80" cy="80" r="64"/>
          <circle class="value" cx="80" cy="80" r="64" stroke="currentColor" stroke-dasharray="0 ${RING}" data-ring="${RISK_FRACTION[d.riskLevel]}"/></svg>
        <div class="label"><small>Riesgo</small><strong>${esc(d.riskLabel)}</strong></div>
      </div>
      <div class="stack" style="gap:10px">
        <div class="row">
          <span class="badge ${ai ? "badge-info" : "badge-ok"}">${icon(ai ? "sparkle" : "activity")}${ai ? `${esc(d.provider)} · ${esc(d.model)}` : "Reglas y estadística"}</span>
          ${d.includesSimulated ? `<span class="badge badge-sim">${icon("flask")}Incluye datos simulados</span>` : ""}
          <span class="badge badge-info">${icon("calendar")}${d.measurementCount} mediciones · ${d.periodDays} días</span>
        </div>
        <p style="font-size:16px">${esc(d.summary)}</p>
        <div class="confidence">Confianza <span class="bar"><i data-confidence="${d.confidence}" style="width:0"></i></span><strong class="num">${Math.round(d.confidence * 100)} %</strong></div>
        <small class="muted">${esc(d.sourceLabel)} · ${fmt.dateTime(d.createdAt)} · Próxima medición recomendada en ${d.nextMeasurementHours} h</small>
      </div>
    </div>
    ${d.note ? `<div class="banner banner-info" style="margin-top:14px">${icon("info")}<p>${esc(d.note)}</p></div>` : ""}
    <div class="dx-grid">
      <section class="card reveal"><div class="card-head"><div class="card-title">${icon("target")}Hallazgos</div></div>
        ${d.findings.map((f) => `<div class="finding ${f.severity}">${icon(SEVERITY_ICON[f.severity])}<div><strong>${esc(f.title)}</strong><p>${esc(f.evidence)}</p></div></div>`).join("")}
      </section>
      <section class="card reveal"><div class="card-head"><div class="card-title">${icon("brain")}Causas probables</div></div>
        ${d.probableCauses.length ? d.probableCauses.map((c) => `<div class="cause"><div class="row-between"><span>${esc(c.cause)}</span><small class="muted">${LIKELIHOOD[c.likelihood][0]}</small></div>
          <div class="meter"><i style="width:${LIKELIHOOD[c.likelihood][1]}%"></i></div><p>${esc(c.evidence)}</p></div>`).join("")
          : `<p class="muted">No hay causas que investigar con los datos actuales.</p>`}
      </section>
    </div>
    <section class="card reveal" style="margin-top:16px"><div class="card-head"><div class="card-title">${icon("check")}Plan de acción</div></div>
      <ol class="action-list">${d.actions.map((a) => `<li><span class="prio prio-${a.priority}">${a.priority}</span><div class="grow">${esc(a.action)}</div><span class="badge badge-info">${esc(a.timeframe)}</span></li>`).join("")}</ol>
    </section>
    ${d.dataGaps.length ? `<div class="banner banner-warn" style="margin-top:16px">${icon("database")}<div><strong>Datos que mejorarían el diagnóstico</strong>
      <ul class="list bullets" style="margin-top:6px">${d.dataGaps.map((g) => `<li>${icon("info")}<span>${esc(g)}</span></li>`).join("")}</ul></div></div>` : ""}
    ${d.adjustments.length ? `<div class="banner banner-info" style="margin-top:12px">${icon("shield")}<div><strong>Salvaguardas aplicadas por el sistema</strong>
      <ul class="list bullets" style="margin-top:6px">${d.adjustments.map((a) => `<li>${icon("check")}<span>${esc(a)}</span></li>`).join("")}</ul></div></div>` : ""}
    ${citationBlock(d.citations, { coverageNote: d.coverageNote, lead: d.source === "AI"
      ? "Fragmentos que la IA citó en este diagnóstico. El sistema verificó que cada id existiera entre los fragmentos que le entregó."
      : "Fragmentos aplicables a la última medición, seleccionados por el recuperador." })}
    <p class="disclaimer" style="margin-top:14px">${icon("info")}${esc(d.disclaimer)}</p>`;
}

function animateDiagnosis(host) {
  requestAnimationFrame(() => {
    const ring = host.querySelector("[data-ring]");
    if (ring) ring.setAttribute("stroke-dasharray", `${(RING * Number(ring.dataset.ring)).toFixed(1)} ${RING}`);
    const bar = host.querySelector("[data-confidence]");
    if (bar) bar.style.width = `${Number(bar.dataset.confidence) * 100}%`;
  });
}

const panes = {
  async diagnosis(host) {
    let days = 7;
    host.innerHTML = `
      <div class="dx-head">
        <div><h2>Diagnóstico inteligente</h2>
          <p class="muted" style="max-width:62ch">El sistema calcula los hechos; la IA razona sobre ellos y responde con una estructura fija que se valida antes de mostrarse. Si la IA falla, se usan reglas propias.</p></div>
        <div class="row">
          <div class="tabs"><button class="tab active" data-dd="7">7 días</button><button class="tab" data-dd="30">30 días</button></div>
          <button class="btn btn-primary btn-pill" data-run>${icon("sparkle")}Generar diagnóstico</button>
        </div>
      </div>
      <div data-dx style="margin-top:12px">${loading("Cargando el último diagnóstico...")}</div>
      <section class="card" style="margin-top:18px"><div class="card-head"><div class="card-title">${icon("history")}Diagnósticos anteriores</div></div><div class="dx-history" data-history></div></section>`;
    const target = host.querySelector("[data-dx]");
    const show = (d) => { target.innerHTML = diagnosisView(d); animateDiagnosis(target); };
    const loadHistory = async (activeId) => {
      const box = host.querySelector("[data-history]");
      try {
        const list = await api.get("/intelligence/diagnosis/history", { limit: 8 });
        box.innerHTML = list.length ? list.map((d) => `<button data-hid="${d.id}" class="${d.id === activeId ? "active" : ""}">
            <span class="dot risk-${d.riskLevel}"></span><strong>${esc(d.riskLabel)}</strong>
            <span>${d.source === "AI" ? esc(`${d.provider} · ${d.model}`) : "Reglas"}</span><small>${fmt.dateTime(d.createdAt)}</small></button>`).join("")
          : `<p class="muted">Aún no hay diagnósticos.</p>`;
        box.querySelectorAll("[data-hid]").forEach((b) => b.addEventListener("click", () => {
          box.querySelectorAll("[data-hid]").forEach((x) => x.classList.toggle("active", x === b));
          show(list.find((d) => String(d.id) === b.dataset.hid));
        }));
      } catch (error) {
        box.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
      }
    };
    host.querySelectorAll("[data-dd]").forEach((tab) => tab.addEventListener("click", () => {
      host.querySelectorAll("[data-dd]").forEach((t) => t.classList.toggle("active", t === tab));
      days = Number(tab.dataset.dd);
    }));
    host.querySelector("[data-run]").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      target.innerHTML = `<div class="dx-pipeline">${PIPELINE.map(([ic, label]) => `<div class="dx-step">${icon(ic)}<span>${label}</span></div>`).join("")}</div>
        <p class="muted" style="text-align:center">Puede tardar entre 5 y 30 segundos según la demanda del proveedor.</p>`;
      const steps = [...target.querySelectorAll(".dx-step")];
      let index = 0;
      steps[0].classList.add("active");
      const timer = setInterval(() => {
        if (index < steps.length - 2) {
          steps[index].classList.replace("active", "done");
          index++;
          steps[index].classList.add("active");
        }
      }, 900);
      try {
        const d = await api.post("/intelligence/diagnosis", undefined, { days });
        clearInterval(timer);
        steps.forEach((s) => { s.classList.remove("active"); s.classList.add("done"); });
        await new Promise((r) => setTimeout(r, 350));
        show(d);
        toast(d.source === "AI" ? `Diagnóstico generado con ${d.provider}.` : "Diagnóstico generado con reglas.", d.source === "AI" ? "ok" : "warn");
        loadHistory(d.id);
      } catch (error) {
        clearInterval(timer);
        target.innerHTML = `<div class="banner banner-crit">${icon("error")}<p>${esc(error.message)}</p></div>`;
      } finally {
        button.disabled = false;
      }
    });
    try {
      const latest = await api.get("/intelligence/diagnosis/latest");
      if (latest) show(latest);
      else target.innerHTML = emptyState("sparkle", "Sin diagnósticos todavía", "Pulsa \"Generar diagnóstico\" para analizar tus mediciones.");
      loadHistory(latest?.id);
    } catch (error) {
      target.innerHTML = emptyState("error", "No se pudo cargar", error.message);
    }
  },

  async anomalies(host) {
    let days = 7;
    host.innerHTML = `
      <div class="row-between"><h2>Detección de anomalías</h2>
        <div class="tabs"><button class="tab active" data-d="7">7 días</button><button class="tab" data-d="30">30 días</button></div></div>
      <div data-body style="margin-top:16px">${loading("Analizando...")}</div>
      <section class="card" style="margin-top:18px">
        <div class="card-head"><div class="card-title">${icon("sparkle")}Conclusión de la IA</div>
          <button class="btn btn-sm btn-primary" data-conclusion>${icon("sparkle")}Generar conclusión</button></div>
        <div data-conclusion-text><p class="muted">Genera una conclusión del periodo a partir de tus datos.</p></div>
      </section>`;
    const body = host.querySelector("[data-body]");
    const load = async () => {
      body.innerHTML = loading("Analizando...");
      try {
        const [result, series, profile] = await Promise.all([
          api.get("/intelligence/anomalies", { days }), api.get("/measurements/series", { days }), api.get("/profiles/active")]);
        const ok = result.anomalies.length === 0;
        body.innerHTML = `
          <div class="banner ${result.analyzed === 0 ? "banner-info" : ok ? "banner-ok" : "banner-warn"}">${icon(ok ? "check" : "alert")}
            <div><strong>${result.analyzed === 0 ? "Sin mediciones" : ok ? "No se detectan anomalías" : result.anomalies.length === 1 ? "1 anomalía detectada" : `${result.anomalies.length} anomalías detectadas`}</strong><p>${esc(result.message)}</p></div>
            ${icon("shield")}</div>
          <p class="muted" style="margin-top:10px">Reglas aplicadas: fuera de rango del perfil, cambio brusco (>= 0,5 pH en una hora), valor atípico (puntaje z robusto > 3,5 con 10+ mediciones previas) y comportamiento inusual según el modelo de aprendizaje automático (con 30+ mediciones).</p>
          ${result.anomalies.length ? `<div style="margin-top:12px">${result.anomalies.slice(0, 20).map((a) => `<div class="alert-item ${a.severity}">${icon(a.severity === "CRITICAL" ? "error" : "alert")}
            <div><strong>${esc(a.title)}</strong> <small class="muted">${fmt.dateTime(a.measuredAt)}</small><p>${esc(a.message)}</p></div></div>`).join("")}</div>` : ""}
          ${series.length >= 2 ? `<button class="btn" style="margin-top:14px" data-graph>${icon("activity")}Ver gráfica de anomalías</button><div data-graph-area style="margin-top:12px"></div>` : ""}`;
        body.querySelector("[data-graph]")?.addEventListener("click", () => {
          const area = body.querySelector("[data-graph-area]");
          lineChart(area, {
            points: series.map((p) => ({ t: new Date(p.measuredAt), v: p.ph, status: p.status })),
            band: { min: profile.idealMin, max: profile.idealMax },
            anomalies: result.anomalies.map((a) => ({ t: new Date(a.measuredAt), v: a.ph })),
          });
          area.insertAdjacentHTML("beforeend", `<div class="legend"><span><i style="background:var(--primary-2)"></i>pH</span><span><i style="background:var(--crit)"></i>Anomalía</span><span><i style="background:rgba(47,210,122,.5)"></i>Rango recomendado</span></div>`);
        });
      } catch (error) {
        body.innerHTML = emptyState("error", "No se pudo analizar", error.message);
      }
    };
    host.querySelectorAll("[data-d]").forEach((tab) => tab.addEventListener("click", () => {
      host.querySelectorAll("[data-d]").forEach((t) => t.classList.toggle("active", t === tab));
      days = Number(tab.dataset.d);
      load();
    }));
    host.querySelector("[data-conclusion]").addEventListener("click", (event) => withBusy(event.currentTarget, async () => {
      const target = host.querySelector("[data-conclusion-text]");
      try {
        const c = await api.post("/intelligence/conclusion", undefined, { days });
        target.innerHTML = `<p>${esc(c.text)}</p><p style="margin-top:10px"><span class="badge ${c.source === "AI" ? "badge-info" : "badge-ok"}">${icon(c.source === "AI" ? "sparkle" : "activity")}${esc(c.sourceLabel)}${c.model ? ` · ${esc(c.model)}` : ""}</span></p>${c.note ? `<small class="muted">${esc(c.note)}</small>` : ""}`;
      } catch (error) {
        target.innerHTML = `<div class="banner banner-warn">${icon("alert")}<p>${esc(error.message)}</p></div>`;
      }
    }));
    await load();
  },

  async forecast(host) {
    host.innerHTML = loading("Calculando tendencias y predicción...");
    try {
      const [trends, forecast, series] = await Promise.all([
        api.get("/intelligence/trends", { days: 7 }), api.get("/intelligence/forecast", { horizon: 7 }), api.get("/measurements/series", { days: 30 })]);
      const t = trends.trend;
      const f = forecast.forecast;
      host.innerHTML = `
        <h2>Tendencias de los últimos ${trends.days} días</h2>
        ${t.enoughData ? `<div class="stats" style="margin-top:14px">
            <div class="stat"><span>Promedio</span><strong>${fmt.ph(t.mean)}</strong></div>
            <div class="stat"><span>Mínimo</span><strong>${fmt.ph(t.min)}</strong></div>
            <div class="stat"><span>Máximo</span><strong>${fmt.ph(t.max)}</strong></div>
            <div class="stat"><span>Tendencia</span><strong style="font-size:18px">${esc(t.directionLabel)}</strong></div>
            <div class="stat"><span>Vs. periodo anterior</span><strong>${t.changeVsPrevious === null ? "--" : fmt.signed(t.changeVsPrevious)}</strong></div>
          </div><p class="muted" style="margin-top:10px">${esc(t.message)}</p>`
          : `<div class="banner banner-info" style="margin-top:14px">${icon("info")}<p>${esc(t.message)}</p></div>`}
        <section class="card" style="margin-top:18px">
          <div class="card-head"><div class="card-title">${icon("trend")}Predicción a ${f.available ? f.horizonDays : "--"} días</div>
            ${f.available ? `<span class="badge badge-sim">${icon("sparkle")}${fmt.ph(f.points.at(-1).predicted)} estimado</span>` : ""}</div>
          ${f.available ? `<div data-forecast-chart></div>
              <div class="legend"><span><i style="background:var(--primary-2)"></i>Mediciones</span><span><i style="background:var(--sim)"></i>Predicción</span><span><i style="background:rgba(195,155,255,.4)"></i>Intervalo 95 %</span><span><i style="background:rgba(47,210,122,.5)"></i>Rango recomendado</span></div>
              <p style="margin-top:12px">${esc(forecast.outlook)}</p>
              <p class="muted" style="margin-top:6px">${esc(f.method)} · basada en ${f.basedOn} mediciones durante ${f.spanDays} días · R² ${f.r2}</p>`
            : `<div class="banner banner-info">${icon("info")}<div><strong>No es posible generar una predicción confiable</strong><p>${esc(f.reason)}</p></div></div>`}
          <h3 style="margin-top:16px">Limitaciones</h3>
          <ul class="list bullets" style="margin-top:8px">${f.limitations.map((l) => `<li>${icon("info")}<span>${esc(l)}</span></li>`).join("")}</ul>
        </section>`;
      if (f.available) {
        lineChart(host.querySelector("[data-forecast-chart]"), {
          points: series.map((p) => ({ t: new Date(p.measuredAt), v: p.ph, status: p.status })),
          forecast: f.points.map((p) => ({ t: new Date(p.at), v: p.predicted, lo: p.lower, hi: p.upper })),
          band: { min: forecast.idealMin, max: forecast.idealMax },
        });
      }
    } catch (error) {
      host.innerHTML = emptyState("error", "No se pudo calcular", error.message);
    }
  },

  async scenario(host) {
    host.innerHTML = `
      <h2>Escenario: ¿Qué pasa si...?</h2>
      <p class="muted">Mueve el control para simular un pH hipotético con las reglas de tu perfil activo. No se guarda en el historial.</p>
      <div class="row" style="margin-top:18px;gap:24px;align-items:center">
        ${flask()}
        <div class="stack" style="flex:1;min-width:220px">
          <label for="sc-ph" class="muted">pH hipotético</label>
          <div class="scenario-value" data-value>6.00</div>
          <input class="range-slider" id="sc-ph" type="range" min="0" max="14" step="0.05" value="6">
          <div class="ph-scale-labels"><span>0</span><span>7</span><span>14</span></div>
          <button class="btn btn-primary btn-pill" data-simulate style="align-self:flex-start">${icon("play")}Simular</button>
        </div>
      </div>
      <div data-result style="margin-top:18px"></div>`;
    const slider = host.querySelector("#sc-ph");
    slider.addEventListener("input", () => { host.querySelector("[data-value]").textContent = Number(slider.value).toFixed(2); });
    host.querySelector("[data-simulate]").addEventListener("click", (event) => withBusy(event.currentTarget, async () => {
      try {
        const r = await api.post("/intelligence/scenario", { hypotheticalPh: Number(slider.value) });
        const card = (title, c) => `<div class="inset"><small class="muted">${title}</small>
          ${c ? `<div class="result-value"><strong style="font-size:36px" class="num">${fmt.ph(c.ph)}</strong></div>${statusBadge(c.status, `${c.nature === "ACIDIC" ? "Ácida" : c.nature === "NEUTRAL" ? "Neutra" : "Alcalina"} · ${c.status === "OPTIMAL" ? "En rango" : c.status === "CAUTION" ? "Precaución" : "Crítico"}`)}`
            : `<p class="muted">Sin medición actual</p>`}</div>`;
        host.querySelector("[data-result]").innerHTML = `
          <div class="grid grid-2">${card("Actual", r.current)}${card("Hipotético", r.hypothetical)}</div>
          <p style="margin-top:14px">${esc(r.comparison)}</p>
          <p style="margin-top:8px">${esc(r.hypothetical.explanation)}</p>
          <section class="card" style="margin-top:14px">${adviceBlock(r.advice)}</section>
          <div class="scenario-ai" data-explain-host>
            <div class="row-between"><div><strong>${icon("sparkle")}¿Qué significaría este escenario?</strong>
              <p class="muted" style="font-size:13px;margin-top:2px">La IA explica efectos, señales tempranas y prevención; el sistema calcula las cifras, verifica cada número y las citas.</p></div>
              <button class="btn btn-primary btn-pill" data-explain>${icon("sparkle")}Explicar con IA</button></div>
            <div data-explanation></div>
          </div>
          <p class="disclaimer" style="margin-top:10px">${icon("info")}${esc(r.note)} Perfil: ${esc(r.profileName)}.</p>`;
        const ph = Number(slider.value);
        host.querySelector("[data-explain]").addEventListener("click", (ev) => withBusy(ev.currentTarget, async () => {
          const box = host.querySelector("[data-explanation]");
          box.innerHTML = loading("La IA está analizando el escenario...");
          try {
            const x = await api.post("/intelligence/scenario/explain", { hypotheticalPh: ph });
            box.innerHTML = scenarioExplanationView(x);
          } catch (error) {
            box.innerHTML = "";
            toast(error.message, "error");
          }
        }));
      } catch (error) {
        toast(error.message, "error");
      }
    }));
  },

  async recommendations(host) {
    host.innerHTML = loading();
    try {
      const r = await api.get("/intelligence/recommendations");
      host.innerHTML = `<h2>Recomendaciones</h2>
        ${r.basedOn ? `<p class="muted" style="margin-top:4px">Basadas en tu última medición: pH ${fmt.ph(r.basedOn.ph)} (${esc(r.basedOn.statusLabel.toLowerCase())}) del ${fmt.dateTime(r.basedOn.measuredAt)} · Perfil ${esc(r.profileName)}</p>` : ""}
        <section class="card" style="margin-top:14px">${adviceBlock(r.advice)}</section>
        ${citationBlock(r.sources, { coverageNote: r.sources && r.sources.length ? null : r.coverageNote,
          lead: "Qué dicen las normas oficiales sobre este caso. Las citas se recuperan de la biblioteca normativa con búsqueda BM25." })}
        <p class="disclaimer" style="margin-top:12px">${icon("info")}${esc(r.disclaimer)}</p>`;
    } catch (error) {
      host.innerHTML = emptyState("error", "No se pudieron cargar", error.message);
    }
  },

  async ml(host) {
    await mlPane(host);
  },

  async library(host) {
    await libraryPane(host);
  },

  async reports(host) {
    await agentReportPane(host);
  },

  async assistant(host) {
    await assistantPane(host);
  },

  async deep(host) {
    await deepPane(host);
  },

  async usage(host) {
    await usagePane(host);
  },
};

export const intelligenceView = {
  name: "intelligence",
  title: "Centro de análisis IA",
  async render(root, ctx) {
    const initial = PANES.some(([k]) => k === ctx.route.sub) ? ctx.route.sub : "diagnosis";
    root.innerHTML = `
      <div class="ia-layout">
        <nav class="card ia-menu" aria-label="Funciones de IA">
          <div class="ia-menu-head">${brainHolo()}<h2 class="h-sm">Análisis inteligente</h2><small class="muted">Estadística, reglas de dominio e IA</small></div>
          ${PANES.map(([key, label, ic]) => `<button data-pane="${key}">${icon(ic)}${label}</button>`).join("")}
        </nav>
        <section class="card glow" data-pane-host style="min-height:420px"></section>
      </div>`;
    const host = root.querySelector("[data-pane-host]");
    const open = (key) => {
      root.querySelectorAll("[data-pane]").forEach((b) => {
        b.classList.toggle("active", b.dataset.pane === key);
        b.setAttribute("aria-pressed", String(b.dataset.pane === key));
      });
      host.classList.remove("page-enter");
      void host.offsetWidth;
      host.classList.add("page-enter");
      history.replaceState(null, "", `#/intelligence/${key}`);
      panes[key](host);
    };
    root.querySelectorAll("[data-pane]").forEach((b) => b.addEventListener("click", () => open(b.dataset.pane)));
    open(initial);
    return null;
  },
};
