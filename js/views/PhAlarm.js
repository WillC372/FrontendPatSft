import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { i18n } from "../core/I18n.js";
import { voice } from "../core/Voice.js";
import { esc, relativeTime } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { aquaFace } from "../ui/AquaFace.js";
import { modal } from "../ui/Components.js";
import { alarmSpeech, alarmsToSound } from "../core/AlarmRules.js";
import { audioReady, siren, stopSiren } from "../core/AlarmSound.js";

// Alarm for an alteration of the pH (alerts of kind PH_ALTERATION, created by the backend when a measurement of the
// meter changes suddenly or goes into the critical level): it sounds, shows a dialog that does not go away by itself,
// shows a notice of the system if the app is in the background, and Aqua says aloud what happened and whether it is
// dangerous. The siren repeats every few seconds until the person presses «Entendido» (two minutes at most).
const SEEN_KEY = "aquasense.alarm.seen";
const REPEAT_MS = 10000;
const MAX_MS = 120000;

const readSeen = () => { try { return JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; } };
const seen = new Set(readSeen());
const saveSeen = () => { try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-50))); } catch { /* this visit */ } };

let active = null; // { stop } of the alarm on screen

const waitForVoice = () => new Promise((resolve) => {
  const timer = setTimeout(done, 45000);
  const off = bus.on("voice:speaking", (on) => { if (!on) done(); });
  function done() { clearTimeout(timer); off(); resolve(); }
});

const waitForTouch = () => new Promise((resolve) => {
  if (audioReady()) { resolve(); return; }
  const go = () => setTimeout(resolve, 50);
  document.addEventListener("pointerdown", go, { once: true, capture: true });
  document.addEventListener("keydown", go, { once: true, capture: true });
});

async function systemNotice(title, body, tag) {
  if (!document.hidden || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker?.ready;
    const options = { body, tag, renotify: true, requireInteraction: true, vibrate: [400, 200, 400, 200, 800],
      icon: "/assets/img/Icon192.png", badge: "/assets/img/Icon192.png", data: { url: "/#/dashboard" } };
    if (registration) await registration.showNotification(title, options); else new Notification(title, options);
  } catch { /* the dialog is still there when the person comes back */ }
}

/** Sound and voice, repeated until stopped: siren, Aqua speaks, then a short siren every few seconds. */
function ring(speech) {
  let stopped = false;
  const started = Date.now();
  (async () => {
    await waitForTouch();
    if (stopped) return;
    await siren(3.5);
    if (stopped) return;
    if (voice.enabled && voice.supported()) {
      const spoken = await speech;
      if (stopped) return;
      voice.speak(spoken);
      await waitForVoice();
    }
    while (!stopped && Date.now() - started < MAX_MS) {
      await new Promise((r) => setTimeout(r, REPEAT_MS));
      if (!stopped) await siren(1.6);
    }
  })();
  return () => { stopped = true; stopSiren(); voice.stop(); };
}

async function raise(alert, router) {
  const dangerous = alert.severity === "CRITICAL";
  // What Aqua says goes in the person's language; the dialog is translated like the rest of the page.
  const speech = Promise.all([i18n.tAsync(alert.title), i18n.tAsync(alert.message)]).then(([t, m]) => alarmSpeech(t, m));
  const stop = ring(speech);
  active = { stop };
  navigator.vibrate?.([400, 200, 400, 200, 800]);
  speech.then((text) => systemNotice(text.split(". ")[0], text.slice(text.indexOf(". ") + 2), "ph-alarm"));
  const choice = await modal({
    titleHtml: `${icon("alert")}${esc(alert.title)}`,
    body: `<div class="alarm-box${dangerous ? " danger" : ""}" role="alert">
        ${aquaFace("alarm-face")}
        <div><strong class="alarm-level">${dangerous ? "Es peligroso" : "Por ahora no es peligroso"}</strong>
          <p>${esc(alert.message)}</p><small class="muted">${relativeTime(alert.createdAt)}</small></div>
      </div>
      ${audioReady() ? "" : `<p class="muted small alarm-tap">${icon("volume")}<span>Toca esta ventana para oír la alarma: el navegador pide un toque antes de reproducir sonido.</span></p>`}`,
    onMount: (node) => (node.closest?.(".modal") || node.querySelector?.(".modal") || node).classList.add("alarm-modal"),
    actions: [
      { label: "Ver qué hacer", icon: "flask", className: "btn-ghost", value: "care" },
      { label: "Entendido", icon: "check", className: "btn-primary", value: "ok" },
    ],
  });
  stop();
  active = null;
  try { await api.patch(`/alerts/${alert.id}/read`); } catch { /* it stays unread in the bell */ }
  bus.emit("alerts:changed");
  if (choice === "care") router?.go("care");
}

export const phAlarm = {
  /** Called with the unread alerts each time they are fetched. */
  check(alerts, router) {
    if (active) return;
    const fresh = alarmsToSound(alerts, seen);
    if (!fresh.length) return;
    fresh.forEach((a) => seen.add(a.id));
    saveSeen();
    raise(fresh[0], router);
  },

  /** «Probar alarma» in Configuración: the same sound and voice, with a sample sentence (it does not create an alert). */
  async test() {
    this.stop();
    await siren(2.5);
    if (voice.supported()) voice.speak(await i18n.tAsync("Así te aviso si el pH del agua se altera: suena la alarma y te digo si es peligroso."), { force: true });
  },

  stop() {
    active?.stop();
    active = null;
    stopSiren();
  },
};
