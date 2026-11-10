import { api } from "./Api.js";
import { bus } from "./EventBus.js";
import { PARSERS, PROTOCOLS } from "./MeterProtocols.js";

// Singleton that reads a pH meter connected to the user's own computer through the Web Serial API (Chrome and Edge on
// a computer). The cloud backend cannot open a USB port of the user's computer; the page does it and sends each value
// to the API. The connection survives navigation between screens and is closed on "Desconectar" or when the tab closes.
class BrowserMeter {
  #port = null;
  #reader = null;
  #buffer = "";
  #waiters = [];
  #closing = false;
  #loop = null;
  protocol = null;
  name = null;
  lastLine = "";
  lastReading = null;

  get supported() { return typeof navigator !== "undefined" && "serial" in navigator; }
  get connected() { return this.#port !== null; }

  #emit() { bus.emit("meter:browser", { connected: this.connected, name: this.name, protocol: this.protocol, lastReading: this.lastReading }); }

  async connect(protocol, baudRate, name) {
    if (!this.supported) throw new Error("Este navegador no puede conectar medidores USB. Usa Google Chrome o Microsoft Edge en un computador.");
    if (this.connected) await this.disconnect();
    let port;
    try {
      port = await navigator.serial.requestPort();
    } catch (error) {
      if (error.name === "NotFoundError") throw new Error("No elegiste ningún puerto. Conecta el medidor y vuelve a intentarlo.");
      throw error;
    }
    try {
      await port.open({ baudRate: Number(baudRate) || 9600 });
    } catch (error) {
      throw new Error("No se pudo abrir el puerto: puede estar en uso por otro programa (cierra el monitor serie de Arduino u otra pestaña).");
    }
    this.#port = port;
    this.protocol = protocol;
    const info = port.getInfo?.() || {};
    this.name = (name || "").trim() || (info.usbVendorId
      ? `Medidor USB ${info.usbVendorId.toString(16).padStart(4, "0")}:${(info.usbProductId || 0).toString(16).padStart(4, "0")}`
      : "Medidor serie");
    this.#closing = false;
    this.#loop = this.#readLoop();
    try {
      await this.#identify();
    } catch (error) {
      await this.disconnect();
      throw error;
    }
    this.#emit();
    return this.name;
  }

  async #readLoop() {
    const decoder = new TextDecoderStream();
    const done = this.#port.readable.pipeTo(decoder.writable).catch(() => {});
    this.#reader = decoder.readable.getReader();
    try {
      for (;;) {
        const { value, done: finished } = await this.#reader.read();
        if (finished) break;
        this.#buffer += value;
        const parts = this.#buffer.split(/\r\n|\r|\n/);
        this.#buffer = parts.pop();
        for (const raw of parts) {
          const line = raw.trim();
          if (!line) continue;
          this.lastLine = line;
          bus.emit("meter:line", line);
          this.#waiters.slice().forEach((w) => w(line));
        }
      }
    } catch {
      // The device was unplugged or the port closed.
    } finally {
      this.#reader?.releaseLock();
      await done;
      if (!this.#closing && this.#port) {
        // The meter was unplugged: close from here without waiting for this same loop.
        this.#loop = null;
        await this.disconnect();
        bus.emit("meter:lost");
      }
    }
  }

  async #write(command) {
    const writer = this.#port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(command + PROTOCOLS[this.protocol].eol));
    } finally {
      writer.releaseLock();
    }
  }

  /** Waits for the next line that {@code accept} returns a value for. */
  #nextLine(accept, timeoutMs) {
    return new Promise((resolve, reject) => {
      const waiter = (line) => {
        const value = accept(line);
        if (value === null || value === undefined) return;
        cleanup();
        resolve(value);
      };
      const timer = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, timeoutMs);
      const cleanup = () => { clearTimeout(timer); this.#waiters = this.#waiters.filter((w) => w !== waiter); };
      this.#waiters.push(waiter);
    });
  }

  async #identify() {
    if (this.protocol === "AQUASENSE_ESP32") {
      await this.#write("PING");
      await this.#nextLine((l) => (l.startsWith("PONG") ? l : null), 4000)
        .catch(() => { throw new Error("El dispositivo no respondió como firmware AquaSense. Revisa el tipo de medidor y la velocidad (9600)."); });
    } else if (this.protocol === "ATLAS_EZO") {
      await this.#write("C,0");
      await this.#write("i");
      await this.#nextLine((l) => (l.startsWith("?I,pH") ? l : null), 4000)
        .catch(() => { throw new Error("El circuito no respondió como Atlas EZO-pH. Revisa el tipo de medidor y la velocidad (9600 por defecto)."); });
    }
    // TEXT_METER: these meters do not answer commands; they send a line when the user presses Print/Send or periodically.
  }

  /** One reading: asks the meter (ESP32, Atlas) or waits for the next line it sends (laboratory meters). */
  async read() {
    if (!this.connected) throw new Error("No hay un medidor conectado en este equipo.");
    const parse = PARSERS[this.protocol];
    if (this.protocol === "AQUASENSE_ESP32") await this.#write("READ");
    if (this.protocol === "ATLAS_EZO") await this.#write("R");
    const waitMs = this.protocol === "TEXT_METER" ? 15000 : 5000;
    try {
      this.lastReading = await this.#nextLine((l) => parse(l), waitMs);
    } catch {
      throw new Error(this.protocol === "TEXT_METER"
        ? "El medidor no envió un valor de pH. Pulsa su botón de enviar o imprimir (Print/Send/Data), o revisa la velocidad en baudios."
        : "El medidor no respondió a tiempo. Revisa el cable y que la sonda esté conectada.");
    }
    this.#emit();
    return this.lastReading;
  }

  /** Reads the meter and stores the value as a real measurement of this user. */
  async measureAndSave() {
    const reading = await this.read();
    const saved = await api.post("/devices/browser-readings", {
      ph: reading.ph, temperatureC: reading.temperatureC, protocol: this.protocol, deviceName: this.name,
    });
    bus.emit("measurement:saved", saved);
    return saved;
  }

  async calibrate(point, value) {
    if (!PROTOCOLS[this.protocol]?.calibrates) throw new Error("Este medidor se calibra desde sus propios botones.");
    if (this.protocol === "AQUASENSE_ESP32") {
      await this.#write(`CAL:${point}:${value.toFixed(2)}`);
      const r = await this.#nextLine((l) => (l.startsWith("OK") || l.startsWith("ERR") ? l : null), 5000);
      if (!r.startsWith("OK")) throw new Error(`El medidor rechazó la calibración (${r}).`);
    } else {
      await this.#write(`Cal,${point.toLowerCase()},${value.toFixed(2)}`);
      const r = await this.#nextLine((l) => (l === "*OK" || l === "*ER" ? l : null), 5000);
      if (r !== "*OK") throw new Error("El circuito rechazó la calibración.");
    }
  }

  async disconnect() {
    this.#closing = true;
    const port = this.#port;
    this.#port = null;
    try { await this.#reader?.cancel(); } catch { /* already closed */ }
    // The port can only be closed once the read loop has released its stream.
    if (this.#loop) await this.#loop.catch(() => {});
    this.#loop = null;
    try { await port?.close(); } catch { /* already closed */ }
    this.#reader = null;
    this.#buffer = "";
    this.#waiters = [];
    this.#emit();
  }
}

export const browserMeter = new BrowserMeter();
