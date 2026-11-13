import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { session } from "../core/Session.js";
import { esc, fmt } from "../core/Format.js";
import { brainHolo, icon, PROFILE_ICONS } from "../ui/Icons.js";
import { emptyState, loading, sourceBadge, statusBadge, toast, withBusy } from "../ui/Components.js";
import { createGauge, phScale } from "../ui/Gauge.js";
import { animateWater } from "../ui/Water.js";
import { manualEntry, measureWithDevice } from "./MeasureFlow.js";
import { browserMeter } from "../core/BrowserMeter.js";
import { photoReading } from "./PhotoFlow.js";

const NATURE_TEXT = {
  ACIDIC: "El pH está por debajo del neutro. Revisa si es adecuado para el uso del agua.",
  NEUTRAL: "pH cercano al neutro, ideal para la mayoria de los usos.",
  ALKALINE: "El pH está por encima del neutro. Revisa si es adecuado para el uso del agua.",
};

export const dashboardView = {
  name: "dashboard",
  title: "Inicio",
  async render(root, ctx) {
    root.innerHTML = loading("Cargando tu panel...");
    let data;
    let overview;
    try {
      [data, overview] = await Promise.all([api.get("/dashboard"), api.get("/intelligence/overview")]);
      if (ctx.stale()) return null;
    } catch (error) {
      root.innerHTML = emptyState("error", "No se pudo cargar el panel", error.message,
        `<button class="btn btn-primary" data-retry>${icon("refresh")}Reintentar</button>`);
      // Tries again by opening the screen again, without reloading the whole page.
      root.querySelector("[data-retry]").addEventListener("click", () => ctx.router.resolve());
      return null;
    }
    const firstName = (data.fullName || session.user?.fullName || "").split(" ")[0];
    const latest = data.latest;
    const profile = data.activeProfile;
    const device = data.device;
    const connected = device.ownedByYou && (device.state === "CONNECTED" || device.state === "LIVE");

    root.innerHTML = `
      <div class="row-between welcome reveal">
        <div><h1>¡Bienvenido, ${esc(firstName)}!</h1><p>Monitorea la calidad del agua de forma inteligente</p></div>
        <div class="row">${data.plan === "PREMIUM" ? `<span class="badge badge-info">${icon("star")}Premium</span>` : `<span class="badge badge-info">Plan gratuito</span>`}</div>
      </div>

      <div class="grid grid-dashboard">
        <section class="card glow gauge-card reveal" aria-labelledby="gauge-title">
          <div class="card-head" style="width:100%">
            <div class="card-title" id="gauge-title"><span class="dot ${device.state === "LIVE" ? "dot-live" : ""}" style="color:${device.state === "LIVE" ? "var(--ok)" : "var(--muted)"}" data-live-dot></span><span data-gauge-title>${device.state === "LIVE" ? "Medición en tiempo real" : "Última medición"}</span></div>
            <span data-gauge-source>${latest ? sourceBadge(latest.source) : ""}</span>
          </div>
          <div data-gauge style="width:100%;display:grid;place-items:center"></div>
          <div class="gauge-meta">
            <div data-gauge-status>${latest ? statusBadge(latest.status, latest.statusLabel) : `<span class="badge badge-info">Sin mediciones</span>`}</div>
            <small class="muted num" data-gauge-meta>${latest ? `${esc(profile.name)} (${profile.idealMin.toFixed(1)} - ${profile.idealMax.toFixed(1)}) · ${fmt.relative(latest.measuredAt)}` : "Realiza tu primera medición"}</small>
          </div>
          <div class="gauge-actions">
            ${browserMeter.connected ? `<button class="btn btn-primary btn-pill" data-measure-usb>${icon("drop")}Medir ahora</button>`
              : connected ? `<button class="btn btn-primary btn-pill" data-measure>${icon("drop")}Medir ahora</button>
              <button class="btn btn-pill" data-live>${icon(device.state === "LIVE" ? "pause" : "play")}${device.state === "LIVE" ? "Detener vivo" : "Tiempo real"}</button>`
              : `<a class="btn btn-primary btn-pill" href="#/devices">${icon("bluetooth")}Conectar medidor</a>`}
            <button class="btn btn-pill" data-photo>${icon("camera")}Leer foto</button>
            <button class="btn btn-pill" data-manual>${icon("edit")}Registro manual</button>
          </div>
          <canvas class="splash" data-splash aria-hidden="true"></canvas>
        </section>

        <div class="stack">
          <section class="card reveal">
            <div class="card-head"><div class="card-title">${icon("drop")}Estado del agua</div></div>
            ${latest ? `<div class="water-state-value">${icon("drop")}<strong data-nature>${esc(latest.natureLabel)}</strong></div>
              <p class="muted" style="margin-top:12px" data-nature-text>${NATURE_TEXT[latest.nature]}</p>
              <div data-scale>${phScale(latest.ph, profile.idealMin, profile.idealMax)}</div>`
              : emptyState("drop", "Sin datos", "Aún no hay mediciones para evaluar.")}
          </section>
          <section class="card reveal">
            <div class="card-head"><div class="card-title">${icon("flask")}Perfil activo</div>
              <a class="btn btn-sm btn-pill" href="#/profiles">Cambiar ${icon("chevronRight")}</a></div>
            <div class="row"><span class="profile-icon">${icon(PROFILE_ICONS[profile.type] || "profiles")}</span><div><strong>Uso: ${esc(profile.name)}</strong>
              <div class="muted num">Rango recomendado ${profile.idealMin.toFixed(1)} - ${profile.idealMax.toFixed(1)}</div></div></div>
          </section>
          <section class="card reveal" data-reference hidden>
            <div class="card-head"><div class="card-title">${icon("globe")}Referencia oficial</div>
              <a class="btn btn-sm btn-pill" href="#/official">Ver ${icon("chevronRight")}</a></div>
            <div data-reference-body></div>
          </section>
        </div>

        <section class="card glow ai-panel span-wide reveal">
          <div class="card-head"><div class="card-title">${icon("sparkle")}AquaSense Intelligence</div><span class="badge badge-info">IA</span></div>
          <h2 class="h-sm" style="text-align:center">Análisis inteligente</h2>
          <div class="ai-panel-body">
            <div class="brain-holo"><div class="beam"></div>${brainHolo()}<div class="pedestal"></div></div>
            <div class="check-list">${overview.hasData ? overview.checks.map((c) => `<div class="${c.ok ? "ok" : "bad"}">${icon(c.ok ? "check" : "alert")}${esc(c.label)}</div>`).join("")
              : `<div class="bad">${icon("info")}Aún no hay datos para analizar</div>`}</div>
          </div>
          <div data-last-dx></div>
          <div class="recommend">${icon("star")}<div><strong>Recomendación</strong><p>${esc(overview.advice?.summary || "Realiza mediciones para recibir recomendaciones personalizadas.")}</p></div></div>
          <a class="btn btn-primary btn-pill btn-block" style="margin-top:14px" href="#/intelligence">Ver análisis completo ${icon("arrowRight")}</a>
        </section>
      </div>

      <div class="grid grid-2">
        <section class="card reveal">
          <div class="card-head"><div class="card-title">${icon("target")}Accesos rápidos</div></div>
          <div class="quick-links">
            <a class="quick-link" href="#/intelligence">${icon("brain")}Ver análisis IA${icon("chevronRight")}</a>
            <a class="quick-link" href="#/history">${icon("history")}Consultar historial${icon("chevronRight")}</a>
            <a class="quick-link" href="#/profiles">${icon("settings")}Configurar perfil${icon("chevronRight")}</a>
          </div>
        </section>
        <section class="card reveal">
          <div class="card-head"><div class="card-title">${icon("bell")}Alertas recientes</div><span class="badge ${data.unreadAlerts ? "badge-warn" : "badge-ok"}">${data.unreadAlerts} sin leer</span></div>
          ${data.recentAlerts.length ? data.recentAlerts.map((a) => `<div class="alert-item ${esc(a.severity)}">${icon(a.severity === "CRITICAL" ? "error" : "alert")}<div><strong>${esc(a.title)}</strong><p>${esc(a.message)}</p><small class="muted">${fmt.relative(a.createdAt)}</small></div></div>`).join("")
            : `<div class="banner banner-ok">${icon("shield")}<p>No tienes alertas pendientes.</p></div>`}
        </section>
      </div>

      <div class="tip-bar reveal">${icon("bulb")}<p><strong>Consejo:</strong> ${esc(data.tip)}</p></div>
      <p class="disclaimer">${icon("info")}${esc(data.disclaimer)}</p>`;

    // Official data as a reference next to the user's value: the typical pH of the rivers the USGS measured today.
    api.get("/reference/summary").then((ref) => {
      if (ctx.stale() || !ref.stationsReporting || ref.medianPh === null) return;
      const card = root.querySelector("[data-reference]");
      const median = Number(ref.medianPh);
      const comma = (v) => Number(v).toFixed(1).replace(".", ",");
      let compare = "";
      if (latest) {
        const diff = latest.ph - median;
        compare = Math.abs(diff) < 0.25 ? "Tu última medición está cerca de ese valor típico."
          : `Tu última medición (${comma(latest.ph)}) está ${comma(Math.abs(diff))} ${diff > 0 ? "por encima" : "por debajo"} de ese valor típico.`;
      }
      card.querySelector("[data-reference-body]").innerHTML = `<div class="row"><strong class="reference-value">${comma(median)}</strong>
        <div><div>pH típico de ${ref.stationsReporting} ríos y arroyos de EE. UU. hoy</div><small class="muted">Fuente: USGS. Es una referencia general, no un límite para tu uso.</small></div></div>
        ${compare ? `<p class="muted small" style="margin-top:8px">${compare}</p>` : ""}`;
      card.hidden = false;
    }).catch(() => { /* without official data the card stays hidden */ });

    api.get("/intelligence/diagnosis/latest").then((dx) => {
      const holder = root.querySelector("[data-last-dx]");
      if (!dx || !holder) return;
      holder.innerHTML = `<a class="ai-last" href="#/intelligence/diagnosis"><span class="dot risk-${dx.riskLevel}"></span>
        <span>Último diagnóstico: <strong>riesgo ${esc(dx.riskLabel.toLowerCase())}</strong> · ${dx.source === "AI" ? esc(dx.provider) : "reglas"} · ${fmt.relative(dx.createdAt)}</span>${icon("chevronRight")}</a>`;
    }).catch(() => {});
    const gauge = createGauge(root.querySelector("[data-gauge]"));
    gauge.set(latest?.ph ?? null);
    const stopSplash = animateWater(root.querySelector("[data-splash]"), { layers: 3, bubbles: 18, height: 0.5, intensity: 0.8 });

    root.querySelector("[data-photo]").addEventListener("click", async () => {
      if (await photoReading()) ctx.router.resolve();
    });
    root.querySelector("[data-manual]").addEventListener("click", async () => {
      if (await manualEntry()) ctx.router.resolve();
    });
    root.querySelector("[data-measure-usb]")?.addEventListener("click", (event) => withBusy(event.currentTarget, async () => {
      try {
        const saved = await browserMeter.measureAndSave();
        toast(`Medición guardada: pH ${fmt.ph(saved.ph)} (${saved.statusLabel.toLowerCase()}).`, "ok");
        ctx.router.resolve();
      } catch (error) {
        toast(error.message, "error");
      }
    }));
    root.querySelector("[data-measure]")?.addEventListener("click", async (event) => {
      const result = await measureWithDevice(event.currentTarget);
      if (result) ctx.router.resolve();
    });
    root.querySelector("[data-live]")?.addEventListener("click", async (event) => {
      const live = device.state === "LIVE";
      try {
        const status = await api.post(live ? "/devices/live/stop" : "/devices/live/start");
        bus.emit("device:changed", status);
        toast(live ? "Medición en tiempo real detenida." : "Medición en tiempo real iniciada. Las lecturas en vivo no se guardan.", "info");
        ctx.router.resolve();
      } catch (error) {
        toast(error.message, "error");
      }
    });

    const offReading = bus.on("live:reading", (reading) => {
      gauge.set(reading.ph);
      root.querySelector("[data-gauge-title]").textContent = "Medición en tiempo real";
      root.querySelector("[data-gauge-status]").innerHTML = statusBadge(reading.status, reading.statusLabel);
      root.querySelector("[data-gauge-source]").innerHTML = reading.simulated ? sourceBadge("SIMULATED") : sourceBadge("REAL");
      root.querySelector("[data-gauge-meta]").textContent = `En vivo · ${reading.deviceName} · no guardada`;
      const scale = root.querySelector("[data-scale]");
      if (scale) scale.innerHTML = phScale(reading.ph, profile.idealMin, profile.idealMax);
      const nature = root.querySelector("[data-nature]");
      if (nature) { nature.textContent = reading.natureLabel; root.querySelector("[data-nature-text]").textContent = NATURE_TEXT[reading.nature]; }
    });
    const offStatus = bus.on("live:status", () => ctx.router.resolve());

    return () => {
      gauge.destroy();
      stopSplash();
      offReading();
      offStatus();
    };
  },
};
