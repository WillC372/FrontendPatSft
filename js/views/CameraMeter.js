import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { esc, fmt } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { toast } from "../ui/Components.js";

// Camera link for meters without a data cable: the camera watches the meter display, the browser detects when the
// number changes and settles, and only then sends one frame to the photo reading API (each reading uses AI quota).
const TICK_MS = 1500;
const SAMPLE_W = 64;
const SAMPLE_H = 48;
const PIXEL_DELTA = 28;
const CHANGED_SHARE = 0.012;
const STABLE_TICKS = 2;
const AUTO_SAVE_CONFIDENCE = 0.8;
const SESSION_LIMIT = 40;
const GUIDE = { x: 0.15, y: 0.25, w: 0.7, h: 0.5 };

/** Grayscale thumbnail of the guide area, used only to compare frames on the device. */
function thumbnail(video, canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const sx = video.videoWidth * GUIDE.x;
  const sy = video.videoHeight * GUIDE.y;
  ctx.drawImage(video, sx, sy, video.videoWidth * GUIDE.w, video.videoHeight * GUIDE.h, 0, 0, SAMPLE_W, SAMPLE_H);
  const rgba = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
  const gray = new Uint8Array(SAMPLE_W * SAMPLE_H);
  for (let i = 0; i < gray.length; i++) gray[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;
  return gray;
}

/** Share of pixels that changed noticeably between two thumbnails (0-1). */
function changedShare(a, b) {
  if (!a || !b) return 1;
  let changed = 0;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > PIXEL_DELTA) changed++;
  return changed / a.length;
}

/** JPEG of the guide area (with a margin) to send to the photo reading API. */
function frameBlob(video) {
  const margin = 0.06;
  const x = Math.max(0, GUIDE.x - margin) * video.videoWidth;
  const y = Math.max(0, GUIDE.y - margin) * video.videoHeight;
  const w = Math.min(1, GUIDE.w + 2 * margin) * video.videoWidth;
  const h = Math.min(1, GUIDE.h + 2 * margin) * video.videoHeight;
  const scale = Math.min(1, 1280 / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d").drawImage(video, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
}

/** Mounts the camera meter card inside {@code host}; returns a cleanup function that stops the camera. */
export function cameraMeter(host) {
  host.innerHTML = `
    <div class="card-head"><div class="card-title">${icon("camera")}Medidor por cámara</div>
      <span class="badge" data-cam-state>Apagada</span></div>
    <p class="muted">Para medidores sin cable de datos: apunta la cámara a la pantalla del medidor de pH. AquaSense lee el número con IA
      cuando cambia y se estabiliza, y lo guarda como medición. La imagen se analiza en tu equipo y solo se envía un cuadro por lectura.</p>
    <div class="cam-grid">
      <div>
        <div class="cam-view" data-cam-view>
          <video playsinline muted data-video></video>
          <div class="cam-guide"><span>Encuadra aquí la pantalla del medidor</span></div>
          <div class="cam-off" data-cam-off>${icon("camera")}<span>Cámara apagada</span></div>
        </div>
        <div class="row cam-controls">
          <button class="btn btn-primary" data-cam-start>${icon("play")}Iniciar cámara</button>
          <button class="btn" data-cam-stop hidden>${icon("pause")}Detener</button>
          <button class="btn" data-cam-read disabled>${icon("refresh")}Leer ahora</button>
          <select class="input cam-select" data-cam-device hidden aria-label="Cámara"></select>
        </div>
        <div class="cam-options">
          <label class="check"><input type="checkbox" data-cam-auto checked> Leer automáticamente cuando el número cambie</label>
          <label class="check"><input type="checkbox" data-cam-save checked> Guardar las lecturas confiables (${Math.round(AUTO_SAVE_CONFIDENCE * 100)} % o más)</label>
          <label class="check">Además, leer cada
            <select class="input cam-select" data-cam-every aria-label="Lectura periódica">
              <option value="0">nunca</option><option value="60">1 min</option><option value="300" selected>5 min</option><option value="900">15 min</option>
            </select></label>
        </div>
      </div>
      <div class="stack" style="gap:12px">
        <div class="cam-last" data-cam-last>
          <span class="muted">Última lectura</span><strong class="num">--</strong><small class="muted" data-cam-last-info>Sin lecturas todavía</small>
        </div>
        <div class="cam-quota muted" data-cam-quota></div>
        <ol class="cam-log" data-cam-log></ol>
      </div>
    </div>`;

  const $ = (sel) => host.querySelector(sel);
  const video = $("[data-video]");
  const sample = Object.assign(document.createElement("canvas"), { width: SAMPLE_W, height: SAMPLE_H });
  let stream = null;
  let timer = null;
  let busy = false;
  let previous = null;
  let lastSent = null;
  let stableTicks = 0;
  let lastReadAt = 0;
  let readsThisSession = 0;
  let quota = null;

  const setState = (text, cls = "") => {
    const badge = $("[data-cam-state]");
    badge.className = `badge ${cls}`;
    badge.textContent = text;
  };

  async function refreshQuota() {
    try {
      const s = await api.get("/intelligence/ai-status");
      quota = { used: s.usedToday, limit: s.dailyQuota, configured: s.configured };
      $("[data-cam-quota]").innerHTML = s.configured
        ? `${icon("sparkle")}<span>Consultas de IA hoy: <strong>${s.usedToday}</strong> de ${s.dailyQuota} (plan ${s.plan === "PREMIUM" ? "Premium" : "gratuito"}). Cada lectura usa una.</span>`
        : `${icon("alert")}<span>La IA no está configurada en el servidor: la lectura por cámara no está disponible.</span>`;
    } catch { /* the quota line is informative only */ }
  }

  function log(entry) {
    const list = $("[data-cam-log]");
    const li = document.createElement("li");
    li.innerHTML = entry;
    list.prepend(li);
    while (list.children.length > 8) list.lastChild.remove();
  }

  async function read(reason) {
    if (busy || !stream) return;
    if (readsThisSession >= SESSION_LIMIT) {
      setState("Límite de la sesión", "badge-warn");
      toast(`Se alcanzó el máximo de ${SESSION_LIMIT} lecturas en esta sesión de cámara. Detén e inicia de nuevo para seguir.`, "warn");
      return;
    }
    if (quota && quota.used >= quota.limit) {
      setState("Sin cuota de IA", "badge-warn");
      toast("Se agotaron las consultas de IA de hoy. Registra el valor manualmente o vuelve mañana.", "warn");
      return;
    }
    busy = true;
    setState("Leyendo...", "badge-info");
    lastSent = thumbnail(video, sample);
    lastReadAt = Date.now();
    readsThisSession++;
    const time = fmt.time(new Date());
    try {
      const form = new FormData();
      form.append("file", await frameBlob(video), "camara.jpg");
      form.append("kind", "METER_DISPLAY");
      const r = await api.upload("/vision/ph-reading", form);
      if (!r.readable || r.kind !== "METER_DISPLAY") {
        log(`<span class="num">${time}</span> ${icon("alert")}<span>No se pudo leer la pantalla${r.observations ? `: ${esc(r.observations)}` : ""}</span>`);
        $("[data-cam-last-info]").textContent = "La última imagen no permitió leer el número.";
      } else {
        const big = $("[data-cam-last] strong");
        big.textContent = fmt.ph(r.ph);
        let status = `confianza ${Math.round(r.confidence * 100)} %`;
        if ($("[data-cam-save]").checked && r.confidence >= AUTO_SAVE_CONFIDENCE) {
          const saved = await api.post(`/vision/ph-reading/${encodeURIComponent(r.pendingId)}/save`,
            { ph: r.ph, note: `Lectura por cámara (${reason})` });
          bus.emit("measurement:saved", saved);
          status = `guardada · ${esc(saved.statusLabel.toLowerCase())}`;
          log(`<span class="num">${time}</span> ${icon("check")}<span>pH <strong class="num">${fmt.ph(r.ph)}</strong> · ${status}</span>`);
        } else {
          log(`<span class="num">${time}</span> ${icon("info")}<span>pH <strong class="num">${fmt.ph(r.ph)}</strong> · no guardada (${status})</span>`);
        }
        $("[data-cam-last-info]").innerHTML = `${esc(r.provider || r.opinions?.[0]?.provider || "IA")} · ${status}${r.temperatureC !== null ? ` · ${r.temperatureC.toFixed(1)} °C` : ""}`;
      }
    } catch (error) {
      log(`<span class="num">${time}</span> ${icon("error")}<span>${esc(error.message)}</span>`);
    } finally {
      busy = false;
      await refreshQuota();
      if (stream) setState($("[data-cam-auto]").checked ? "Esperando un cambio" : "En pausa", "badge-ok");
    }
  }

  function tick() {
    if (!stream || busy || video.readyState < 2) return;
    const current = thumbnail(video, sample);
    const moving = changedShare(current, previous) > CHANGED_SHARE;
    previous = current;
    stableTicks = moving ? 0 : stableTicks + 1;
    if (stableTicks < STABLE_TICKS) return;
    const every = Number($("[data-cam-every]").value) * 1000;
    if ($("[data-cam-auto]").checked && changedShare(current, lastSent) > CHANGED_SHARE) {
      read("cambio en la pantalla");
    } else if (every > 0 && lastReadAt && Date.now() - lastReadAt >= every) {
      read("lectura periódica");
    }
  }

  async function start(deviceId) {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast("Este navegador no permite usar la cámara. Usa Chrome, Edge o Safari actualizados (con https).", "error");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
    } catch (error) {
      toast(error.name === "NotAllowedError" ? "Permiso de cámara denegado. Actívalo en el navegador para usar esta función."
        : "No se pudo abrir la cámara.", "error");
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => {});
    $("[data-cam-off]").hidden = true;
    $("[data-cam-start]").hidden = true;
    $("[data-cam-stop]").hidden = false;
    $("[data-cam-read]").disabled = false;
    previous = null;
    lastSent = null;
    stableTicks = 0;
    readsThisSession = 0;
    setState("Esperando un cambio", "badge-ok");
    await refreshQuota();
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
    const select = $("[data-cam-device]");
    if (cams.length > 1) {
      const active = stream.getVideoTracks()[0]?.getSettings().deviceId;
      select.innerHTML = cams.map((c, i) => `<option value="${esc(c.deviceId)}" ${c.deviceId === active ? "selected" : ""}>${esc(c.label || `Cámara ${i + 1}`)}</option>`).join("");
      select.hidden = false;
    }
    timer = setInterval(tick, TICK_MS);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    $("[data-cam-off]").hidden = false;
    $("[data-cam-start]").hidden = false;
    $("[data-cam-stop]").hidden = true;
    $("[data-cam-read]").disabled = true;
    setState("Apagada");
  }

  $("[data-cam-start]").addEventListener("click", () => start());
  $("[data-cam-stop]").addEventListener("click", stop);
  $("[data-cam-read]").addEventListener("click", () => read("lectura manual"));
  $("[data-cam-device]").addEventListener("change", (e) => { stop(); start(e.target.value); });
  $("[data-cam-auto]").addEventListener("change", (e) => { if (stream) setState(e.target.checked ? "Esperando un cambio" : "En pausa", "badge-ok"); });
  return stop;
}
