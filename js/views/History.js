import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { esc, fmt } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { confirmDialog, emptyState, loading, modal, sourceBadge, toast } from "../ui/Components.js";
import { barChart, lineChart } from "../ui/Charts.js";
import { manualEntry } from "./MeasureFlow.js";
import { photoReading } from "./PhotoFlow.js";

const PAGE_SIZE = 15;

export const historyView = {
  name: "history",
  title: "Historial de mediciones",
  async render(root, ctx) {
    const state = { days: 7, from: null, to: null, source: "", status: "", page: 0, chart: null };
    let profile;
    try {
      profile = await api.get("/profiles/active");
      if (ctx.stale()) return null;
    } catch (error) {
      root.innerHTML = emptyState("error", "No se pudo cargar el historial", error.message);
      return null;
    }

    root.innerHTML = `
      <div class="row-between reveal">
        <div><h1>Historial de mediciones</h1><p class="muted">Consulta y analiza tus registros. Las gráficas se generan cuando las solicitas.</p></div>
        <div class="row">
          <button class="btn" data-photo>${icon("camera")}Leer desde foto</button>
          <button class="btn" data-manual>${icon("plus")}Registro manual</button>
          <button class="btn" data-export>${icon("download")}Exportar CSV</button>
          <button class="btn" data-pdf title="Informe del periodo con gráficas y fuentes normativas">${icon("file")}Informe PDF</button>
        </div>
      </div>

      <section class="card reveal">
        <div class="row-between">
          <div class="tabs" role="tablist" aria-label="Periodo">
            <button class="tab active" data-days="7" role="tab">Últimos 7 días</button>
            <button class="tab" data-days="30" role="tab">Últimos 30 días</button>
            <button class="tab" data-days="custom" role="tab">${icon("calendar").replace("<svg", '<svg style="width:14px;height:14px;vertical-align:-2px"')} Personalizado</button>
          </div>
          <div class="row">
            <select class="input" data-source aria-label="Origen" style="width:auto">
              <option value="">Todos los orígenes</option><option value="REAL">Medidor físico</option><option value="MANUAL">Manual</option><option value="PHOTO">Foto con IA</option><option value="SIMULATED">Simulador</option>
            </select>
            <select class="input" data-status aria-label="Estado" style="width:auto">
              <option value="">Todos los estados</option><option value="OPTIMAL">Óptimo</option><option value="CAUTION">Precaución</option><option value="CRITICAL">Crítico</option>
            </select>
          </div>
        </div>
        <div class="row" data-custom hidden style="margin-top:14px">
          <div class="field"><label for="h-from">Desde</label><input class="input" type="date" id="h-from"></div>
          <div class="field"><label for="h-to">Hasta</label><input class="input" type="date" id="h-to"></div>
          <button class="btn btn-primary" data-apply style="align-self:flex-end">Aplicar</button>
        </div>
      </section>

      <section class="card reveal">
        <div class="card-head">
          <div class="card-title">${icon("activity")}Gráficas</div>
          <div class="segmented" role="group" aria-label="Tipo de gráfica">
            <button data-chart="line">${icon("trend")}Evolución del pH</button>
            <button data-chart="distribution">${icon("history")}Distribución</button>
          </div>
        </div>
        <div data-chart-area><p class="muted">Elige una gráfica para generarla con los datos del periodo seleccionado.</p></div>
      </section>

      <section class="card reveal">
        <div class="card-head"><div class="card-title">${icon("file")}Registros</div><small class="muted" data-total></small></div>
        <div data-table>${loading()}</div>
        <div class="row-between" style="margin-top:14px" data-pager></div>
      </section>`;

    const tableHost = root.querySelector("[data-table]");
    const pager = root.querySelector("[data-pager]");
    const chartArea = root.querySelector("[data-chart-area]");

    const range = () => {
      if (state.days === "custom" && state.from && state.to) {
        return { from: new Date(`${state.from}T00:00:00`).toISOString(), to: new Date(`${state.to}T23:59:59`).toISOString() };
      }
      const to = new Date();
      return { from: new Date(to.getTime() - (state.days === "custom" ? 7 : state.days) * 86400000).toISOString(), to: to.toISOString() };
    };

    async function loadTable() {
      tableHost.innerHTML = loading();
      try {
        const result = await api.get("/measurements", { ...range(), source: state.source, status: state.status, page: state.page, size: PAGE_SIZE });
        root.querySelector("[data-total]").textContent = `${result.totalElements} mediciones`;
        if (!result.content.length) {
          tableHost.innerHTML = emptyState("history", "Sin mediciones en este periodo", "Cambia el periodo o registra una medición.");
          pager.innerHTML = "";
          return;
        }
        tableHost.innerHTML = `<div class="table-wrap"><table>
          <thead><tr><th>Fecha y hora</th><th>pH</th><th>Estado</th><th>Origen</th><th>Perfil</th><th>Validación</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>${result.content.map((m) => `<tr>
            <td class="num">${fmt.dateTime(m.measuredAt)}</td>
            <td class="mono"><strong>${fmt.ph(m.ph)}</strong></td>
            <td><span class="status-cell status-${m.status}"><span class="dot"></span>${esc(m.statusLabel)}</span></td>
            <td>${sourceBadge(m.source)}</td>
            <td>${esc(m.profileName)}</td>
            <td title="${esc(m.validationNotes || "")}">${esc(m.validationLabel)}</td>
            <td><button class="btn btn-ghost btn-sm" data-detail="${m.id}" aria-label="Ver detalle">${icon("info")}</button>
                <button class="btn btn-ghost btn-sm" data-delete="${m.id}" aria-label="Eliminar">${icon("trash")}</button></td>
          </tr>`).join("")}</tbody></table></div>`;
        pager.innerHTML = `<small class="muted">Página ${result.page + 1} de ${Math.max(result.totalPages, 1)}</small>
          <div class="row"><button class="btn btn-sm" data-prev ${result.page === 0 ? "disabled" : ""}>Anterior</button>
          <button class="btn btn-sm" data-next ${result.page + 1 >= result.totalPages ? "disabled" : ""}>Siguiente</button></div>`;
        pager.querySelector("[data-prev]").onclick = () => { state.page--; loadTable(); };
        pager.querySelector("[data-next]").onclick = () => { state.page++; loadTable(); };
        tableHost.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => remove(b.dataset.delete)));
        tableHost.querySelectorAll("[data-detail]").forEach((b) => b.addEventListener("click", () => {
          showDetail(result.content.find((x) => String(x.id) === b.dataset.detail));
        }));
      } catch (error) {
        tableHost.innerHTML = emptyState("error", "No se pudo cargar", error.message);
      }
    }

    // Everything recorded about one measurement, in a dialog that stays open while it is read.
    function showDetail(m) {
      const row = (label, value) => (value === null || value === undefined || value === "" ? "" : `<dt>${label}</dt><dd>${value}</dd>`);
      modal({
        title: `Medición de pH ${fmt.ph(m.ph)}`,
        body: `<p class="detail-status"><span class="status-cell status-${esc(m.status)}"><span class="dot"></span>${esc(m.statusLabel)}</span> · ${esc(m.natureLabel || "")}</p>
          <p>${esc(m.explanation)}</p>
          <dl class="kv">
            ${row("Fecha y hora", esc(fmt.dateTime(m.measuredAt)))}
            ${row("pH", `<strong class="mono">${fmt.ph(m.ph)}</strong>`)}
            ${row("Temperatura", m.temperatureC === null || m.temperatureC === undefined ? "" : `${Number(m.temperatureC).toFixed(1)} °C`)}
            ${row("Origen", sourceBadge(m.source))}
            ${row("Medidor", esc(m.deviceName || ""))}
            ${row("Perfil", esc(m.profileName))}
            ${row("Validación", esc(m.validationLabel))}
            ${row("Observaciones", esc(m.validationNotes || ""))}
            ${row("Nota", esc(m.note || ""))}
          </dl>`,
        actions: [{ label: "Cerrar", className: "btn-ghost", value: null }],
      });
    }

    async function remove(id) {
      if (!(await confirmDialog("Eliminar medición", "La medición se eliminará del historial. Esta acción no se puede deshacer.", "Eliminar", true))) return;
      try {
        await api.delete(`/measurements/${id}`);
        toast("Medición eliminada.", "ok");
        loadTable();
        if (state.chart) drawChart(state.chart);
      } catch (error) {
        toast(error.message, "error");
      }
    }

    async function drawChart(kind) {
      state.chart = kind;
      root.querySelectorAll("[data-chart]").forEach((b) => b.classList.toggle("active", b.dataset.chart === kind));
      chartArea.innerHTML = loading("Generando gráfica...");
      try {
        const series = (await api.get("/measurements/series", range()))
          .filter((p) => (!state.source || p.source === state.source) && (!state.status || p.status === state.status));
        if (series.length < 2) {
          chartArea.innerHTML = emptyState("history", "Datos insuficientes", "Se necesitan al menos 2 mediciones en el periodo para graficar.");
          return;
        }
        const host = document.createElement("div");
        chartArea.innerHTML = "";
        chartArea.append(host);
        if (kind === "line") {
          lineChart(host, { points: series.map((p) => ({ t: new Date(p.measuredAt), v: p.ph, status: p.status })), band: { min: profile.idealMin, max: profile.idealMax } });
          chartArea.insertAdjacentHTML("beforeend", `<div class="legend" style="margin-top:8px"><span><i style="background:var(--primary-2)"></i>pH medido</span>
            <span><i style="background:rgba(47,210,122,.5)"></i>Rango recomendado (${esc(profile.name)})</span>
            ${series.some((p) => p.source === "SIMULATED") ? `<span class="badge badge-sim">Incluye datos simulados</span>` : ""}</div>`);
        } else {
          const count = (s) => series.filter((p) => p.status === s).length;
          barChart(host, [
            { label: "Óptimo", value: count("OPTIMAL"), color: "var(--ok)" },
            { label: "Precaución", value: count("CAUTION"), color: "var(--warn)" },
            { label: "Crítico", value: count("CRITICAL"), color: "var(--crit)" },
          ]);
        }
      } catch (error) {
        chartArea.innerHTML = emptyState("error", "No se pudo generar la gráfica", error.message);
      }
    }

    function refresh() {
      state.page = 0;
      loadTable();
      if (state.chart) drawChart(state.chart);
    }

    root.querySelectorAll("[data-days]").forEach((tab) => tab.addEventListener("click", () => {
      root.querySelectorAll("[data-days]").forEach((t) => t.classList.toggle("active", t === tab));
      const custom = tab.dataset.days === "custom";
      root.querySelector("[data-custom]").hidden = !custom;
      state.days = custom ? "custom" : Number(tab.dataset.days);
      if (!custom) refresh();
    }));
    root.querySelector("[data-apply]").addEventListener("click", () => {
      state.from = root.querySelector("#h-from").value;
      state.to = root.querySelector("#h-to").value;
      if (!state.from || !state.to || state.from > state.to) {
        toast("Elige un rango de fechas válido.", "warn");
        return;
      }
      refresh();
    });
    root.querySelector("[data-source]").addEventListener("change", (e) => { state.source = e.target.value; refresh(); });
    root.querySelector("[data-status]").addEventListener("change", (e) => { state.status = e.target.value; refresh(); });
    root.querySelectorAll("[data-chart]").forEach((b) => b.addEventListener("click", () => drawChart(b.dataset.chart)));
    root.querySelector("[data-manual]").addEventListener("click", async () => { if (await manualEntry()) refresh(); });
    root.querySelector("[data-photo]").addEventListener("click", async () => { if (await photoReading()) refresh(); });
    root.querySelector("[data-export]").addEventListener("click", async () => {
      try {
        await api.download("/measurements/export", { days: state.days === "custom" ? 30 : state.days }, "aquasense-mediciones.csv");
      } catch (error) {
        toast(error.message, "error");
      }
    });
    root.querySelector("[data-pdf]").addEventListener("click", async (e) => {
      const button = e.currentTarget;
      button.disabled = true;
      try {
        await api.download("/reports/pdf", { days: state.days === "custom" ? 30 : state.days }, "aquasense-informe.pdf");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
    const off = bus.on("measurement:saved", refresh);
    loadTable();
    return off;
  },
};
