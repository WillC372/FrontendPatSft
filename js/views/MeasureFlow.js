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

// Other parameters that can be written with the pH: [name, label, maximum in mg/L].
export const PARAM_FIELDS = [
  ["freeChlorine", "Cloro libre (mg/L)", 20, "El que desinfecta. Piscina: 1 a 3."],
  ["totalAlkalinity", "Alcalinidad total (mg/L)", 500, "Evita que el pH suba y baje solo. Piscina: 80 a 120."],
  ["calciumHardness", "Dureza cálcica (mg/L)", 2000, "Calcio del agua; muy baja daña el revestimiento. Piscina: 200 a 400."],
  ["cyanuricAcid", "Ácido cianúrico (mg/L)", 300, "Protege el cloro del sol. Piscina exterior: 30 a 50."],
];

export async function manualEntry() {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return modal({
    title: "Registro manual",
    body: `<form class="stack" data-manual novalidate>
        <p class="muted">Usa esta opción si mediste con tiras o con un medidor sin conexión. Quedará marcado como "Manual".</p>
        <div class="grid grid-2">
          <div class="field"><label for="mm-ph">Valor de pH</label><input class="input" id="mm-ph" name="ph" type="number" step="0.01" min="0" max="14" required placeholder="7.20"><div class="field-error" data-error-for="ph"></div></div>
          <div class="field"><label for="mm-t">Temperatura °C (opcional)</label><input class="input" id="mm-t" name="temperatureC" type="number" step="0.1" min="-5" max="100" placeholder="24.0"><div class="field-error" data-error-for="temperatureC"></div></div>
        </div>
        <div class="field"><label for="mm-at">Fecha y hora</label><input class="input" id="mm-at" name="measuredAt" type="datetime-local" value="${now}" max="${now}"><div class="field-error" data-error-for="measuredAt"></div></div>
        <details class="more-params">
          <summary>${icon("flask")}Otros parámetros (opcional)</summary>
          <p class="muted small">Solo si tienes un kit de prueba de piscina o acuario (tiras o gotas): el medidor de pH no mide esto. Si no lo tienes, déjalo vacío. Sirve para ver el estado completo del agua en Inicio y para que la calculadora acierte. Todo en mg/L (ppm).</p>
          <div class="grid grid-2">
            ${PARAM_FIELDS.map(([name, label, max, hint]) => `<div class="field"><label for="mm-${name}">${label}</label><input class="input" id="mm-${name}" name="${name}" type="number" step="0.1" min="0" max="${max}" inputmode="decimal" aria-describedby="mm-${name}-hint"><small class="param-hint" id="mm-${name}-hint">${hint}</small><div class="field-error" data-error-for="${name}"></div></div>`).join("")}
          </div>
        </details>
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
          // The server rejects future dates; the form says so at once (one minute of margin for clock differences).
          if (data.measuredAt && new Date(data.measuredAt).getTime() > Date.now() + 60000) {
            showFieldErrors(form, { measuredAt: "La fecha no puede estar en el futuro." });
            return false;
          }
          const temperature = data.temperatureC ? Number.parseFloat(data.temperatureC) : null;
          if (temperature !== null && (Number.isNaN(temperature) || temperature < -5 || temperature > 100)) {
            showFieldErrors(form, { temperatureC: "Escribe una temperatura entre -5 y 100 °C." });
            return false;
          }
          const params = {};
          for (const [name, label, max] of PARAM_FIELDS) {
            if (data[name] === "" || data[name] === undefined) continue;
            const value = Number.parseFloat(data[name]);
            if (Number.isNaN(value) || value < 0 || value > max) {
              form.querySelector(".more-params").open = true;
              showFieldErrors(form, { [name]: `${label}: escribe un valor entre 0 y ${max}.` });
              return false;
            }
            params[name] = value;
          }
          try {
            const saved = await api.post("/measurements", {
              ph,
              temperatureC: data.temperatureC ? Number.parseFloat(data.temperatureC) : null,
              measuredAt: data.measuredAt ? new Date(data.measuredAt).toISOString() : null,
              note: data.note || null,
              ...params,
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
