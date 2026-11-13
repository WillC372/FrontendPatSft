import { api } from "../core/Api.js";
import { esc, fmt, relativeTime } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { emptyState, loading, toast } from "../ui/Components.js";
import { lineChart } from "../ui/Charts.js";
import { approval, band, HIGH, LOW, num } from "./OfficialText.js";

/** One bar split in three, readable at any width; the legend repeats the counts and percentages as text. */
function distribution(host, parts) {
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
  const pct = (v) => Math.round((v / total) * 1000) / 10;
  host.innerHTML = `
    <div class="dist-bar" role="img" aria-label="${esc(parts.map((p) => `${p.label}: ${p.value} estaciones`).join(", "))}">
      ${parts.filter((p) => p.value > 0).map((p) => `<span class="dist-${p.cls}" style="flex-grow:${p.value}"></span>`).join("")}
    </div>
    <ul class="dist-legend">${parts.map((p) => `<li><i class="dist-${p.cls}"></i><span>${esc(p.label)}</span>
      <strong>${p.value}</strong><small class="muted">${String(pct(p.value)).replace(".", ",")} %</small></li>`).join("")}</ul>`;
}

function stationName(s) {
  return s.name ? esc(s.name) : `Estación ${esc(s.id)}`;
}

function stationCard(s) {
  const b = band(s.lastPh);
  return `<button type="button" class="station-card" data-station="${esc(s.id)}">
    <div class="row-between"><strong class="station-ph">${num(s.lastPh)}</strong><span class="badge ${b.cls}">${b.text}</span></div>
    <span class="station-name">${stationName(s)}</span>
    <small class="muted">${esc(s.state || "")}${s.lastTime ? ` · ${relativeTime(s.lastTime)}` : ""}</small>
  </button>`;
}

function extremeRow(s) {
  return `<li><strong>${num(s.lastPh)}</strong><span>${stationName(s)}${s.state ? ` <small class="muted">· ${esc(s.state)}</small>` : ""}</span>
    <a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener" class="muted small">Ver en USGS</a></li>`;
}

export const officialDataView = {
  name: "official",
  title: "Datos oficiales",
  async render(root, ctx) {
    root.innerHTML = loading();
    let data;
    try {
      data = await api.get("/reference/summary");
      if (ctx.stale()) return null;
    } catch (error) {
      root.innerHTML = emptyState("error", "No se pudieron cargar los datos oficiales", error.message);
      return null;
    }
    if (!data.stationsReporting && !data.featured.length) {
      root.innerHTML = emptyState("globe", "Los datos oficiales se están importando",
        data.lastImportMessage || "El servidor descarga los datos del USGS al arrancar y cada 3 horas. Vuelve en un minuto.");
      return null;
    }
    root.innerHTML = `
      <div class="row-between reveal">
        <div><h1>Datos oficiales de pH</h1>
          <p class="muted">Mediciones reales de pH de las estaciones de monitoreo continuo del Servicio Geológico de EE. UU. (USGS) en ríos y arroyos.
            Son datos públicos de referencia, no mediciones de tu agua, y se guardan aparte de tu historial.</p></div>
        <a class="btn" href="${esc(data.sourceUrl)}" target="_blank" rel="noopener">${icon("globe")}Fuente: USGS</a>
      </div>
      <p class="muted small reveal">${icon("refresh").replace("<svg", '<svg style="width:14px;height:14px;vertical-align:-2px"')}
        ${data.importing ? "Actualizando ahora desde el USGS." : ""} Actualizado ${relativeTime(data.dataUpdatedAt)} (cada 3 horas). Los valores recientes son provisionales hasta que el USGS los revisa.
        ${data.lastImportMessage ? `<strong>${esc(data.lastImportMessage)}</strong>` : ""}</p>

      <section class="card reveal">
        <div class="card-head"><div class="card-title">${icon("activity")}Estaciones con pH en las últimas 24 horas</div></div>
        <div class="stats">
          <div class="stat"><span>Estaciones</span><strong>${data.stationsReporting}</strong><small>reportaron pH</small></div>
          <div class="stat"><span>Mediana</span><strong>${num(data.medianPh)}</strong><small>pH típico</small></div>
          <div class="stat"><span>Mínimo</span><strong>${num(data.minPh)}</strong><small>más ácido</small></div>
          <div class="stat"><span>Máximo</span><strong>${num(data.maxPh)}</strong><small>más alcalino</small></div>
        </div>
        <div data-dist style="margin-top:16px"></div>
        <p class="muted small">El rango 6,5–8,5 es la referencia de la norma secundaria de agua potable de la EPA de EE. UU.; se usa aquí solo para agrupar las estaciones.</p>
      </section>

      <section class="card reveal">
        <div class="card-head"><div class="card-title">${icon("drop")}Estaciones destacadas</div><small class="muted">Toca una para ver su serie</small></div>
        <div class="station-grid">${data.featured.map(stationCard).join("")}</div>
        <div class="station-detail" data-detail hidden></div>
      </section>

      <div class="grid grid-2">
        <section class="card reveal"><div class="card-head"><div class="card-title">${icon("trend")}pH más bajo ahora</div></div>
          <ul class="extremes">${data.lowest.map(extremeRow).join("")}</ul></section>
        <section class="card reveal"><div class="card-head"><div class="card-title">${icon("trend")}pH más alto ahora</div></div>
          <ul class="extremes">${data.highest.map(extremeRow).join("")}</ul></section>
      </div>`;
    distribution(root.querySelector("[data-dist]"), [
      { label: "Bajo 6,5", value: data.below, cls: "low" },
      { label: "Entre 6,5 y 8,5", value: data.within, cls: "mid" },
      { label: "Sobre 8,5", value: data.above, cls: "high" },
    ]);

    const detail = root.querySelector("[data-detail]");
    let selected = null;
    const show = async (id, days = 7) => {
      selected = id;
      root.querySelectorAll("[data-station]").forEach((b) => b.classList.toggle("active", b.dataset.station === id));
      detail.hidden = false;
      detail.innerHTML = loading();
      try {
        const s = await api.get(`/reference/stations/${encodeURIComponent(id)}/readings`, { days });
        if (selected !== id) return;
        detail.innerHTML = `
          <div class="row-between"><div><strong>${stationName(s.station)}</strong>
            <div class="muted small">${esc(s.station.id)} · ${esc(approval(s.station.approvalStatus))}</div></div>
            <div class="tabs" aria-label="Periodo">${[1, 7, 30].map((d) => `<button class="tab${d === s.days ? " active" : ""}" data-days="${d}">${d === 1 ? "24 h" : `${d} días`}</button>`).join("")}</div></div>
          <div class="stats" style="margin:12px 0"><div class="stat"><span>Promedio</span><strong>${num(s.averagePh)}</strong></div>
            <div class="stat"><span>Mínimo</span><strong>${num(s.minPh)}</strong></div><div class="stat"><span>Máximo</span><strong>${num(s.maxPh)}</strong></div></div>
          <div data-chart></div>
          <p class="muted small">${s.points.length ? "" : "No hay lecturas guardadas en este periodo. "}Se guardan hasta 30 días.
            <a href="${esc(s.station.sourceUrl)}" target="_blank" rel="noopener">Ver la estación en el sitio del USGS</a></p>`;
        if (s.points.length) {
          lineChart(detail.querySelector("[data-chart]"), { points: s.points.map((p) => ({ t: new Date(p.t), v: Number(p.ph) })),
            band: { min: LOW, max: HIGH }, bandLabel: "Referencia 6,5–8,5" });
        }
        detail.querySelectorAll("[data-days]").forEach((b) => b.addEventListener("click", () => show(id, Number(b.dataset.days))));
      } catch (error) {
        detail.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
        toast(error.message, "error");
      }
    };
    root.querySelectorAll("[data-station]").forEach((b) => b.addEventListener("click", () => show(b.dataset.station)));
    if (data.featured.length) show(data.featured[0].id);
    // While the server imports new data, check every 20 s and show the new data when the import ends.
    let timer = null;
    if (data.importing) {
      timer = setInterval(async () => {
        try {
          const next = await api.get("/reference/summary");
          if (!next.importing) {
            clearInterval(timer);
            timer = null;
            if (!ctx.stale()) {
              toast("Datos oficiales actualizados.", "ok", 3000);
              ctx.router.resolve();
            }
          }
        } catch { /* try again on the next tick */ }
      }, 20000);
    }
    return () => { if (timer) clearInterval(timer); };
  },
};
