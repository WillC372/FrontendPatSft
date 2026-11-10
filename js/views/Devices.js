import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { esc, fmt } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { confirmDialog, emptyState, loading, modal, toast, withBusy } from "../ui/Components.js";
import { beaker } from "../ui/Illustrations.js";
import { measureWithDevice } from "./MeasureFlow.js";
import { cameraMeter } from "./CameraMeter.js";
import { usbMeter } from "./UsbMeter.js";

const PROTOCOLS = [
  ["AQUASENSE_ESP32", "Firmware AquaSense ESP32"],
  ["ATLAS_EZO", "Atlas Scientific EZO-pH (UART)"],
];
const TRANSPORT = { SIMULADO: "Simulación", USB_SERIAL: "USB / serie", BLUETOOTH_SPP: "Bluetooth (SPP)" };

export const devicesView = {
  name: "devices",
  title: "Conexión del dispositivo",
  async render(root, ctx) {
    root.innerHTML = `
      <div class="row-between reveal"><div><h1>Conexión del dispositivo</h1><p class="muted">Conecta tu medidor de pH a este computador por USB o Bluetooth, o léelo con la cámara si no tiene cable de datos.</p></div></div>
      <section class="card glow reveal" data-usb-meter></section>
      <section class="card reveal camera-meter" data-camera-meter></section>
      <div class="stack" data-server-section hidden>
      <h2 class="section-title">Medidor conectado al servidor <small class="muted">(solo cuando AquaSense corre en el mismo computador del medidor)</small></h2>
      <div class="grid grid-2">
        <section class="card glow reveal">
          <div class="card-head"><div class="card-title">${icon("bluetooth")}Dispositivos</div>
            <button class="btn btn-sm" data-scan>${icon("refresh")}Actualizar</button></div>
          <div class="radar" data-radar><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="core">${icon("bluetooth")}</div></div>
          <p style="text-align:center;margin-top:8px" data-scan-label><strong>Buscando dispositivos...</strong></p>
          <div class="stack" style="margin-top:14px" data-list>${loading()}</div>
          <div class="banner banner-info" style="margin-top:14px">${icon("info")}<p>Asegúrate de que tu medidor esté encendido y conectado al equipo donde corre el servidor de AquaSense. Para Bluetooth, empareja primero el dispositivo desde el sistema operativo.</p></div>
        </section>
        <div class="stack">
          <section class="card reveal" data-status-card>${loading()}</section>
          <section class="card reveal">${beaker()}</section>
        </div>
      </div>
      </div>
      <section class="card reveal">
        <div class="card-head"><div class="card-title">${icon("database")}Dispositivos registrados</div></div>
        <div data-registered>${loading()}</div>
      </section>`;

    const list = root.querySelector("[data-list]");
    const statusCard = root.querySelector("[data-status-card]");
    const radar = root.querySelector("[data-radar]");
    let status = null;

    async function renderStatus() {
      try {
        status = await api.get("/devices/status");
      } catch (error) {
        statusCard.innerHTML = emptyState("error", "Estado no disponible", error.message);
        return;
      }
      bus.emit("device:changed", status);
      const mine = status.ownedByYou;
      const active = mine && status.state !== "DISCONNECTED";
      const color = status.state === "ERROR" ? "crit" : active ? "ok" : "info";
      statusCard.innerHTML = `
        <div class="card-head"><div class="card-title">${icon("chip")}Estado del medidor</div><span class="badge badge-${color}"><span class="dot ${status.state === "LIVE" ? "dot-live" : ""}"></span>${esc(status.stateLabel)}</span></div>
        ${active ? `
          ${status.simulated ? `<div class="banner banner-sim" style="margin-bottom:12px">${icon("flask")}<p>Estás usando el simulador. Sus lecturas se guardan como SIMULADAS y no representan agua real.</p></div>` : ""}
          <dl class="kv"><dt>Dispositivo</dt><dd>${esc(status.deviceName)}</dd><dt>Protocolo</dt><dd>${esc(status.protocolLabel)}</dd>
            <dt>Puerto</dt><dd class="mono">${esc(status.port)}</dd><dt>Conectado</dt><dd>${fmt.relative(status.connectedAt)}</dd>
            ${status.lastError ? `<dt>Último error</dt><dd style="color:var(--crit)">${esc(status.lastError)}</dd>` : ""}</dl>
          <div class="row" style="margin-top:16px">
            ${status.state !== "ERROR" ? `<button class="btn btn-primary" data-measure>${icon("drop")}Medir</button>
              <button class="btn" data-live>${icon(status.state === "LIVE" ? "pause" : "play")}${status.state === "LIVE" ? "Detener vivo" : "Tiempo real"}</button>` : `<button class="btn btn-primary" data-reconnect>${icon("refresh")}Reconectar</button>`}
            ${status.supportsCalibration && status.state === "CONNECTED" ? `<button class="btn" data-calibrate>${icon("target")}Calibrar</button>` : ""}
            <button class="btn btn-danger" data-disconnect>${icon("link")}Desconectar</button>
          </div>`
          : status.state !== "DISCONNECTED"
            ? `<p class="muted">El medidor está siendo usado por otra cuenta en este servidor.</p>`
            : `<p class="muted">No hay ningún medidor conectado. Elige uno de la lista para conectarlo.</p>`}`;
      statusCard.querySelector("[data-measure]")?.addEventListener("click", (e) => measureWithDevice(e.currentTarget));
      statusCard.querySelector("[data-live]")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
        try { await api.post(status.state === "LIVE" ? "/devices/live/stop" : "/devices/live/start"); } catch (error) { toast(error.message, "error"); }
        await refresh();
      }));
      statusCard.querySelector("[data-disconnect]")?.addEventListener("click", async () => {
        if (!(await confirmDialog("Desconectar medidor", "Se cerrara la conexión con el medidor.", "Desconectar"))) return;
        try { await api.post("/devices/disconnect"); toast("Medidor desconectado.", "ok"); } catch (error) { toast(error.message, "error"); }
        await refresh();
      });
      statusCard.querySelector("[data-reconnect]")?.addEventListener("click", () => toast("Elige el dispositivo en la lista y pulsa Conectar para reintentar.", "info"));
      statusCard.querySelector("[data-calibrate]")?.addEventListener("click", calibrate);
    }

    async function scan() {
      radar.classList.add("scanning");
      root.querySelector("[data-scan-label]").innerHTML = "<strong>Buscando dispositivos...</strong>";
      try {
        const [devices] = await Promise.all([api.get("/devices/scan"), new Promise((r) => setTimeout(r, 900))]);
        const connectedPort = status?.ownedByYou && status.state !== "DISCONNECTED" ? status.port : null;
        root.querySelector("[data-scan-label]").innerHTML = `<strong>${devices.length} dispositivo(s) disponible(s)</strong>`;
        list.innerHTML = devices.map((d, i) => `
          <div class="device-row ${connectedPort === d.port ? "connected" : ""}">
            ${icon(d.simulated ? "flask" : d.transport === "BLUETOOTH_SPP" ? "bluetooth" : "usb")}
            <div class="grow"><strong>${esc(d.name)}</strong><small class="muted">${esc(TRANSPORT[d.transport] || d.transport)} · <span class="mono">${esc(d.port)}</span>${d.description ? ` · ${esc(d.description)}` : ""}</small></div>
            ${connectedPort === d.port ? `<span class="badge badge-ok">Conectado</span>` : `
              ${d.simulated ? `<span class="badge badge-sim">SIMULADO</span>` : `<select class="input" data-protocol="${i}" style="width:auto" aria-label="Protocolo">${PROTOCOLS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>`}
              <button class="btn btn-sm btn-primary" data-connect="${i}" ${connectedPort ? "disabled" : ""}>Conectar</button>`}
          </div>`).join("");
        // A server in the cloud has no serial ports: this section only makes sense in a local installation.
        root.querySelector("[data-server-section]").hidden = devices.length === 0 && !(status?.ownedByYou && status.state !== "DISCONNECTED");
        list.querySelectorAll("[data-connect]").forEach((button) => button.addEventListener("click", () => withBusy(button, async () => {
          const d = devices[Number(button.dataset.connect)];
          const protocol = d.simulated ? "SIMULATOR" : list.querySelector(`[data-protocol="${button.dataset.connect}"]`).value;
          try {
            await api.post("/devices/connect", { protocol, port: d.port, name: d.simulated ? null : d.name });
            toast(d.simulated ? "Simulador conectado. Sus lecturas se marcaran como simuladas." : "Medidor conectado.", "ok");
          } catch (error) {
            toast(error.message, "error");
          }
          await refresh();
        })));
      } catch (error) {
        list.innerHTML = emptyState("error", "No se pudo buscar", error.message);
      } finally {
        radar.classList.remove("scanning");
      }
    }

    async function loadRegistered() {
      const host = root.querySelector("[data-registered]");
      try {
        const devices = await api.get("/devices");
        host.innerHTML = devices.length ? `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Protocolo</th><th>Puerto</th><th>Última conexión</th></tr></thead>
          <tbody>${devices.map((d) => `<tr><td>${esc(d.name)} ${d.simulated ? '<span class="badge badge-sim">SIMULADO</span>' : ""}</td><td>${esc(d.protocolLabel)}</td><td class="mono">${esc(d.port)}</td><td>${fmt.dateTime(d.lastConnectedAt)}</td></tr>`).join("")}</tbody></table></div>`
          : `<p class="muted">Aún no has conectado ningún dispositivo.</p>`;
      } catch (error) {
        host.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
      }
    }

    async function calibrate() {
      await modal({
        title: "Calibrar medidor",
        body: `<p class="muted">Sumerge la sonda en la solución buffer indicada, espera a que la lectura se estabilice y confirma. Empieza siempre por el punto medio (pH 7).</p>
          <div class="field" style="margin-top:14px"><label for="cal-point">Punto</label>
            <select class="input" id="cal-point"><option value="MID">Medio (pH 7.00)</option><option value="LOW">Bajo (pH 4.00)</option><option value="HIGH">Alto (pH 10.00)</option></select></div>
          <div class="field" style="margin-top:10px"><label for="cal-value">Valor del buffer</label><input class="input" id="cal-value" type="number" step="0.01" min="1" max="13" value="7.00"></div>`,
        onMount: (node) => node.querySelector("#cal-point").addEventListener("change", (e) => {
          node.querySelector("#cal-value").value = { MID: "7.00", LOW: "4.00", HIGH: "10.00" }[e.target.value];
        }),
        actions: [
          { label: "Cancelar", className: "btn-ghost", value: false },
          { label: "Calibrar", className: "btn-primary", handler: async (node) => {
            try {
              const r = await api.post("/devices/calibrate", { point: node.querySelector("#cal-point").value, bufferValue: Number(node.querySelector("#cal-value").value) });
              toast(r.message, "ok");
              return true;
            } catch (error) {
              toast(error.message, "error");
              return false;
            }
          } },
        ],
      });
    }

    async function refresh() {
      await renderStatus();
      await Promise.all([scan(), loadRegistered()]);
    }

    root.querySelector("[data-scan]").addEventListener("click", scan);
    const off = bus.on("live:status", () => renderStatus());
    const stopUsb = usbMeter(root.querySelector("[data-usb-meter]"));
    const stopCamera = cameraMeter(root.querySelector("[data-camera-meter]"));
    await refresh();
    return () => { off(); stopUsb(); stopCamera(); };
  },
};
