import { LANG, LANG_KEY, LANGUAGES, IS_SPANISH, SUPPORTED } from "./Locale.js";

// The whole interface in the language each person chooses. The app is written in Spanish; this module watches the
// page and replaces every text (and placeholders, labels and tooltips) with its translation, including what appears
// later: toasts, server messages, dialogs. Translations come from the server, which translates each text once per
// language with the AI and shares it with everyone; this browser keeps a copy so the next visit is immediate.
//
// Sentences with bold words or links inside travel as one text with markers ("Usa <0>Mi agua</0> hoy") so the word
// order of the other language is respected; numbers travel as {0}, {1} so "Cada 7 días" and "Cada 3 días" share one
// translation. Anything marked translate="no" (names, notes, what the person writes) is left as it is.

const API = "https://aquasense-backend-willc372.onrender.com/api/v1/i18n";
const DICT_KEY = (lang) => `aquasense.i18n.${lang}`;
const RTL = new Set();
// Every language of the app is drawn in the server's PDF (Chinese and Japanese with their own font).
const PDF_IN_BROWSER = new Set();
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "svg", "SVG", "KBD", "SAMP", "VAR", "MATH", "CANVAS", "VIDEO", "AUDIO", "IFRAME", "TEMPLATE"]);
const INLINE = new Set(["B", "STRONG", "EM", "I", "U", "SMALL", "A", "SPAN", "ABBR", "MARK", "SUB", "SUP", "Q", "S", "LABEL", "TIME", "DFN", "CITE", "BDI"]);
const ATTRS = ["placeholder", "title", "aria-label", "alt", "aria-description", "aria-roledescription", "data-tip"];
const LETTER = /\p{L}/u;
const NUMBER = /\d+(?:[.,:/]\d+)*/g;
// An email address is personal data: the text that holds one is never sent to be translated.
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const ONLY_CODE = /^(?:https?:\/\/\S+|[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+|#?[\w-]+\.(?:js|css|png|pdf|csv))$/;
const MAX = 1500;

const dict = new Map();
// Texts that already are a translation (the app sometimes reads a label back and writes it again): left as they are.
const outputs = new Set();
const put = (key, value) => { dict.set(key, value); outputs.add(value); };
const nodeState = new WeakMap(); // text node -> { src, applied }
const unitState = new WeakMap(); // element translated as one sentence -> { key, appliedSer }
const attrState = new WeakMap(); // element -> Map(attr -> { src, applied })
const pending = new Set(); // keys waiting for the server
const failed = new Map(); // key -> attempts the server could not translate (tried again a little later)
const RETRY_MS = [8000, 30000, 120000, 600000];
let retryTimer = null;
let observer = null;
let flushTimer = null;
let inFlight = 0;
let saveTimer = null;

const norm = (text) => text.replace(/\s+/g, " ").trim();

/** "Cada 7 días" -> { key: "Cada {0} días", nums: ["7"] } */
function keyOf(text) {
  const nums = [];
  const marks = [];
  // The markers of a sentence (<0>, </0>, <1/>) keep their digits: they are set aside while numbers are replaced.
  const key = norm(text)
    .replace(/<\/?\d{1,2}\/?>/g, (m) => `\u0001${String.fromCharCode(65 + marks.push(m) - 1)}\u0002`)
    .replace(NUMBER, (n) => `{${nums.push(n) - 1}}`)
    .replace(/\u0001(.)\u0002/g, (m, c) => marks[c.charCodeAt(0) - 65]);
  return { key, nums };
}

const fill = (translated, nums) => translated.replace(/\{(\d{1,2})\}/g, (m, i) => nums[Number(i)] ?? m);

function translatable(text) {
  const t = norm(text);
  return t.length > 0 && t.length <= MAX && LETTER.test(t) && !ONLY_CODE.test(t) && !EMAIL.test(t);
}

function skipped(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
    if (SKIP.has(n.nodeName) || n.isContentEditable) return true;
    if (n.getAttribute("translate") === "no" || n.classList?.contains("notranslate")) return true;
    if (n.translate === false && n.hasAttribute("translate")) return true;
    // What the browser's own translator adds to the page (its "Rate this translation" box) is not the app's text.
    if (/^goog-/.test(n.id || "") || /(^|\s)goog-/.test(n.getAttribute("class") || "")) return true;
  }
  return false;
}

function lookup(text) {
  const { key, nums } = keyOf(text);
  const hit = dict.get(key);
  if (hit !== undefined) return fill(hit, nums);
  if (outputs.has(key)) return fill(key, nums);
  if (!failed.has(key)) {
    pending.add(key);
    schedule();
  }
  return null;
}

/** Texts that failed (the AI was busy, the connection dropped) are asked again after a while, a few times. */
function retryLater() {
  if (retryTimer) return;
  const attempts = Math.min(...failed.values());
  if (!Number.isFinite(attempts) || attempts > RETRY_MS.length) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    for (const [key, n] of failed) if (n <= RETRY_MS.length) { pending.add(key); failed.delete(key); retries.set(key, n); }
    if (pending.size) flush();
  }, RETRY_MS[attempts - 1]);
}
const retries = new Map();
const fail = (key) => { failed.set(key, (retries.get(key) || 0) + 1); };

// ---------- sentences with inline elements ----------

/** Children of an element as one text with markers, or null when it is not a sentence of that kind. */
function serialize(el) {
  const parts = [];
  const nodes = [];
  let text = false;
  let paired = false;
  for (const child of el.childNodes) {
    if (child.nodeType === 3) {
      if (/[<>{}]/.test(child.data)) return null;
      if (child.data.trim()) text = true;
      parts.push(child.data);
    } else if (child.nodeType === 1) {
      const i = nodes.push(child) - 1;
      const simple = INLINE.has(child.nodeName) && child.childNodes.length === 1 && child.firstChild.nodeType === 3
        && !skipped(child) && translatable(child.textContent) && !/[<>{}]/.test(child.textContent);
      if (simple) {
        paired = true;
        parts.push(`<${i}>${child.textContent}</${i}>`);
      } else {
        parts.push(`<${i}/>`);
      }
    } else {
      return null;
    }
  }
  if (!text || !paired || nodes.length > 30) return null;
  return { ser: parts.join(""), nodes };
}

function rebuild(el, translated, nodes) {
  const out = [];
  const used = new Set();
  const re = /<(\d{1,2})>([\s\S]*?)<\/\1>|<(\d{1,2})\/>/g;
  let last = 0;
  let m;
  while ((m = re.exec(translated))) {
    if (m.index > last) out.push(document.createTextNode(translated.slice(last, m.index)));
    const i = Number(m[1] ?? m[3]);
    const node = nodes[i];
    if (node && !used.has(i)) {
      used.add(i);
      if (m[1] !== undefined) node.textContent = m[2];
      out.push(node);
    }
    last = re.lastIndex;
  }
  if (last < translated.length) out.push(document.createTextNode(translated.slice(last)));
  nodes.forEach((n, i) => { if (!used.has(i)) out.push(n); });
  el.replaceChildren(...out);
}

function translateUnit(el) {
  const current = serialize(el);
  if (!current) return false;
  const state = unitState.get(el);
  if (state && state.appliedSer === current.ser) return true;
  if (state?.waiting && state.srcSer === current.ser) {
    const again = lookup(state.text);
    if (again === null) return true;
    apply(el, again, current, state.text);
    return true;
  }
  if (!translatable(current.ser.replace(/<\/?\d{1,2}\/?>/g, " "))) return true;
  const translated = lookup(current.ser);
  if (translated === null) {
    unitState.set(el, { waiting: true, srcSer: current.ser, text: current.ser });
    return true;
  }
  apply(el, translated, current, current.ser);
  return true;
}

function apply(el, translated, current, source) {
  const lead = source.match(/^\s*/)[0];
  const trail = source.match(/\s*$/)[0];
  rebuild(el, lead + translated.trim() + trail, current.nodes);
  const after = serialize(el);
  unitState.set(el, { appliedSer: after?.ser ?? null });
}

// ---------- single texts and attributes ----------

function translateText(node) {
  const state = nodeState.get(node);
  if (state && node.data === state.applied && !state.waiting) return;
  const src = state && node.data === state.applied ? state.src : node.data;
  if (!translatable(src)) return;
  const translated = lookup(src);
  if (translated === null) {
    nodeState.set(node, { src, applied: node.data, waiting: true });
    return;
  }
  const lead = src.match(/^\s*/)[0];
  const trail = src.match(/\s*$/)[0];
  const value = lead + translated + trail;
  if (node.data !== value) node.data = value;
  nodeState.set(node, { src, applied: value });
}

/** A text box filled in by the app (not yet edited by the person) shows its suggestion in the language too. */
function translateValue(el) {
  const area = el.nodeName === "TEXTAREA";
  if (!area && (el.nodeName !== "INPUT" || !["text", "search"].includes((el.getAttribute("type") || "text").toLowerCase()))) return;
  const value = area ? el.defaultValue : el.getAttribute("value");
  if (!value || el.value !== value) return;
  const state = attrState.get(el)?.get("value");
  if (state && value === state.applied && !state.waiting) return;
  const src = state && value === state.applied ? state.src : value;
  if (!translatable(src)) return;
  const translated = lookup(src);
  let states = attrState.get(el);
  if (!states) attrState.set(el, (states = new Map()));
  if (translated === null) { states.set("value", { src, applied: value, waiting: true }); return; }
  if (area) el.defaultValue = translated; else el.setAttribute("value", translated);
  el.value = translated;
  states.set("value", { src, applied: translated });
}

function translateAttrs(el) {
  translateValue(el);
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (!value) continue;
    let states = attrState.get(el);
    const state = states?.get(name);
    if (state && value === state.applied && !state.waiting) continue;
    const src = state && value === state.applied ? state.src : value;
    if (!translatable(src)) continue;
    const translated = lookup(src);
    if (!states) attrState.set(el, (states = new Map()));
    if (translated === null) { states.set(name, { src, applied: value, waiting: true }); continue; }
    if (value !== translated) el.setAttribute(name, translated);
    states.set(name, { src, applied: translated });
  }
}

/** Translates everything under `root` that has a translation; the rest is requested from the server. */
function walk(root) {
  if (root.nodeType === 3) {
    if (root.parentNode && !skipped(root.parentNode)) {
      const unit = root.parentNode;
      if (!translateUnit(unit)) translateText(root);
    }
    return;
  }
  if (root.nodeType !== 1 || skipped(root)) return;
  const visit = (el) => {
    // Charts and icons: only their accessible name (aria-label, title) is text to translate.
    if (el.nodeName === "svg" || el.nodeName === "SVG" || el.nodeName === "TEXTAREA") { translateAttrs(el); return; }
    if (SKIP.has(el.nodeName) || el.getAttribute("translate") === "no" || el.classList.contains("notranslate") || el.isContentEditable) return;
    translateAttrs(el);
    if (translateUnit(el)) {
      // The sentence's own inline words are done; elements kept whole inside it are visited on their own.
      for (const child of el.children) if (!INLINE.has(child.nodeName) || child.children.length) visit(child);
      return;
    }
    for (const child of el.childNodes) {
      if (child.nodeType === 3) translateText(child);
      else if (child.nodeType === 1) visit(child);
    }
  };
  visit(root);
}

// ---------- talking to the server ----------

function schedule() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 40);
}

async function flush() {
  const keys = [...pending].slice(0, 400);
  keys.forEach((k) => pending.delete(k));
  if (!keys.length) return;
  busy(+1);
  const batches = [];
  for (let i = 0; i < keys.length; i += 80) batches.push(keys.slice(i, i + 80));
  // One after another: the server translates each batch with the AI, and bursts are rejected by its providers.
  for (const texts of batches) await (async () => {
    try {
      const res = await fetch(`${API}/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: LANG, texts }) });
      if (!res.ok) throw new Error(String(res.status));
      const { translations } = await res.json();
      texts.forEach((k, i) => { if (translations[i]) { put(k, translations[i]); retries.delete(k); } else fail(k); });
    } catch {
      texts.forEach((k) => fail(k));
    }
    save();
    refresh();
  })();
  busy(-1);
  save();
  refresh();
  if (pending.size) schedule();
  if (failed.size) retryLater();
}

/** Applies what arrived to the whole page (the app's own changes made meanwhile are processed first). */
function refresh() {
  if (!observer) return;
  handle(observer.takeRecords());
  walk(document.documentElement);
  observer.takeRecords();
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(DICT_KEY(LANG), JSON.stringify(Object.fromEntries(dict))); } catch { /* full or private */ }
  }, 800);
}

// A discreet "Traduciendo..." while texts are on their way.
let badge = null;
function busy(delta) {
  inFlight += delta;
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "i18n-busy";
    badge.setAttribute("role", "status");
    badge.setAttribute("translate", "no");
    document.body.append(badge);
  }
  badge.textContent = `${LANGUAGE_NAME()}…`;
  badge.hidden = inFlight <= 0;
}
const LANGUAGE_NAME = () => {
  try { return new Intl.DisplayNames([LANG], { type: "language" }).of(LANG); } catch { return LANG; }
};

function handle(records) {
  for (const r of records) {
    if (r.type === "childList") r.addedNodes.forEach((n) => walk(n));
    else if (r.type === "characterData") walk(r.target);
    else if (r.type === "attributes" && r.target.nodeType === 1 && !skipped(r.target)) translateAttrs(r.target);
  }
}

export const i18n = {
  lang: LANG,
  spanish: IS_SPANISH,
  rtl: RTL.has(LANG),
  /** False when the PDF must be made by printing the translated screen ("Guardar como PDF"). */
  pdfOnServer: !PDF_IN_BROWSER.has(LANG),

  /** Opens the browser's print dialog for the current screen, explaining how to save it as PDF. */
  printAsPdf(toast) {
    toast?.("Tu idioma usa una escritura que el PDF del servidor no puede dibujar: se abre la impresión de esta pantalla ya traducida. Elige «Guardar como PDF».", "info", 8000);
    setTimeout(() => window.print(), 600);
  },

  /** Starts translating the page (nothing to do in Spanish). */
  start() {
    document.documentElement.lang = LANG;
    document.documentElement.dir = RTL.has(LANG) ? "rtl" : "ltr";
    if (IS_SPANISH) return;
    try {
      const saved = JSON.parse(localStorage.getItem(DICT_KEY(LANG)) || "{}");
      Object.entries(saved).forEach(([k, v]) => put(k, v));
    } catch { /* corrupt copy: it is downloaded again */ }
    observer = new MutationObserver((records) => {
      handle(records);
      observer.takeRecords();
    });
    walk(document.documentElement);
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    // Everything already translated for this language, in one request (also what other people translated).
    fetch(`${API}/dictionary/${encodeURIComponent(LANG)}`).then((r) => (r.ok ? r.json() : {})).then((all) => {
      let added = 0;
      for (const [k, v] of Object.entries(all)) if (dict.get(k) !== v) { put(k, v); added++; }
      if (added) { save(); refresh(); }
    }).catch(() => {});
  },

  /** A text for places outside the page (Aqua's voice, the browser's own dialogs). */
  t(text) {
    if (IS_SPANISH || !translatable(text)) return text;
    const { key, nums } = keyOf(text);
    const hit = dict.get(key);
    return hit === undefined ? text : fill(hit, nums);
  },

  /** Same as t() but asks the server when the text is not translated yet. */
  async tAsync(text) {
    if (IS_SPANISH || !translatable(text)) return text;
    const { key, nums } = keyOf(text);
    if (!dict.has(key)) {
      try {
        const res = await fetch(`${API}/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: LANG, texts: [key] }) });
        const { translations } = await res.json();
        if (translations?.[0]) { put(key, translations[0]); save(); }
      } catch { /* Spanish meanwhile */ }
    }
    return dict.has(key) ? fill(dict.get(key), nums) : text;
  },

  /** Changes the language: the page reloads so every screen, date and number is built again in it. */
  change(lang, { beforeSignIn = false } = {}) {
    if (!SUPPORTED.has(lang)) lang = "es";
    if (lang === LANG) return;
    try {
      localStorage.setItem(LANG_KEY, lang);
      // Chosen on the sign-in screen: after signing in it is saved in the account instead of the account's language.
      if (beforeSignIn) localStorage.setItem(`${LANG_KEY}.pending`, "1"); else localStorage.removeItem(`${LANG_KEY}.pending`);
    } catch { /* private mode: only this visit */ }
    location.reload();
  },

  /**
   * After signing in: the account's language wins, unless the person has just chosen one on the sign-in screen, which
   * is then saved in the account. Returns the language to save, or null.
   */
  syncWithAccount(accountLang, save) {
    let pending = false;
    try { pending = localStorage.getItem(`${LANG_KEY}.pending`) === "1"; localStorage.removeItem(`${LANG_KEY}.pending`); } catch { /* ignore */ }
    const account = SUPPORTED.has(accountLang) ? accountLang : "es";
    if (account === LANG) return;
    if (pending) { save(LANG); return; }
    this.change(account);
  },

  /** Languages offered, with their name in their own language. */
  async languages() {
    return LANGUAGES;
  },
};
