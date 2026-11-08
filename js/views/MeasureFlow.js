import { api, ApiError } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { esc, fmt } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { modal, showFieldErrors, sourceBadge, statusBadge, toast } from "../ui/Components.js";

function resultBody(r) {
  const validationClass = r.validationStatus === "VALID" ? "ok" : r.validationStatus === "WARNING" ? "warn" : "crit";
  return `
    ${r.source === "SIMULATED" ? `<div class="banner banner-sim" style="margin-bottom:14px">${icon("flask")}<p>Lectura generada por el simulador. No corresponde a agua real.</p></div>` : ""}
    <div class="row-between">
      <div class="result-value"><strong class="num">${fmt.ph(r.ph)}</strong><span class="gauge-unit">pH</span></div>
      <div class="stack" style="align-items:flex-end;gap:8px">${statusBadge(r.status, r.statusLabel)}${sourceBadge(r.source)}</div>
    </div>
    <dl class="kv" style="margin-top:16px">
      <dt>Clasificación</dt><dd>Agua ${esc(r.natureLabel.toLowerCase())}</dd>
      <dt>Fecha y hora</dt><dd>${fmt.dateTime(r.measuredAt)}</dd>
      <dt>Dispositivo</dt><dd>${esc(r.deviceName || "Registro manual")}</dd>
      <dt>Perfil aplicado</dt><dd>${esc(r.profileName)}</dd>
      ${r.temperatureC !== null && r.temperatureC !== undefined ? `<dt>Temperatura</dt><dd>${r.temperatureC.toFixed(1)} °C</dd>` : ""}
      <dt>Validación</dt><dd><span class="badge badge-${validationClass}">${esc(r.validationLabel)}</span></dd>
    </dl>
    <p style="margin-top:14px">${esc(r.explanation)}</p>
    ${(r.validationMessages || []).length ? `<ul class="list bullets" style="margin-top:12px">${r.validationMessages.map((m) => `<li>${icon("info")}<span>${esc(m)}</span></li>`).join("")}</ul>` : ""}
    ${r.saved ? `<div class="banner banner-ok" style="margin-top:14px">${icon("check")}<p>Guardada automáticamente en el historial.</p></div>` : ""}
    ${!r.saved ? `<div class="field" style="margin-top:16px"><label for="m-note">Nota (opcional)</label><input class="input" id="m-note" maxlength="300" placeholder="Ej.: piscina después de lluvia"></div>` : ""}`;
}

export async function measureWithDevice(button) {
  let reading;
  try {
    if (button) button.disabled = true;
    toast("Midiendo... mantén la sonda sumergida.", "info", 2500);
    reading = await api.post("/devices/measure");
  } catch (error) {
    toast(error.message, "error");
    return null;
  } finally {
    if (button) button.disabled = false;
  }
  if (reading.saved) bus.emit("measurement:saved", reading.measurement);
  const result = await modal({
    title: "Resultado de la medición",
    body: resultBody(reading),
    actions: reading.saved
      ? [{ label: "Ver historial", className: "btn-ghost", value: "history" }, { label: "Listo", className: "btn-primary", value: true }]
      : [
        { label: "Descartar", className: "btn-ghost", value: false },
        {
          label: "Guardar medición", className: "btn-primary", icon: "check",
          handler: async (node) => {
            try {
              const saved = await api.post(`/devices/readings/${encodeURIComponent(reading.pendingId)}/save`, { note: node.querySelector("#m-note").value || null });
              toast("Medición guardada en el historial.", "ok");
              bus.emit("measurement:saved", saved);
              return saved;
            } catch (error) {
              toast(error.message, "error");
              return false;
            }
          },
        },
      ],
  });
  if (result === "history") location.hash = "#/history";
  return result;
}

export async function manualEntry() {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return modal({
    title: "Registro manual",
    body: `<form class="stack" data-manual novalidate>
        <p class="muted">Usa esta opcion si mediste con tiras o con un medidor sin conexión. Quedara marcado como "Manual".</p>
        <div class="grid grid-2">
          <div class="field"><label for="mm-ph">Valor de pH</label><input class="input" id="mm-ph" name="ph" type="number" step="0.01" min="0" max="14" required placeholder="7.20"><div class="field-error" data-error-for="ph"></div></div>
          <div class="field"><label for="mm-t">Temperatura °C (opcional)</label><input class="input" id="mm-t" name="temperatureC" type="number" step="0.1" placeholder="24.0"></div>
        </div>
        <div class="field"><label for="mm-at">Fecha y hora</label><input class="input" id="mm-at" name="measuredAt" type="datetime-local" value="${now}"><div class="field-error" data-error-for="measuredAt"></div></div>
        <div class="field"><label for="mm-note">Nota (opcional)</label><input class="input" id="mm-note" name="note" maxlength="300"></div>
      </form>`,
    actions: [
      { label: "Cancelar", className: "btn-ghost", value: false },
      {
        label: "Guardar", className: "btn-primary", icon: "check",
        handler: async (node) => {
          const form = node.querySelector("[data-manual]");
          const data = Object.fromEntries(new FormData(form));
          const ph = Number.parseFloat(data.ph);
          if (Number.isNaN(ph) || ph < 0 || ph > 14) {
            showFieldErrors(form, { ph: "Escribe un valor entre 0 y 14." });
            return false;
          }
          try {
            const saved = await api.post("/measurements", {
              ph,
              temperatureC: data.temperatureC ? Number.parseFloat(data.temperatureC) : null,
              measuredAt: data.measuredAt ? new Date(data.measuredAt).toISOString() : null,
              note: data.note || null,
            });
            toast(`Medición guardada: pH ${fmt.ph(saved.ph)} (${saved.statusLabel.toLowerCase()}).`, "ok");
            bus.emit("measurement:saved", saved);
            return saved;
          } catch (error) {
            if (error instanceof ApiError) showFieldErrors(form, error.fields);
            toast(error.message, "error");
            return false;
          }
        },
      },
    ],
  });
}
