// The alarm sound, made with Web Audio (no audio file to download): a two-tone siren at the device's volume.
// Browsers only let a page play sound after the person touched it once, so the first touch or key unlocks it.
const KEY = "aquasense.alarm.sound";
let ctx = null;
let current = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = audio();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

/** The page can play sound now (false until the person touched it once in this visit). */
export function audioReady() {
  return audio()?.state === "running";
}

export function alarmSoundOn() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export function setAlarmSound(on) {
  try { if (on) localStorage.removeItem(KEY); else localStorage.setItem(KEY, "off"); } catch { /* this visit */ }
  if (!on) stopSiren();
}

/** Plays the siren for {@code seconds}; returns a promise that ends when it stops. */
export function siren(seconds = 3.5) {
  stopSiren();
  const c = audio();
  if (!c || !alarmSoundOn()) return Promise.resolve(false);
  c.resume?.().catch(() => {});
  const gain = c.createGain();
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  const t0 = c.currentTime + 0.02;
  // High-low pattern like an emergency alarm, with a short fade in each tone so it does not click.
  for (let t = 0, i = 0; t < seconds; t += 0.4, i++) {
    osc.frequency.setValueAtTime(i % 2 ? 660 : 960, t0 + t);
    gain.gain.setValueAtTime(0.0001, t0 + t);
    gain.gain.exponentialRampToValueAtTime(0.28, t0 + t + 0.03);
    gain.gain.setValueAtTime(0.28, t0 + t + 0.33);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.39);
  }
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + seconds);
  return new Promise((resolve) => {
    current = { osc, gain, resolve };
    osc.onended = () => { if (current?.osc === osc) current = null; gain.disconnect(); resolve(true); };
  });
}

export function stopSiren() {
  if (!current) return;
  const { osc, gain, resolve } = current;
  current = null;
  try { osc.stop(); } catch { /* already stopped */ }
  gain.disconnect();
  resolve(false);
}

if (typeof document !== "undefined") {
  ["pointerdown", "keydown", "touchstart"].forEach((type) => document.addEventListener(type, unlockAudio, { capture: true, passive: true }));
}
