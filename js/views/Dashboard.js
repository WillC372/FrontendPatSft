import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { session } from "../core/Session.js";
import { esc, relativeTime } from "../core/Format.js";
import { icon, PROFILE_ICONS } from "../ui/Icons.js";
import { aquaFace } from "../ui/AquaFace.js";
import { emptyState, loading, sourceBadge, statusBadge, toast } from "../ui/Components.js";
import { createGauge, phScale } from "../ui/Gauge.js";
import { animateWater } from "../ui/Water.js";

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
    try {
      data = await api.get("/dashboard");
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
    const place = data.place;
    const params = (data.parameters || []).filter((p) => p.value !== null && p.value !== undefined);
    const connected = device.ownedByYou && (device.state === "CONNECTED" || device.state === "LIVE");

    // Three blocks: the last value, what it means, and what Aqua suggests. Everything else is one tap away in the bottom bar.
    root.innerHTML = `
      <div class="row-between welcome reveal">
        <div><h1>¡Hola, ${esc(firstName)}!</h1><p>${latest ? `Así está el agua de <strong>${esc(place?.name || "tu lugar")}</strong>.` : `Empieza midiendo el agua de <strong>${esc(place?.name || "tu lugar")}</strong> con el botón «Medir» de abajo.`}</p>
          ${place && place.role !== "OWNER" ? `<p class="small muted">${icon("share")}Lugar compartido por ${esc(place.ownerName || "otra persona")} · ${esc(place.roleLabel)}</p>` : ""}</div>
        ${session.user?.role === "ADMIN" ? `<span class="badge badge-info">${icon("shield")}Administrador · sin límites</span>` : data.plan === "PREMIUM" ? `<span class="badge badge-info">${icon("star")}Premium</span>` : `<a class="badge badge-info" href="#/billing">Plan gratuito</a>`}
      </div>

      <div class="grid grid-home">
        <section class="card glow gauge-card reveal" aria-labelledby="gauge-title">
          <div class="card-head" style="width:100%">
            <div class="card-title" id="gauge-title"><span class="dot ${device.state === "LIVE" ? "dot-live" : ""}" style="color:${device.state === "LIVE" ? "var(--ok)" : "var(--muted)"}" data-live-dot></span><span data-gauge-title>${device.state === "LIVE" ? "Medición en tiempo real" : "Última medición"}</span></div>
            <span data-gauge-source>${latest ? sourceBadge(latest.source) : ""}</span>
          </div>
          <div data-gauge style="width:100%;display:grid;place-items:center"></div>
          <div class="gauge-meta">
            <div data-gauge-status>${latest ? statusBadge(latest.status, latest.statusLabel) : `<span class="badge badge-info">Sin mediciones</span>`}</div>
            <small class="muted num" data-gauge-meta>${latest ? relativeTime(latest.measuredAt) : "Aún no has medido"}</small>
          </div>
          <div class="gauge-actions">
            ${place?.canEdit === false ? `<span class="badge">${icon("eye")}Solo puedes ver este lugar</span>` : `<button class="btn btn-primary btn-pill btn-lg" data-measure-now>${icon("drop")}Medir ahora</button>`}
            ${connected ? `<button class="btn btn-pill" data-live>${icon(device.state === "LIVE" ? "pause" : "play")}${device.state === "LIVE" ? "Detener vivo" : "Tiempo real"}</button>` : ""}
          </div>
          <canvas class="splash" data-splash aria-hidden="true"></canvas>
        </section>

        <div class="stack">
          <section class="card reveal">
            <div class="card-head"><div class="card-title">${icon("drop")}Tu agua</div>
              <a class="btn btn-sm btn-pill" href="#/profiles" aria-label="Cambiar el perfil de uso (ahora ${esc(profile.name)})"><span class="profile-mini">${icon(PROFILE_ICONS[profile.type] || "profiles")}</span><span class="pill-text">${esc(profile.name)}</span>${icon("chevronRight")}</a></div>
            ${latest ? `<div class="water-state-value">${icon("drop")}<strong data-nature>${esc(latest.natureLabel)}</strong></div>
              <p class="muted" style="margin-top:8px" data-nature-text>${NATURE_TEXT[latest.nature]}</p>
              <div data-scale>${phScale(latest.ph, profile.idealMin, profile.idealMax)}</div>`
              : `<p class="muted">Cuando midas, aquí verás si tu agua es ácida, neutra o alcalina y si está en el rango para ${esc(profile.name.toLowerCase())}.</p>`}
            <p class="muted small num" style="margin-top:10px">Rango ideal para ${esc(profile.name.toLowerCase())}: ${profile.idealMin.toFixed(1)} - ${profile.idealMax.toFixed(1)}</p>
            <p class="muted small ref-line" data-reference hidden></p>
          </section>

          <section class="card aqua-tip reveal" data-aqua-tip>
            <button type="button" class="aqua-tip-bot" data-aqua-open aria-label="Abrir a Aqua">${aquaFace()}</button>
            <div style="min-width:0"><strong>Aqua dice</strong><p data-advice class="muted">Revisando tus datos...</p>
              <div data-last-dx></div>
              <button type="button" class="btn btn-sm btn-pill" style="margin-top:10px" data-aqua-open>${icon("message")}Preguntarle a Aqua</button></div>
          </section>

          <div data-due></div>
          ${params.length ? `<section class="card reveal" aria-labelledby="params-title">
            <div class="card-head"><div class="card-title" id="params-title">${icon("flask")}Otros parámetros</div><a class="btn btn-sm btn-pill" href="#/care">Calcular dosis ${icon("chevronRight")}</a></div>
            <div class="params-grid">${params.map((p) => `<div class="param ${p.status}"><span>${esc(p.label)}</span>
              <strong class="num">${p.value.toLocaleString("es", { maximumFractionDigits: 1 })} <small>mg/L</small></strong>
              <small class="muted">${p.range ? `Orientativo ${p.range.low}–${p.range.high}` : "Sin rango general"} · ${relativeTime(p.measuredAt)}</small>
              ${p.advice ? `<small>${esc(p.advice)}</small>` : ""}</div>`).join("")}</div>
            <p class="muted small" style="margin-top:8px">Rangos orientativos para ${esc((place?.kindLabel || "este tipo de agua").toLowerCase())}; revisa la norma o el fabricante de tus productos.</p>
          </section>` : ""}
          ${data.unreadAlerts ? `<section class="card reveal">
            <div class="card-head"><div class="card-title">${icon("bell")}Alertas</div><span class="badge badge-warn">${data.unreadAlerts} sin leer</span></div>
            ${data.recentAlerts.slice(0, 2).map((a) => `<div class="alert-item ${esc(a.severity)}">${icon(a.severity === "CRITICAL" ? "error" : "alert")}<div><strong>${esc(a.title)}</strong><p>${esc(a.message)}</p><small class="muted">${relativeTime(a.createdAt)}</small></div></div>`).join("")}
          </section>` : ""}
        </div>
      </div>

      <div class="tip-bar reveal">${icon("bulb")}<p><strong>Consejo:</strong> ${esc(data.tip)}</p></div>
      <p class="disclaimer">${icon("info")}${esc(data.disclaimer)}</p>`;

    root.querySelectorAll("[data-aqua-open]").forEach((b) => b.addEventListener("click", () => bus.emit("aqua:open")));
    // Reminders that are due today, with "Hecho" right here.
    api.get("/reminders").then((list) => {
      const due = list.filter((r) => r.due);
      const holder = root.querySelector("[data-due]");
      if (ctx.stale() || !holder || !due.length) return;
      holder.innerHTML = `<section class="card due-card reveal" aria-labelledby="due-title"><div class="card-head"><div class="card-title" id="due-title">${icon("bell")}Para hoy</div>
        <a class="btn btn-sm btn-pill" href="#/care">Ver todo ${icon("chevronRight")}</a></div>
        <ul class="list">${due.map((r) => `<li><span><strong>${esc(r.title)}</strong>${r.placeName ? `<br><small class="muted">${esc(r.placeName)}</small>` : ""}</span>
          <button type="button" class="btn btn-sm btn-primary" data-done="${r.id}">${icon("check")}Hecho</button></li>`).join("")}</ul></section>`;
      holder.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
        b.disabled = true;
        try { await api.post(`/reminders/${b.dataset.done}/done`); toast("¡Hecho! El próximo se cuenta desde ahora.", "ok"); b.closest("li").remove(); }
        catch (error) { b.disabled = false; toast(error.message, "error"); }
        if (!holder.querySelector("li")) holder.innerHTML = "";
      }));
    }).catch(() => {});
    root.querySelector("[data-measure-now]")?.addEventListener("click", () => root.ownerDocument.querySelector("[data-measure-tab]")?.click());

    // What Aqua suggests (rules and statistics of the server), loaded after the main values are on screen.
    api.get("/intelligence/overview").then((overview) => {
      if (ctx.stale()) return;
      root.querySelector("[data-advice]").textContent = overview.advice?.summary
        || (overview.hasData ? "Todo listo. Tócame si quieres un análisis completo." : "Cuando tengas mediciones, te diré qué hacer con tu agua.");
    }).catch(() => {
      const advice = root.querySelector("[data-advice]");
      if (advice) advice.textContent = "Tócame si quieres que analice tu agua.";
    });

    // Official data as a reference next to the user's value: the typical pH of the rivers the USGS measured today.
    api.get("/reference/summary").then((ref) => {
      if (ctx.stale() || !ref.stationsReporting || ref.medianPh === null) return;
      const line = root.querySelector("[data-reference]");
      const median = Number(ref.medianPh);
      const comma = (v) => Number(v).toFixed(1).replace(".", ",");
      let compare = "";
      if (latest) {
        const diff = latest.ph - median;
        compare = Math.abs(diff) < 0.25 ? " Tu medición está cerca de ese valor."
          : ` Tu medición está ${comma(Math.abs(diff))} ${diff > 0 ? "por encima" : "por debajo"}.`;
      }
      line.innerHTML = `${icon("globe")}Referencia: hoy el pH típico de ${ref.stationsReporting} ríos de EE. UU. es <strong>${comma(median)}</strong> (USGS).${compare} <a href="#/official">Ver</a>`;
      line.hidden = false;
    }).catch(() => { /* without official data the line stays hidden */ });

    api.get("/intelligence/diagnosis/latest").then((dx) => {
      const holder = root.querySelector("[data-last-dx]");
      if (!dx || !holder || ctx.stale()) return;
      holder.innerHTML = `<a class="ai-last" href="#/intelligence/diagnosis"><span class="dot risk-${dx.riskLevel}"></span>
        <span>Último diagnóstico: <strong>riesgo ${esc(dx.riskLabel.toLowerCase())}</strong> · ${relativeTime(dx.createdAt)}</span>${icon("chevronRight")}</a>`;
    }).catch(() => {});
    const gauge = createGauge(root.querySelector("[data-gauge]"));
    gauge.set(latest?.ph ?? null);
    const stopSplash = animateWater(root.querySelector("[data-splash]"), { layers: 3, bubbles: 18, height: 0.5, intensity: 0.8 });

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
    // A value saved from "Medir" (bottom bar) or from Aqua shows up here at once.
    const offSaved = bus.on("measurement:saved", () => { if (!ctx.stale()) ctx.router.resolve(); });

    return () => {
      gauge.destroy();
      stopSplash();
      offReading();
      offStatus();
      offSaved();
    };
  },
};
