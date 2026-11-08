import { api } from "../core/api.js";
import { esc, fmt } from "../core/format.js";
import { icon } from "../ui/icons.js";
import { emptyState, loading } from "../ui/components.js";
import { lineChart, lossChart } from "../ui/charts.js";

const ALERT_CLASS = { OK: "banner-info", INFO: "banner-info", CAUTION: "banner-warn", CRITICAL: "banner-crit" };
const ALERT_ICON = { OK: "check", INFO: "info", CAUTION: "alert", CRITICAL: "error" };

/** Diagrama animado de la red desplegada en el tiempo: 24 horas entran, 12 salen. */
function networkDiagram(a) {
  const cells = 6;
  return `<svg class="lstm-diagram" viewBox="0 0 720 170" role="img" aria-label="Red LSTM desplegada en el tiempo">
    ${Array.from({ length: cells }, (_, i) => {
      const cx = 60 + i * 105;
      const label = i === cells - 2 ? "…" : i === cells - 1 ? "h−1" : `h−${24 - i}`;
      return `<g class="lstm-cell" style="--i:${i}">
        <line class="flow-in" x1="${cx}" y1="150" x2="${cx}" y2="112"/>
        <text class="axis-label" x="${cx}" y="166" text-anchor="middle">${label}</text>
        <rect x="${cx - 34}" y="62" width="68" height="50" rx="12"/>
        <text x="${cx}" y="92" text-anchor="middle" class="cell-text">LSTM</text>
        ${i < cells - 1 ? `<line class="flow-state" x1="${cx + 34}" y1="87" x2="${cx + 71}" y2="87"/>` : ""}
      </g>`;
    }).join("")}
    <line class="flow-out" x1="585" y1="62" x2="585" y2="34"/>
    <rect class="dense" x="520" y="6" width="190" height="28" rx="8"/>
    <text x="615" y="25" text-anchor="middle" class="cell-text">Densa → ${a.outputs} horas</text>
  </svg>`;
}

function scoreRows(models, chosen) {
  const max = Math.max(...models.map((m) => m.mae), 0.0001);
  return models.map((m, i) => `<div class="score-row ${m.id === chosen ? "chosen" : ""}" style="--i:${i}">
      <div class="row-between"><span>${m.id === chosen ? icon("check") : ""}${esc(m.label)}</span><strong class="num">${m.mae.toFixed(3)} pH</strong></div>
      <div class="meter"><i data-w="${(m.mae / max) * 100}%" style="width:0"></i></div></div>`).join("");
}

export async function deepPane(host) {
  let includeSimulated = false;
  host.innerHTML = `
    <div class="dx-head"><div><h2>Red neuronal de predicción (LSTM)</h2>
      <p class="muted" style="max-width:66ch">Una red neuronal recurrente aprende de tu historial por horas y predice el pH de las próximas 12 horas. Antes de usarla, el sistema la compara con referencias simples en datos que nunca vio: si no es mejor, usa la referencia y lo dice.</p></div>
      <label class="check" title="Solo para pruebas: el simulador no es agua real"><input type="checkbox" data-sim>Incluir simulados</label></div>
    <div data-body style="margin-top:14px">${loading("Entrenando la red neuronal...")}</div>`;
  const body = host.querySelector("[data-body]");
  const load = async () => {
    body.innerHTML = loading("Entrenando la red neuronal...");
    let r;
    try {
      r = await api.get("/intelligence/deep/forecast", { includeSimulated });
    } catch (error) {
      body.innerHTML = emptyState("error", "No disponible", error.message);
      return;
    }
    render(body, r);
  };
  host.querySelector("[data-sim]").addEventListener("change", (e) => { includeSimulated = e.target.checked; load(); });
  await load();
}

function render(body, r) {
  const d = r.data;
  if (!r.trained) {
    const pct = Math.min(100, Math.round((d.windows / d.requiredWindows) * 100));
    body.innerHTML = `
      <div class="banner banner-info">${icon("info")}<p>${esc(r.reason)}</p></div>
      <section class="card reveal" style="margin-top:14px"><div class="card-head"><div class="card-title">${icon("database")}Datos para entrenar</div><span class="badge">${pct} %</span></div>
        <div class="meter big"><i data-w="${pct}%" style="width:0"></i></div>
        <div class="stats" style="margin-top:14px">
          <div class="stat"><span>Mediciones</span><strong>${d.measurements}</strong></div>
          <div class="stat"><span>Horas con dato</span><strong>${d.observedHours}</strong></div>
          <div class="stat"><span>Ventanas</span><strong>${d.windows}/${d.requiredWindows}</strong></div>
          <div class="stat"><span>Tramos continuos</span><strong>${d.segments}</strong></div>
        </div></section>
      <p class="disclaimer" style="margin-top:12px">${icon("info")}${esc(r.disclaimer)}</p>`;
    animateBars(body);
    return;
  }
  const e = r.evaluation;
  const t = r.training;
  const f = r.forecast;
  const a = r.architecture;
  body.innerHTML = `
    <div class="row">
      <span class="badge ${e.networkChosen ? "badge-ok" : "badge-warn"}">${icon(e.networkChosen ? "brain" : "activity")}Predicción con: ${esc(e.chosenLabel)}</span>
      <span class="badge badge-info">${icon("target")}${e.skillPercent > 0 ? "−" : "+"}${Math.abs(e.skillPercent)} % de error frente a ${esc(e.bestBaselineLabel.toLowerCase())}</span>
      ${r.includesSimulated ? `<span class="badge badge-sim">${icon("flask")}Incluye datos simulados</span>` : ""}
    </div>
    ${r.alert ? `<div class="banner ${ALERT_CLASS[r.alert.level]}" style="margin-top:14px">${icon(ALERT_ICON[r.alert.level])}<p><strong>${r.alert.level === "OK" ? "Sin alertas" : "Alerta anticipada"}.</strong> ${esc(r.alert.message)}</p></div>` : ""}
    <section class="card reveal" style="margin-top:16px"><div class="card-head"><div class="card-title">${icon("trend")}Últimas 48 horas y próximas 12</div>
      <div class="row legend"><span><i style="background:var(--primary-2)"></i>Serie horaria</span><span><i style="background:var(--sim)"></i>Predicción</span><span><i style="background:rgba(195,155,255,.35)"></i>${esc(f ? "Intervalo 90 %" : "")}</span></div></div>
      <div data-forecast></div>
      ${f ? `<small class="muted">${esc(f.intervalLabel)}. Parte de la hora ${fmt.dateTime(f.from)} (pH ${fmt.ph(f.lastPh)}).</small>` : ""}
    </section>
    <div class="dx-grid">
      <section class="card reveal"><div class="card-head"><div class="card-title">${icon("shield")}Comparación en datos no vistos</div><span class="badge">${t.testWindows} ventanas</span></div>
        <p class="muted" style="font-size:13px;margin-bottom:10px">Error absoluto medio de las 12 horas. Menor es mejor.</p>
        ${scoreRows(e.models, e.chosen)}
        <p style="margin-top:12px;font-size:14px">${esc(r.explanation)}</p>
      </section>
      <section class="card reveal"><div class="card-head"><div class="card-title">${icon("activity")}Curva de aprendizaje</div><span class="badge">${t.epochs} épocas · ${(t.trainingMs / 1000).toFixed(1)} s</span></div>
        <div data-loss></div>
        <div class="row legend"><span><i style="background:var(--primary-2)"></i>Entrenamiento</span><span><i style="background:var(--warn)"></i>Validación</span></div>
        <small class="muted">Detención temprana: se guardan los pesos de la época con menor error de validación.</small>
      </section>
    </div>
    <section class="card reveal" style="margin-top:16px"><div class="card-head"><div class="card-title">${icon("brain")}Arquitectura</div><span class="badge">${a.parameters.toLocaleString("es")} parámetros</span></div>
      ${networkDiagram(a)}
      <div class="stats" style="margin-top:12px">
        <div class="stat"><span>Entrada</span><strong>${a.windowHours} h × ${a.inputs}</strong></div>
        <div class="stat"><span>Unidades ocultas</span><strong>${a.hidden}</strong></div>
        <div class="stat"><span>Salida</span><strong>${a.horizonHours} h</strong></div>
        <div class="stat"><span>Datos</span><strong>${d.hours} h</strong><small class="muted">${d.interpolatedHours} interpoladas · ${d.segments} tramos</small></div>
      </div>
      <details style="margin-top:12px"><summary>Variables de entrada y división de datos</summary>
        <ul class="list bullets" style="margin-top:8px">${a.features.map((x) => `<li>${icon("info")}<span>${esc(x)}</span></li>`).join("")}</ul>
        <p class="muted" style="margin-top:8px;font-size:13px">Orden cronológico: ${t.trainWindows} ventanas de entrenamiento, ${t.validationWindows} de validación y ${t.testWindows} de prueba, con 12 horas de separación entre partes para que el modelo no vea el futuro.</p>
      </details>
    </section>
    <p class="disclaimer" style="margin-top:12px">${icon("info")}${esc(r.disclaimer)}</p>`;
  const history = r.history.map((p) => ({ t: new Date(p.at), v: p.ph, status: p.observed ? "" : "INTERP" }));
  lineChart(body.querySelector("[data-forecast]"), {
    points: history,
    forecast: f ? f.points.map((p) => ({ t: new Date(p.at), v: p.chosen, lo: p.lower, hi: p.upper })) : [],
    bandLabel: "Intervalo 90 %",
  });
  lossChart(body.querySelector("[data-loss]"), t.trainLoss, t.validationLoss, t.bestEpoch);
  animateBars(body);
}

function animateBars(root) {
  requestAnimationFrame(() => root.querySelectorAll("[data-w]").forEach((n) => { n.style.width = n.dataset.w; }));
}
