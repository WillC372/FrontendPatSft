import { bus } from "./EventBus.js";
import { LANG } from "./Locale.js";

// Aqua's voice. It uses the voices of the device (Edge, Chrome, iPhone and Android include natural "neural" voices)
// and picks the most natural one for the app's language; the person can choose another one and the speed in
// Configuración, or turn the voice off. Long answers are read sentence by sentence while they arrive.

const VOICE_KEY = "aquasense.voice.name";
const RATE_KEY = "aquasense.voice.rate";

const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* private mode */ } };

// Language of the app -> the voice languages that fit, best first.
const WANTED = { es: ["es-419", "es-MX", "es-US", "es-CO", "es-AR", "es"], "pt-BR": ["pt-BR", "pt"], "pt-PT": ["pt-PT", "pt"],
  "zh-Hans": ["zh-CN", "cmn", "zh"], "zh-Hant": ["zh-TW", "zh-HK", "zh"], en: ["en-US", "en-GB", "en"], no: ["nb", "no"], tl: ["fil", "tl"] };

function fits(voiceLang, lang) {
  const v = voiceLang.replace("_", "-").toLowerCase();
  const wanted = (WANTED[lang] || [lang]).map((w) => w.toLowerCase());
  const i = wanted.findIndex((w) => v === w || v.startsWith(`${w}-`) || (w.length === 2 && v.split("-")[0] === w));
  return i < 0 ? -1 : wanted.length - i;
}

const NATURAL = /natural|neural|online|premium|enhanced|mejorad|siri|wavenet|journey|studio/i;
const ROBOTIC = /espeak|compact|eloquence|zarvox|albert|bad news|bells|boing|bubbles|cellos|jester|organ|trinoids|whisper|wobble|superstar|ralph|fred|junior|kathy|bahh|deranged|hysterical|pipe organ|good news|grandpa|grandma|rocko|shelley|flo|reed|sandy|eddy/i;

/** How natural a voice sounds, from what its name and origin tell. */
export function voiceScore(v, lang = LANG) {
  const fit = fits(v.lang || "", lang);
  if (fit < 0) return -1;
  let score = fit * 3;
  if (NATURAL.test(v.name)) score += 100;
  if (/google/i.test(v.name)) score += 60;
  if (!v.localService) score += 15;
  if (ROBOTIC.test(v.name)) score -= 80;
  if (/microsoft/i.test(v.name) && !NATURAL.test(v.name)) score -= 20;
  return score;
}

/** Text as it should be heard: without Markdown, reference marks, links or emojis. */
export function speakable(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\[(\d+)\]/g, "")
    .replace(/[*_#`>|~]+/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.!?…]),/g, "$1")
    .trim();
}

/** Sentences of at most ~220 characters (some browsers cut longer utterances). */
export function chunks(text) {
  const out = [];
  // A sentence ends at . ! ? … ; : followed by a space (so "7.4" is not cut).
  for (const sentence of text.split(/(?<=[.!?…;:])\s+|\n+/)) {
    let s = sentence.replace(/^[\s,;:.]+/, "").trim();
    while (s.length > 220) {
      const cut = Math.max(s.lastIndexOf(",", 220), s.lastIndexOf(" ", 220));
      out.push(s.slice(0, cut > 40 ? cut + 1 : 220).trim());
      s = s.slice(cut > 40 ? cut + 1 : 220).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

function sayOne(text, v) {
  const u = new SpeechSynthesisUtterance(text);
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = LANG; }
  u.rate = voice.rate;
  u.pitch = 1.05;
  u.onstart = () => setSpeaking(+1);
  u.onend = u.onerror = () => setSpeaking(-1);
  speechSynthesis.speak(u);
}

let speaking = 0;
const setSpeaking = (delta) => {
  const was = speaking > 0;
  speaking = Math.max(0, speaking + delta);
  if (was !== speaking > 0) bus.emit("voice:speaking", speaking > 0);
};

export const voice = {
  enabled: true,

  supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  },

  setEnabled(on) {
    this.enabled = Boolean(on);
    if (!this.enabled) this.stop();
    bus.emit("voice:enabled", this.enabled);
  },

  /** Voices of the device for the app's language, the most natural first (they may take a moment to load). */
  async voices() {
    if (!this.supported()) return [];
    let list = speechSynthesis.getVoices();
    if (!list.length) {
      list = await new Promise((resolve) => {
        const done = () => resolve(speechSynthesis.getVoices());
        speechSynthesis.addEventListener("voiceschanged", done, { once: true });
        setTimeout(done, 1500);
      });
    }
    return list.filter((v) => fits(v.lang || "", LANG) >= 0).sort((a, b) => voiceScore(b) - voiceScore(a));
  },

  async chosen() {
    const list = await this.voices();
    const name = read(VOICE_KEY);
    return list.find((v) => v.name === name) || list[0] || null;
  },

  choose(name) { write(VOICE_KEY, name || null); },
  get rate() { const r = Number.parseFloat(read(RATE_KEY)); return r >= 0.6 && r <= 1.6 ? r : 1; },
  set rate(value) { write(RATE_KEY, String(value)); },

  /** Reads a text from the beginning, interrupting what was being said. `force` reads even with the voice off (test). */
  async speak(text, { force = false } = {}) {
    if (!this.supported() || (!this.enabled && !force)) return;
    this.stop();
    const parts = chunks(speakable(text));
    if (!parts.length) return;
    const v = await this.chosen();
    parts.forEach((p) => sayOne(p, v));
  },

  /** For answers that arrive in pieces: push() with the text so far reads each finished sentence, end() the rest. */
  stream() {
    if (!this.supported() || !this.enabled) return { push() {}, end() {}, stop() {} };
    this.stop();
    let said = 0;
    let voicePromise = this.chosen();
    const sayUpTo = async (text, all) => {
      const clean = speakable(text);
      let until = clean.length;
      if (!all) {
        const m = clean.slice(said).match(/^[\s\S]*[.!?…:;\n](?=\s|$)/);
        if (!m) return;
        until = said + m[0].length;
      }
      const piece = clean.slice(said, until);
      said = until;
      const v = await voicePromise;
      chunks(piece).forEach((p) => sayOne(p, v));
    };
    return {
      push: (text) => { if (this.enabled) sayUpTo(text, false); },
      end: (text) => { if (this.enabled) sayUpTo(text, true); },
      stop: () => this.stop(),
    };
  },

  stop() {
    if (!this.supported()) return;
    speechSynthesis.cancel();
    speaking = 1;
    setSpeaking(-1);
  },
};
