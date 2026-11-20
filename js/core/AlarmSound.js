// The alarm sound: a two-tone siren made in the browser (no audio file to download), at the device's volume.
// It plays through an <audio> element, like a video: on phones that is what sounds reliably (Web Audio is muted by the
// iPhone's silent switch and is easily left suspended). Web Audio stays as a fallback.
// Browsers only let a page play sound after the person touched it once, so the first touch unlocks both, and the voice.
const KEY = "aquasense.alarm.sound";
const RATE = 22050;
const LONGEST = 3.5;
let ctx = null;
let current = null;
let element = null;
let elementReady = false;
let voiceReady = false;

/**
 * The siren as a WAV file (16-bit mono PCM): high-low tones of 0.4 s like an emergency alarm, each with a short fade
 * so it does not click. Pure, for the tests.
 */
export function sirenWav(seconds = LONGEST, rate = RATE) {
  const n = Math.round(seconds * rate);
  const buffer = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, 36 + n * 2, true); text(8, "WAVE");
  text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, n * 2, true);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const tone = Math.floor(t / 0.4);
    const within = t - tone * 0.4;
    const frequency = tone % 2 ? 660 : 960;
    phase = (phase + frequency / rate) % 1;
    const saw = 2 * phase - 1;
    const envelope = within < 0.03 ? within / 0.03 : within > 0.36 ? Math.max(0, (0.39 - within) / 0.03) : 1;
    view.setInt16(44 + i * 2, Math.round(saw * envelope * 0.55 * 32767), true);
  }
  return buffer;
}

function audioElement() {
  if (!element && typeof Audio !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
    element = new Audio();
    element.preload = "auto";
    element.src = URL.createObjectURL(new Blob([sirenWav()], { type: "audio/wav" }));
  }
  return element;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  // On iPhone (Safari 17+) this makes the page's sound play even with the silent switch on, like a video.
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* not supported */ }
  const c = audio();
  if (c && c.state === "suspended") c.resume().catch(() => {});
  const el = audioElement();
  if (el && !elementReady && el.paused) {
    // Played once, muted, inside the touch: from then on the page may play it by itself when an alarm arrives.
    el.muted = true;
    const played = el.play();
    if (played?.then) {
      played.then(() => {
        if (current?.element) return;
        el.pause(); el.currentTime = 0; el.muted = false; elementReady = true;
      }).catch(() => { el.muted = false; });
    }
  }
  // The voice too: phones only speak after the page spoke once inside a touch.
  if (!voiceReady && typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined") {
    voiceReady = true;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch { /* no voice */ }
  }
}

/** The page can play sound now (false until the person touched it once in this visit). */
export function audioReady() {
  return elementReady || audio()?.state === "running";
}

export function alarmSoundOn() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export function setAlarmSound(on) {
  try { if (on) localStorage.removeItem(KEY); else localStorage.setItem(KEY, "off"); } catch { /* this visit */ }
  if (!on) stopSiren();
}

/** Plays the siren for {@code seconds}; returns a promise that ends when it stops. */
export function siren(seconds = LONGEST) {
  stopSiren();
  if (!alarmSoundOn()) return Promise.resolve(false);
  const el = audioElement();
  if (el && elementReady) {
    return new Promise((resolve) => {
      const finish = (played) => {
        if (current?.element !== el) return;
        clearTimeout(current.timer);
        current = null;
        el.pause();
        resolve(played);
      };
      current = { element: el, resolve, timer: setTimeout(() => finish(true), Math.min(seconds, LONGEST) * 1000) };
      el.muted = false;
      el.currentTime = 0;
      el.play().catch(() => {
        // The phone refused this time: Web Audio may still sound.
        if (current?.element !== el) return;
        clearTimeout(current.timer);
        current = null;
        webAudioSiren(seconds).then(resolve);
      });
    });
  }
  return webAudioSiren(seconds);
}

function webAudioSiren(seconds) {
  const c = audio();
  if (!c) return Promise.resolve(false);
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
  const stopping = current;
  current = null;
  if (stopping.element) {
    clearTimeout(stopping.timer);
    stopping.element.pause();
  } else {
    try { stopping.osc.stop(); } catch { /* already stopped */ }
    stopping.gain.disconnect();
  }
  stopping.resolve(false);
}

if (typeof document !== "undefined") {
  // Phones count a finished touch (touchend, click) as permission to play sound; desktops also a key or a press.
  ["pointerdown", "keydown", "touchstart", "touchend", "click"].forEach((type) => document.addEventListener(type, unlockAudio, { capture: true, passive: true }));
}
