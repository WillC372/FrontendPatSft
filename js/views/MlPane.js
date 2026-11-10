import { api } from "../core/Api.js";
import { esc, fmt } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { emptyState, loading } from "../ui/Components.js";
import { lineChart, scoreChart } from "../ui/Charts.js";

// pH scale color (universal indicator) for the hourly pattern.
function phColor(ph) {
  const stops = [[4, [229, 56, 59]], [5.5, [247, 127, 0]], [6.5, [252, 191, 73]], [7, [47, 210, 122]], [7.6, [25, 211, 197]], [8.5, [30, 139, 255]], [10, [123, 47, 247]]];
  if (ph <= stops[0][0]) return `rgb(${stops[0][1]})`;
  for (let i = 1; i < stops.length; i++) {
    if (ph <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      const t = (ph - a) / (b - a);
      return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(",")})`;
    }
  }
  return `rgb(${stops.at(-1)[1]})`;
}

export async function mlPane(host) {
  let days = 30;
  const includeSimulated = false;
  host.innerHTML = `
    <div class="dx-head"><div><h2>Aprendizaje automático local</h2>
      <p class="muted" style="max-width:64ch">Un modelo Isolation Forest aprende cómo se comporta normalmente tu agua (valor, cambios, velocidad y hora del día) y señala las mediciones que no encajan, aunque estén dentro del rango. Corre en el servidor: sin APIs externas y sin enviar tus datos.</p></div>
      <div class="row"><div class="tabs"><button class="tab" data-d="7">7 días</button><button class="tab active" data-d="30">30 días</button></div></div></div>
    <div data-body style="margin-top:14px">${loading("Entrenando el modelo...")}</div>`;
  const body = host.querySelector("[data-body]");

  const load = async () => {
    body.innerHTML = loading("Entrenando el modelo...");
    let d;
    try {
      d = await api.get("/intelligence/ml/insights", { days, includeSimulated });
    } catch (error) {
      body.innerHTML = emptyState("error", "No se pudo analizar", error.message);
      return;
    }
    if (!d.trained) {
      body.innerHTML = `<div class="banner banner-info">${icon("database")}<div><strong>El modelo aún no tiene datos suficientes</strong><p>${esc(d.reason)}</p>
        <p class="muted" style="margin-top:6px">Con más mediciones a distintas horas, el modelo aprenderá tu patrón habitual. Mientras tanto, las reglas fijas siguen detectando anomalías.</p></div></div>`;
      return;
    }
    const hours = d.hourlyPattern;
    body.innerHTML = `
      <div class="stats">
        <div class="stat"><span>Entrenado con</span><strong>${d.trainingSize}</strong><small class="muted">mediciones · ${d.trainingSpanDays} días</small></div>
        <div class="stat"><span>Árboles</span><strong>${d.treeCount}</strong><small class="muted">muestra de ${d.sampleSize}</small></div>
        <div class="stat"><span>Umbral</span><strong>${d.threshold.toFixed(2)}</strong><small class="muted">~${Math.round(d.contamination * 100)} % más inusual</small></div>
        <div class="stat"><span>Entrenamiento</span><strong>${d.trainingMillis} ms</strong><small class="muted">${fmt.relative(d.trainedAt)}</small></div>
      </div>
      <p class="muted" style="margin-top:10px;font-size:13px">${esc(d.method)}${d.includeSimulated ? " Incluye datos simulados (solo pruebas)." : ""}</p>
      <section class="card" style="margin-top:16px"><div class="card-head"><div class="card-title">${icon("activity")}Puntaje de rareza por medición</div><small class="muted">${d.points.length} mediciones en ${d.periodDays} días</small></div>
        <div data-score></div>
        <p class="muted" style="font-size:13px">Cada barra es una medición: cuanto más alta, más difícil de explicar con tu comportamiento habitual. En rojo, las que superan el umbral.</p></section>
      <section class="card" style="margin-top:16px"><div class="card-head"><div class="card-title">${icon("sun")}Tu pH según la hora del día</div><small class="muted">promedio por hora (UTC)</small></div>
        <div class="hour-strip">${hours.map((h) => h.averagePh === null ? `<div class="empty" title="${h.hour}:00 sin mediciones"></div>`
          : `<div style="background:${phColor(h.averagePh)}" title="${h.hour}:00 · pH ${h.averagePh.toFixed(2)} · ${h.count} mediciones"></div>`).join("")}</div>
        <div class="hour-labels">${hours.map((h) => `<span>${h.hour}</span>`).join("")}</div>
        <p class="muted" style="font-size:13px;margin-top:8px">El modelo usa este patrón: un valor normal a una hora en la que tu agua nunca lo tiene también cuenta como inusual. Las franjas rayadas son horas sin mediciones.</p></section>
      <section class="card" style="margin-top:16px"><div class="card-head"><div class="card-title">${icon("target")}Mediciones inusuales</div><span class="badge ${d.anomalies.length ? "badge-warn" : "badge-ok"}">${d.anomalies.length}</span></div>
        ${d.anomalies.length ? `<div data-ml-chart style="margin-bottom:12px"></div>` + d.anomalies.map((a) => {
          const max = Math.max(...a.factors.map((f) => f.weight), 1);
          return `<div class="finding CAUTION">${icon("alert")}<div style="flex:1;min-width:0"><strong>pH ${fmt.ph(a.ph)} · puntaje ${a.score.toFixed(2)}</strong>
            <small class="muted"> ${fmt.dateTime(a.measuredAt)} · ${a.source === "PHOTO" ? "foto" : a.source === "SIMULATED" ? "simulado" : a.source === "REAL" ? "medidor" : "manual"}</small>
            <div style="margin-top:6px">${a.factors.map((f) => `<div class="factor"><span><strong>${esc(f.label)}:</strong> ${esc(f.value)} <span class="muted">(${esc(f.typical)})</span></span><span class="meter"><i style="width:${Math.min(100, (f.weight / max) * 100)}%"></i></span></div>`).join("")}</div></div></div>`;
        }).join("") : `<div class="banner banner-ok">${icon("check")}<p>Ninguna medición del periodo se sale de tu comportamiento habitual.</p></div>`}
      </section>`;
    scoreChart(body.querySelector("[data-score]"), d.points.map((p) => ({ ...p, t: new Date(p.measuredAt) })), d.threshold);
    const chartHost = body.querySelector("[data-ml-chart]");
    if (chartHost && d.points.length > 1) {
      lineChart(chartHost, { points: d.points.map((p) => ({ t: new Date(p.measuredAt), v: p.ph })),
        anomalies: d.anomalies.map((a) => ({ t: new Date(a.measuredAt), v: a.ph })) });
    }
  };
  host.querySelectorAll("[data-d]").forEach((tab) => tab.addEventListener("click", () => {
    host.querySelectorAll("[data-d]").forEach((t) => t.classList.toggle("active", t === tab));
    days = Number(tab.dataset.d);
    load();
  }));
  await load();
}
