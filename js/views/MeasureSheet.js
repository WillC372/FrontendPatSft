import { api } from "../core/Api.js";
import { browserMeter } from "../core/BrowserMeter.js";
import { esc, fmt } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { modal, toast, withBusy } from "../ui/Components.js";
import { manualEntry, measureWithDevice } from "./MeasureFlow.js";
import { photoReading } from "./PhotoFlow.js";

const option = (attr, ic, title, text, tag = "button") =>
  `<${tag} class="sheet-option" ${attr}${tag === "button" ? ' type="button"' : ""}><span class="sheet-ic">${icon(ic)}</span><span><strong>${title}</strong><small>${text}</small></span>${icon("chevronRight")}</${tag}>`;

function meterOption(status) {
  if (browserMeter.connected) return option("data-m-usb", "usb", "Con mi medidor", `Conectado por USB: ${esc(browserMeter.name)}`);
  const serverMeter = status?.ownedByYou && (status.state === "CONNECTED" || status.state === "LIVE");
  if (serverMeter) return option("data-m-device", "bluetooth", "Con mi medidor", `Conectado: ${esc(status.deviceName)}${status.simulated ? " · SIMULADO" : ""}`);
  return option('href="#/devices" data-close', "bluetooth", "Conectar mi medidor", "Por USB (ESP32 o medidor de bolsillo) o con la cámara", "a");
}

/** "Medir" of the bottom bar: the three ways to register a pH value. Each flow saves the value and announces it. */
export function openMeasureSheet() {
  return modal({
    title: "¿Cómo quieres medir?",
    body: `<p class="muted" style="margin-bottom:12px">Elige una forma. El valor queda guardado en tu historial.</p>
      <div class="sheet-options">
        <div data-meter-slot>${meterOption(null)}</div>
        ${option("data-m-photo", "camera", "Con una foto", "De una tira reactiva o de la pantalla de tu medidor")}
        ${option("data-m-manual", "edit", "Escribir el valor", "Si ya mediste con otro equipo")}
      </div>`,
    onMount: (node, close) => {
      const slot = node.querySelector("[data-meter-slot]");
      const bindMeter = () => {
        slot.querySelector("[data-m-usb]")?.addEventListener("click", (event) => withBusy(event.currentTarget, async () => {
          try {
            const saved = await browserMeter.measureAndSave();
            close(true);
            toast(`Medición guardada: pH ${fmt.ph(saved.ph)} (${saved.statusLabel.toLowerCase()}).`, "ok");
          } catch (error) {
            toast(error.message, "error");
          }
        }));
        slot.querySelector("[data-m-device]")?.addEventListener("click", async (event) => {
          const result = await measureWithDevice(event.currentTarget);
          if (result) close(true);
        });
      };
      bindMeter();
      // A meter connected to the server itself (local installation) is known only after asking.
      if (!browserMeter.connected) {
        api.get("/devices/status").then((status) => {
          if (!node.isConnected) return;
          slot.innerHTML = meterOption(status);
          bindMeter();
        }).catch(() => {});
      }
      node.querySelector("[data-m-photo]").addEventListener("click", () => { close(true); photoReading(); });
      node.querySelector("[data-m-manual]").addEventListener("click", () => { close(true); manualEntry(); });
    },
  });
}
