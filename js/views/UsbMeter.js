import { bus } from "../core/EventBus.js";
import { browserMeter } from "../core/BrowserMeter.js";
import { BAUD_RATES, PROTOCOLS } from "../core/MeterProtocols.js";
import { esc, fmt } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { modal, toast, withBusy } from "../ui/Components.js";

const CONTINUOUS_EVERY_MS = 10000;
const HELP = {
  TEXT_METER: "Para medidores de laboratorio o de mesa con salida USB o RS-232 (con un adaptador USB-serie). El medidor envía el valor como texto cuando pulsas su botón de enviar o imprimir (Print, Send, Data) o cada cierto tiempo. Se calibra desde sus propios botones.",
  AQUASENSE_ESP32: "Para el medidor armado con ESP32 y el firmware AquaSense incluido en el proyecto. Velocidad: 9600.",
  ATLAS_EZO: "Para el circuito Atlas Scientific EZO-pH en modo UART, con un adaptador USB-serie. Velocidad por defecto: 9600.",
};

/** Card to connect and read a meter plugged into this computer (Web Serial). Returns a cleanup function. */
export function usbMeter(host) {
  let continuous = null;
  const lines = [];

  const stopContinuous = () => { clearTimeout(continuous); continuous = null; };

  function render() {
    if (!browserMeter.supported) {
      host.innerHTML = `
        <div class="card-head"><div class="card-title">${icon("usb")}Medidor conectado a este equipo</div><span class="badge">No disponible</span></div>
        <div class="banner banner-info">${icon("info")}<div><strong>Este navegador no puede conectar medidores USB.</strong>
          <p>Abre AquaSense en <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong> en un computador (Windows, macOS, Linux o ChromeOS).
          En el celular, o con un medidor sin cable de datos, usa el <strong>medidor por cámara</strong> de abajo.</p></div></div>`;
      return;
    }
    if (!browserMeter.connected) {
      host.innerHTML = `
        <div class="card-head"><div class="card-title">${icon("usb")}Medidor conectado a este equipo</div><span class="badge">Desconectado</span></div>
        <p class="muted">Conecta tu medidor de pH por USB (o por Bluetooth emparejado como puerto serie) al computador desde el que usas AquaSense.
          El navegador lee el medidor y guarda cada medición como real.</p>
        <div class="usb-form">
          <div class="field"><label for="usb-protocol">Tipo de medidor</label>
            <select class="input" id="usb-protocol">${Object.entries(PROTOCOLS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join("")}</select></div>
          <div class="field"><label for="usb-baud">Velocidad (baudios)</label>
            <select class="input" id="usb-baud">${BAUD_RATES.map((b) => `<option value="${b}">${b}</option>`).join("")}</select></div>
          <div class="field"><label for="usb-name">Nombre (opcional)</label>
            <input class="input" id="usb-name" maxlength="80" placeholder="Ej.: Medidor del laboratorio"></div>
        </div>
        <p class="muted usb-help" data-help>${esc(HELP.TEXT_METER)}</p>
        <div class="row" style="margin-top:12px"><button class="btn btn-primary" data-usb-connect>${icon("link")}Conectar medidor</button></div>
        <p class="muted usb-help">${icon("bluetooth")}<span>Medidor Bluetooth clásico: emparéjalo primero en la configuración de Bluetooth del computador; aparecerá en la lista de puertos.</span></p>`;
      host.querySelector("#usb-protocol").addEventListener("change", (e) => { host.querySelector("[data-help]").textContent = HELP[e.target.value]; });
      host.querySelector("[data-usb-connect]").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
        try {
          const name = await browserMeter.connect(host.querySelector("#usb-protocol").value, host.querySelector("#usb-baud").value,
            host.querySelector("#usb-name").value);
          toast(`Medidor conectado: ${name}.`, "ok");
          render();
        } catch (error) {
          toast(error.message, "error");
        }
      }));
      return;
    }
    const p = PROTOCOLS[browserMeter.protocol];
    const r = browserMeter.lastReading;
    host.innerHTML = `
      <div class="card-head"><div class="card-title">${icon("usb")}Medidor conectado a este equipo</div>
        <span class="badge badge-ok"><span class="dot ${continuous ? "dot-live" : ""}"></span>${continuous ? "Midiendo en continuo" : "Conectado"}</span></div>
      <div class="usb-connected">
        <div class="cam-last"><span class="muted">${esc(browserMeter.name)} · ${esc(p.label)}</span>
          <strong class="num" data-usb-value>${r ? fmt.ph(r.ph) : "--"}</strong>
          <small class="muted" data-usb-info>${r ? `${r.temperatureC !== null ? `${r.temperatureC.toFixed(1)} °C · ` : ""}última lectura` : "Pulsa Medir para leer el medidor"}</small></div>
        <div class="stack" style="gap:10px">
          <div class="row">
            <button class="btn btn-primary" data-usb-read>${icon("drop")}Medir y guardar</button>
            <button class="btn" data-usb-cont>${icon(continuous ? "pause" : "play")}${continuous ? "Detener continuo" : "Medir cada 10 s"}</button>
            ${p.calibrates ? `<button class="btn" data-usb-cal>${icon("target")}Calibrar</button>` : ""}
            <button class="btn btn-danger" data-usb-off>${icon("link")}Desconectar</button>
          </div>
          ${browserMeter.protocol === "TEXT_METER" ? `<p class="muted usb-help">${icon("info")}<span>Al pulsar Medir, AquaSense espera el siguiente valor que envíe el medidor (hasta 15 s): pulsa su botón de enviar o imprimir.</span></p>` : ""}
          <div><span class="muted" style="font-size:12px">Últimas líneas recibidas del medidor</span><pre class="usb-lines" data-usb-lines>${esc(lines.join("\n")) || "(todavía nada)"}</pre></div>
        </div>
      </div>`;
    host.querySelector("[data-usb-read]").addEventListener("click", (e) => withBusy(e.currentTarget, measureOnce));
    host.querySelector("[data-usb-cont]").addEventListener("click", () => { if (continuous) stopContinuous(); else loop(); render(); });
    host.querySelector("[data-usb-cal]")?.addEventListener("click", calibrate);
    host.querySelector("[data-usb-off]").addEventListener("click", async () => {
      stopContinuous();
      await browserMeter.disconnect();
      toast("Medidor desconectado.", "ok");
      render();
    });
  }

  async function measureOnce() {
    try {
      const saved = await browserMeter.measureAndSave();
      toast(`Medición guardada: pH ${fmt.ph(saved.ph)} (${saved.statusLabel.toLowerCase()}).`, "ok");
      render();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  /** Reads and saves every CONTINUOUS_EVERY_MS until stopped; {@code continuous} holds the pending timer. */
  function loop(delay = 0) {
    continuous = setTimeout(async () => {
      try {
        await browserMeter.measureAndSave();
      } catch (error) {
        toast(error.message, "warn");
      }
      if (continuous && browserMeter.connected) { render(); loop(CONTINUOUS_EVERY_MS); }
    }, delay);
  }

  async function calibrate() {
    const point = await modal({
      title: "Calibrar medidor",
      body: `<p class="muted">Enjuaga la sonda con agua destilada, sumérgela en la solución buffer indicada y espera a que la lectura se estabilice. Empieza siempre por pH 7.</p>
        <div class="field" style="margin-top:14px"><label for="usb-cal-point">Punto</label>
          <select class="input" id="usb-cal-point"><option value="MID">Medio (pH 7.00)</option><option value="LOW">Bajo (pH 4.00)</option><option value="HIGH">Alto (pH 10.00)</option></select></div>
        <div class="field" style="margin-top:10px"><label for="usb-cal-value">Valor del buffer</label><input class="input" id="usb-cal-value" type="number" step="0.01" min="1" max="13" value="7.00"></div>`,
      onMount: (node) => node.querySelector("#usb-cal-point").addEventListener("change", (e) => {
        node.querySelector("#usb-cal-value").value = { MID: "7.00", LOW: "4.00", HIGH: "10.00" }[e.target.value];
      }),
      actions: [
        { label: "Cancelar", className: "btn-ghost", value: false },
        { label: "Calibrar", className: "btn-primary", handler: async (node) => {
          try {
            await browserMeter.calibrate(node.querySelector("#usb-cal-point").value, Number(node.querySelector("#usb-cal-value").value));
            toast("Punto de calibración guardado en el medidor.", "ok");
            return true;
          } catch (error) {
            toast(error.message, "error");
            return false;
          }
        } },
      ],
    });
    return point;
  }

  const offLine = bus.on("meter:line", (line) => {
    lines.push(line);
    while (lines.length > 6) lines.shift();
    const pre = host.querySelector("[data-usb-lines]");
    if (pre) pre.textContent = lines.join("\n");
  });
  const offLost = bus.on("meter:lost", () => { stopContinuous(); toast("Se perdió la conexión con el medidor (¿se desconectó el cable?).", "warn"); render(); });
  render();
  return () => { stopContinuous(); offLine(); offLost(); };
}
