import { esc, fmt } from "../core/format.js";

const W = 720;
const H = 280;
const PAD = { l: 44, r: 18, t: 18, b: 34 };
let uid = 0;

function scale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1;
  return (v) => rangeMin + ((v - domainMin) / span) * (rangeMax - rangeMin);
}

// Gráfica de línea en SVG: serie de pH, banda del rango ideal, predicción con incertidumbre y anomalías.
export function lineChart(host, { points = [], band, forecast = [], anomalies = [], label = "pH", bandLabel = "Rango 95 %" }) {
  const id = ++uid;
  const all = [...points.map((p) => p.v), ...forecast.flatMap((f) => [f.lo, f.hi]), ...(band ? [band.min, band.max] : [])];
  const times = [...points.map((p) => p.t.getTime()), ...forecast.map((f) => f.t.getTime())];
  const yMin = Math.max(0, Math.floor((Math.min(...all) - 0.2) * 2) / 2);
  const yMax = Math.min(14, Math.ceil((Math.max(...all) + 0.2) * 2) / 2);
  const step = yMax - yMin > 4 ? 1 : 0.5;
  const tMin = Math.min(...times);
  const tMax = Math.max(...times) === tMin ? tMin + 3600000 : Math.max(...times);
  const x = scale(tMin, tMax, PAD.l, W - PAD.r);
  const y = scale(yMin, yMax, H - PAD.b, PAD.t);

  const yTicks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step);
  const xTicks = Array.from({ length: 6 }, (_, i) => new Date(tMin + ((tMax - tMin) * i) / 5));
  const sameDay = tMax - tMin < 86400000 * 1.5;

  const linePath = points.map((p, i) => `${i ? "L" : "M"}${x(p.t.getTime()).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${x(points.at(-1).t.getTime()).toFixed(1)},${H - PAD.b} L${x(points[0].t.getTime()).toFixed(1)},${H - PAD.b} Z` : "";
  const forecastStart = points.length ? [{ t: points.at(-1).t, v: points.at(-1).v, lo: points.at(-1).v, hi: points.at(-1).v }] : [];
  const fc = [...forecastStart, ...forecast];
  const fLine = fc.map((p, i) => `${i ? "L" : "M"}${x(p.t.getTime()).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const fBand = fc.length
    ? `${fc.map((p, i) => `${i ? "L" : "M"}${x(p.t.getTime()).toFixed(1)},${y(p.hi).toFixed(1)}`).join(" ")} ${[...fc].reverse().map((p) => `L${x(p.t.getTime()).toFixed(1)},${y(p.lo).toFixed(1)}`).join(" ")} Z` : "";

  host.classList.add("chart");
  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de ${esc(label)}">
      <defs>
        <linearGradient id="area${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#22c7f0" stop-opacity=".35"/><stop offset="1" stop-color="#22c7f0" stop-opacity="0"/>
        </linearGradient>
        <clipPath id="clip${id}"><rect x="${PAD.l}" y="${PAD.t - 6}" width="${W - PAD.l - PAD.r}" height="${H - PAD.t - PAD.b + 12}"/></clipPath>
      </defs>
      ${yTicks.map((v) => `<line class="grid-line" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="axis-label" x="${PAD.l - 8}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`).join("")}
      ${xTicks.map((d) => `<text class="axis-label" x="${x(d.getTime())}" y="${H - 10}" text-anchor="middle">${sameDay ? fmt.time(d) : fmt.day(d)}</text>`).join("")}
      <g clip-path="url(#clip${id})">
        ${band ? `<rect class="ideal-band" x="${PAD.l}" width="${W - PAD.l - PAD.r}" y="${y(Math.min(band.max, yMax))}" height="${Math.max(0, y(Math.max(band.min, yMin)) - y(Math.min(band.max, yMax)))}"/>` : ""}
        ${forecast.length ? `<path class="forecast-band" d="${fBand}"/><path class="forecast-line" d="${fLine}"/>` : ""}
        ${points.length > 1 ? `<path class="series-area" fill="url(#area${id})" d="${areaPath}"/>` : ""}
        ${points.length > 1 ? `<path class="series-line" d="${linePath}"/>` : ""}
      </g>
      ${points.map((p) => `<circle class="series-dot dot-${p.status || ""}" cx="${x(p.t.getTime())}" cy="${y(p.v)}" r="${points.length > 60 ? 2.5 : 4.5}"/>`).join("")}
      ${anomalies.map((a) => `<circle class="anomaly-ring" cx="${x(a.t.getTime())}" cy="${y(a.v)}" r="7"/>`).join("")}
      ${forecast.length ? `<circle cx="${x(forecast.at(-1).t.getTime())}" cy="${y(forecast.at(-1).v)}" r="5" fill="var(--sim)"/>` : ""}
      <rect data-overlay x="${PAD.l}" y="${PAD.t}" width="${W - PAD.l - PAD.r}" height="${H - PAD.t - PAD.b}" fill="transparent"/>
    </svg>
    <div class="chart-tooltip" hidden></div>`;

  const line = host.querySelector(".series-line");
  if (line && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const length = line.getTotalLength();
    line.style.strokeDasharray = `${length}`;
    line.style.strokeDashoffset = `${length}`;
    line.style.animation = "draw 1.3s ease forwards";
  }

  const svg = host.querySelector("svg");
  const tooltip = host.querySelector(".chart-tooltip");
  const candidates = [
    ...points.map((p) => ({ ...p, kind: "Medición" })),
    ...forecast.map((f) => ({ ...f, kind: "Predicción" })),
  ];
  svg.querySelector("[data-overlay]").addEventListener("pointermove", (event) => {
    if (!candidates.length) return;
    const box = svg.getBoundingClientRect();
    const vx = ((event.clientX - box.left) / box.width) * W;
    const nearest = candidates.reduce((best, p) => (Math.abs(x(p.t.getTime()) - vx) < Math.abs(x(best.t.getTime()) - vx) ? p : best));
    tooltip.hidden = false;
    tooltip.style.left = `${(x(nearest.t.getTime()) / W) * box.width}px`;
    tooltip.style.top = `${(y(nearest.v) / H) * box.height}px`;
    tooltip.innerHTML = `<strong>pH ${fmt.ph(nearest.v)}</strong>${nearest.kind} · ${fmt.dateTime(nearest.t.toISOString())}`
      + (nearest.lo !== undefined && nearest.kind === "Predicción" ? `<br>${bandLabel}: ${fmt.ph(nearest.lo)} - ${fmt.ph(nearest.hi)}` : "");
  });
  svg.querySelector("[data-overlay]").addEventListener("pointerleave", () => { tooltip.hidden = true; });
}

// Gráfica de barras para distribución de estados.
export function barChart(host, bars) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const bw = (W - PAD.l - PAD.r) / bars.length;
  const y = scale(0, max, H - PAD.b, PAD.t);
  host.classList.add("chart");
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribución de mediciones">
    ${[0, 0.5, 1].map((f) => `<line class="grid-line" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(max * f)}" y2="${y(max * f)}"/>
      <text class="axis-label" x="${PAD.l - 8}" y="${y(max * f) + 4}" text-anchor="end">${Math.round(max * f)}</text>`).join("")}
    ${bars.map((b, i) => {
      const bx = PAD.l + i * bw + bw * 0.22;
      const top = y(b.value);
      return `<rect class="bar" x="${bx}" width="${bw * 0.56}" y="${top}" height="${H - PAD.b - top}" rx="8" fill="${b.color}" opacity=".85">
        <animate attributeName="height" from="0" to="${H - PAD.b - top}" dur=".7s" fill="freeze"/>
        <animate attributeName="y" from="${H - PAD.b}" to="${top}" dur=".7s" fill="freeze"/></rect>
        <text class="axis-label" x="${bx + bw * 0.28}" y="${H - 10}" text-anchor="middle">${esc(b.label)}</text>
        <text class="axis-label" x="${bx + bw * 0.28}" y="${top - 8}" text-anchor="middle" style="font-weight:700">${b.value}</text>`;
    }).join("")}
  </svg>`;
}

// Barras de puntaje de anomalía (0-1) por medición, con la línea del umbral del modelo.
export function scoreChart(host, items, threshold) {
  const id = ++uid;
  const minScore = 0.3;
  const y = scale(minScore, 1, H - PAD.b, PAD.t);
  const bw = (W - PAD.l - PAD.r) / Math.max(items.length, 1);
  const ticks = [0.3, 0.5, 0.7, 0.9];
  const firstT = items[0]?.t;
  const lastT = items.at(-1)?.t;
  host.classList.add("chart");
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Puntaje de anomalía por medición">
    ${ticks.map((v) => `<line class="grid-line" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="axis-label" x="${PAD.l - 8}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`).join("")}
    ${items.map((p, i) => {
      const value = Math.max(minScore, p.score);
      const top = y(value);
      const color = p.anomalous ? "var(--crit)" : value > threshold - 0.05 ? "var(--warn)" : "var(--primary-2)";
      return `<rect x="${PAD.l + i * bw + bw * 0.15}" width="${Math.max(1.5, bw * 0.7)}" y="${top}" height="${H - PAD.b - top}" rx="2" fill="${color}" opacity="${p.anomalous ? 1 : 0.55}">
        <animate attributeName="height" from="0" to="${H - PAD.b - top}" dur=".6s" fill="freeze"/><animate attributeName="y" from="${H - PAD.b}" to="${top}" dur=".6s" fill="freeze"/>
        <title>${fmt.dateTime(p.t.toISOString())} · pH ${fmt.ph(p.ph)} · puntaje ${p.score.toFixed(2)}</title></rect>`;
    }).join("")}
    <line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(threshold)}" y2="${y(threshold)}" stroke="var(--crit)" stroke-width="2" stroke-dasharray="6 5"/>
    <text class="axis-label" x="${PAD.l + 6}" y="${y(threshold) - 6}" style="fill:var(--crit);font-weight:700;paint-order:stroke;stroke:var(--surface-solid);stroke-width:4px">Umbral ${threshold.toFixed(2)}</text>
    ${firstT ? `<text class="axis-label" x="${PAD.l}" y="${H - 10}">${fmt.day(firstT)}</text><text class="axis-label" x="${W - PAD.r}" y="${H - 10}" text-anchor="end">${fmt.day(lastT)}</text>` : ""}
    <desc id="score${id}">Barras rojas: mediciones que el modelo considera inusuales.</desc>
  </svg>`;
}

// Consumo diario de IA: barras apiladas (llamadas correctas y fallos) con etiquetas espaciadas.
export function usageChart(host, days) {
  const max = Math.max(1, ...days.map((d) => d.calls + d.failures));
  const bw = (W - PAD.l - PAD.r) / Math.max(days.length, 1);
  const y = scale(0, max, H - PAD.b, PAD.t);
  const every = Math.max(1, Math.ceil(days.length / 8));
  host.classList.add("chart");
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Llamadas de IA por día">
    ${[0, 0.5, 1].map((f) => `<line class="grid-line" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(max * f)}" y2="${y(max * f)}"/>
      <text class="axis-label" x="${PAD.l - 8}" y="${y(max * f) + 4}" text-anchor="end">${Math.round(max * f)}</text>`).join("")}
    ${days.map((d, i) => {
      const bx = PAD.l + i * bw + bw * 0.18;
      const okTop = y(d.calls);
      const failTop = y(d.calls + d.failures);
      const label = d.date.slice(5).replace("-", "/");
      return `<g class="usage-day" style="--i:${i}"><title>${label}: ${d.calls} llamadas, ${d.failures} fallos, ${d.tokens} tokens, US$ ${Number(d.estimatedUsd).toFixed(4)}</title>
        <rect class="bar" x="${bx}" width="${bw * 0.64}" y="${okTop}" height="${H - PAD.b - okTop}" rx="3" fill="var(--primary-2)"/>
        ${d.failures ? `<rect class="bar" x="${bx}" width="${bw * 0.64}" y="${failTop}" height="${okTop - failTop}" rx="3" fill="var(--crit)"/>` : ""}
        ${(i % every === 0 && days.length - 1 - i >= every / 2) || i === days.length - 1 ? `<text class="axis-label" x="${bx + bw * 0.32}" y="${H - 10}" text-anchor="middle">${label}</text>` : ""}</g>`;
    }).join("")}
  </svg>`;
}

// Curva de aprendizaje: error de entrenamiento y de validación por época, con la época elegida (detención temprana).
export function lossChart(host, train, validation, bestEpoch) {
  const all = [...train, ...validation];
  const max = Math.max(...all) * 1.05;
  const min = Math.min(0, Math.min(...all));
  const LW = 440;
  const LH = 250;
  const x = scale(1, Math.max(train.length, 2), PAD.l, LW - PAD.r);
  const y = scale(min, max, LH - PAD.b, PAD.t);
  const path = (series) => series.map((v, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => min + (max - min) * f);
  host.classList.add("chart");
  host.innerHTML = `<svg viewBox="0 0 ${LW} ${LH}" role="img" aria-label="Curva de aprendizaje">
    ${ticks.map((v) => `<line class="grid-line" x1="${PAD.l}" x2="${LW - PAD.r}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="axis-label" x="${PAD.l - 8}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(2)}</text>`).join("")}
    ${[...new Set([1, Math.ceil(train.length / 2), train.length])].map((e) => `<text class="axis-label" x="${x(e)}" y="${LH - 10}" text-anchor="middle">época ${e}</text>`).join("")}
    <line x1="${x(bestEpoch)}" x2="${x(bestEpoch)}" y1="${PAD.t}" y2="${LH - PAD.b}" stroke="var(--ok)" stroke-dasharray="4 4"/>
    <text class="axis-label" x="${x(bestEpoch) + 6}" y="${PAD.t + 12}" fill="var(--ok)">mejor época (${bestEpoch})</text>
    <path class="loss-line train" d="${path(train)}"/>
    <path class="loss-line val" d="${path(validation)}"/>
  </svg>`;
  host.querySelectorAll(".loss-line").forEach((line) => {
    const length = line.getTotalLength();
    line.style.strokeDasharray = `${length}`;
    line.style.strokeDashoffset = `${length}`;
    line.style.animation = "draw 1.4s ease forwards";
  });
}
