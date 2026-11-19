import { session } from "../core/Session.js";
import { bus } from "../core/EventBus.js";
import { esc } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { aquaFace } from "../ui/AquaFace.js";
import { toast } from "../ui/Components.js";
import { api } from "../core/Api.js";
import { voice } from "../core/Voice.js";
import { i18n } from "../core/I18n.js";
import { AI_FUNCTIONS } from "./AiFunctions.js";
import { startTour, tourRunning } from "./Tour.js";

const GROUPS = () => [
  ["Analizar mi agua", ["diagnosis", "anomalies", "forecast"]],
  ["Más herramientas", ["reports", "library"]],
  ["Análisis avanzado", ["deep", "ml", "scenario"]],
  ...(session.user?.role === "ADMIN" ? [["Administración", ["usage"]]] : []),
];
const BY_KEY = Object.fromEntries(AI_FUNCTIONS.map((f) => [f[0], f]));

// What Aqua says the first time each screen is opened in this browser session.
const HINTS = {
  dashboard: (name) => `¡Hola${name ? `, ${name}` : ""}! Aquí ves cómo está tu agua. Toca «Medir» para registrar el pH.`,
  history: () => "Aquí ves cómo cambió tu agua. Si quieres, tócame y busco valores raros.",
  profiles: () => "Elige para qué usas el agua: cada uso tiene su rango ideal de pH.",
  places: () => "Aquí tienes cada piscina, acuario o tanque por separado. También puedes compartir uno con un código.",
  care: () => "Calcula cuánto producto echar, anota lo que le haces al agua y crea recordatorios.",
  devices: () => "Conecta tu medidor por USB o lee su pantalla con la cámara.",
  official: () => "Son mediciones reales de ríos de EE. UU. (USGS). Te sirven como referencia.",
  sessions: () => "Aquí ves tus inicios de sesión y lo que hiciste en cada uno.",
  settings: () => "Aquí cambias el tema, las alertas y los datos de tu cuenta.",
  billing: () => "Aquí ves tu plan. Los pagos funcionan en modo de pruebas.",
  intelligence: () => "Esta es una de mis funciones. Tócame para elegir otra.",
};

const TOUR_KEY = (id) => `aquasense.tour.v1.${id}`;
const TIPS_KEY = "aquasense.aqua.tips";
/** Which sign-in Aqua already greeted with "Hola" (a piece of that session's token, kept for this tab). */
const GREETED_KEY = "aquasense.aqua.greeted";

// After the first greeting of a sign-in, Aqua opens with one of these (never the same one twice in a row).
export const OPENERS = [
  "¿En qué te puedo ayudar?", "¿Qué necesitas hoy?", "¿Qué quieres saber de tu agua?", "¿En qué te ayudo ahora?",
  "Aquí estoy, ¿qué hacemos?", "¿Qué revisamos hoy?", "Cuéntame, ¿qué necesitas?", "¿Tienes alguna duda sobre tu agua?",
  "¿Qué te gustaría consultar?", "¿Por dónde empezamos?", "¿Te ayudo con algo de tu agua?", "¿Qué quieres analizar?",
  "Dime, ¿en qué te ayudo?", "¿Revisamos cómo va tu pH?", "¿Necesitas un diagnóstico o una predicción?",
  "¿Qué pregunta tienes para mí?", "Listo para ayudarte, ¿qué necesitas?", "¿Hay algo de tu agua que te preocupe?",
  "¿Quieres que miremos tus mediciones?", "¿En qué te puedo echar una mano?", "¿Qué hacemos con tu agua hoy?",
  "¿Te ayudo a entender una medición?", "¿Preparamos un informe o resolvemos una duda?", "¿Qué te trae por aquí?",
  "Aquí me tienes, ¿qué consultamos?", "¿Necesitas ayuda con una dosis o un tratamiento?",
];
let lastOpener = -1;
const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const write = (store, key, value) => { try { store.setItem(key, value); } catch { /* storage unavailable */ } };

export const TOUR_STEPS = [
  { target: null, title: "¡Hola! Soy Aqua", text: "Te ayudo a cuidar el pH de tu agua. En un minuto te muestro dónde está cada cosa." },
  { target: '[data-tab="dashboard"]', title: "Inicio", text: "Tu última medición y si tu agua está bien para el uso que elegiste." },
  { target: '[data-tab="history"]', title: "Historial", text: "Todas tus mediciones con gráficas, filtros y descarga." },
  { target: '[data-tab="measure"]', title: "Medir", text: "El botón más importante: registra el pH con tu medidor, con una foto o escribiendo el valor." },
  { target: '[data-tab="care"]', title: "Cuidado", text: "Calculadora de dosis, registro de lo que le echas al agua y recordatorios que te llegan al celular o al correo." },
  { target: '[data-tab="billing"]', title: "Plan", text: "Tu plan actual y lo que incluye Premium: más días de análisis, predicciones más largas y más consultas de IA." },
  { target: '[data-tab="admin"]', title: "Admin", text: "Solo para administradores: cuentas, planes, actividad y el consumo de la IA." },
  { target: "[data-place-chip]", title: "Tus lugares", text: "El agua que estás viendo. Tócalo para cambiar de piscina, acuario o tanque, y para crear, editar o compartir lugares y sus perfiles de uso." },
  { target: "[data-bell]", title: "Alertas", text: "Si una medición sale del rango, te aviso aquí." },
  { target: "[data-account]", title: "Tu cuenta", text: "Toca tu inicial o tu nombre para «Mi cuenta», «Configuración» (tema, idioma, voz de Aqua, avisos, tu medidor y tu actividad) y «Cerrar sesión»." },
  { target: "[data-aqua]", title: "Y aquí estoy yo", text: "Tócame para chatear conmigo, pedir un diagnóstico, predecir tu pH o armar un informe. En la «Biblioteca normativa» están las normas y los datos oficiales de pH, y en «Análisis avanzado», los modelos entrenados con tus datos." },
];

/** Aqua: the floating robot. Its panel holds the chat and every AI function; it also runs the guided tour. */
export class AquaBot {
  #offs = [];
  #chatReady = false;
  #sayTimer = 0;

  constructor(host, { onTourEnd = () => {} } = {}) {
    this.onTourEnd = onTourEnd;
    const first = esc(session.user?.fullName?.split(" ")[0] || "");
    this.node = document.createElement("div");
    this.node.className = "aqua";
    this.node.innerHTML = `
      <div class="aqua-say" data-say hidden><p data-say-text></p><button type="button" class="aqua-say-x" data-say-close aria-label="Cerrar consejo de Aqua">${icon("close")}</button></div>
      <button type="button" class="aqua-bot" data-aqua aria-expanded="false" aria-controls="aqua-panel" aria-label="Aqua, asistente de IA: chatear y funciones de inteligencia artificial">${aquaFace()}<span class="aqua-ring" aria-hidden="true"></span><span class="aqua-splash" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span></button>
      <span class="aqua-floor" aria-hidden="true"><i class="shadow"></i><i class="ripple"></i><i class="ripple"></i></span>
      <section class="aqua-panel" id="aqua-panel" role="dialog" aria-labelledby="aqua-title" hidden>
        <div class="aqua-head">
          <button type="button" class="icon-btn btn btn-ghost" data-aqua-back aria-label="Volver a las funciones" hidden>${icon("chevronRight")}</button>
          ${aquaFace("aqua-head-face")}
          <div><h2 id="aqua-title">Aqua</h2><small class="muted" data-aqua-sub>Tu asistente de agua con IA</small></div>
          <button type="button" class="icon-btn btn btn-ghost" data-aqua-voice aria-pressed="${voice.enabled}" aria-label="Voz de Aqua" title="Voz de Aqua: tócalo para que hable o se quede callada">${icon(voice.enabled ? "volume" : "volumeOff")}</button>
          <button type="button" class="icon-btn btn btn-ghost" data-aqua-close aria-label="Cerrar a Aqua">${icon("close")}</button>
        </div>
        <div class="aqua-body" data-aqua-home>
          <div class="aqua-bubble" data-aqua-greeting>Hola${first ? `, <span translate="no">${first}</span>` : ""}. ¿En qué te puedo ayudar?</div>
          <button type="button" class="aqua-chat-btn" data-aqua-chat-open>${icon("message")}<span><strong>Chatear conmigo</strong><small>Respondo sobre tu agua, piscinas, acuarios, riego y calibración</small></span>${icon("chevronRight")}</button>
          ${GROUPS().map(([label, keys]) => `<h3 class="aqua-group">${label}</h3><div class="aqua-grid">
            ${keys.map((k) => { const [key, title, ic, text] = BY_KEY[k]; return `<a class="aqua-fn" href="#/intelligence/${key}" data-aqua-fn="${key}">${icon(ic)}<span><strong>${title}</strong><small>${text}</small></span></a>`; }).join("")}
          </div>`).join("")}
          <div class="aqua-foot">
            <button type="button" class="btn btn-pill" data-aqua-tour>${icon("info")}¿Qué puedo hacer aquí?</button>
            <label class="aqua-tips"><input type="checkbox" data-aqua-tips> Consejos al cambiar de pantalla</label>
          </div>
        </div>
        <div class="aqua-body aqua-chat" data-aqua-chat hidden></div>
      </section>`;
    host.append(this.node);
    this.bot = this.node.querySelector("[data-aqua]");
    this.panel = this.node.querySelector(".aqua-panel");
    this.#bind();
  }

  get isOpen() {
    return !this.panel.hidden;
  }

  open(mode = "home") {
    this.hideSay();
    this.panel.hidden = false;
    this.bot.setAttribute("aria-expanded", "true");
    this.node.classList.add("open");
    if (mode === "chat") this.#showChat(); else { this.#showHome(); this.greet(); }
  }

  /**
   * The first time Aqua is opened after signing in: "Hola, Ana. ¿En qué te puedo ayudar?". The next times, a short
   * opener chosen at random ("¿Qué necesitas hoy?"...). Written in the bubble and said out loud (unless the voice is
   * off), in the app's language.
   */
  async greet() {
    const bubble = this.node.querySelector("[data-aqua-greeting]");
    const first = session.user?.fullName?.split(" ")[0] || "";
    const stamp = (session.token || "").slice(-16);
    let firstTime = true;
    try { firstTime = sessionStorage.getItem(GREETED_KEY) !== stamp; sessionStorage.setItem(GREETED_KEY, stamp); } catch { /* private mode */ }
    let spoken;
    if (firstTime) {
      bubble.innerHTML = `Hola${first ? `, <span translate="no">${esc(first)}</span>` : ""}. ¿En qué te puedo ayudar?`;
      if (!voice.enabled) return;
      const [hello, ask] = await Promise.all([i18n.tAsync("Hola"), i18n.tAsync("¿En qué te puedo ayudar?")]);
      spoken = `${hello}${first ? `, ${first}` : ""}. ${ask}`;
    } else {
      let i = Math.floor(Math.random() * OPENERS.length);
      if (i === lastOpener) i = (i + 1) % OPENERS.length;
      lastOpener = i;
      bubble.textContent = OPENERS[i];
      if (!voice.enabled) return;
      spoken = await i18n.tAsync(OPENERS[i]);
    }
    if (this.isOpen) voice.speak(spoken);
  }

  close({ focusBot = true } = {}) {
    if (!this.isOpen) return;
    voice.stop();
    this.panel.hidden = true;
    this.bot.setAttribute("aria-expanded", "false");
    this.node.classList.remove("open");
    if (focusBot) this.bot.focus({ preventScroll: true });
  }

  #showHome() {
    this.node.querySelector("[data-aqua-home]").hidden = false;
    this.node.querySelector("[data-aqua-chat]").hidden = true;
    this.node.querySelector("[data-aqua-back]").hidden = true;
    this.node.querySelector("[data-aqua-sub]").textContent = "Tu asistente de agua con IA";
    this.node.querySelector("[data-aqua-chat-open]").focus({ preventScroll: true });
  }

  async #showChat(question = "") {
    const box = this.node.querySelector("[data-aqua-chat]");
    this.node.querySelector("[data-aqua-home]").hidden = true;
    box.hidden = false;
    this.node.querySelector("[data-aqua-back]").hidden = false;
    this.node.querySelector("[data-aqua-sub]").textContent = "Chat con memoria y normas oficiales";
    if (!this.#chatReady) {
      this.#chatReady = true;
      try {
        const { assistantPane } = await import("./AssistantPane.js");
        await assistantPane(box, { compact: true });
        box.insertAdjacentHTML("beforeend", `<a class="aqua-full" href="#/intelligence/assistant" data-aqua-fn="assistant">${icon("arrowRight")}Ver todas mis conversaciones</a>`);
      } catch (error) {
        this.#chatReady = false;
        box.innerHTML = `<p class="muted">No se pudo abrir el chat: ${esc(error.message)}</p>`;
        return;
      }
    }
    const form = box.querySelector("[data-form]");
    const input = form?.querySelector("input");
    if (question && input && !input.disabled) {
      input.value = question;
      form.requestSubmit();
    }
    input?.focus({ preventScroll: true });
  }

  /** Aqua says something next to the robot (it does not interrupt: screen readers hear it politely). */
  say(text, ms = 7000) {
    if (this.isOpen || tourRunning()) return;
    const bubble = this.node.querySelector("[data-say]");
    this.node.querySelector("[data-say-text]").innerHTML = esc(text).replace(/«(.+?)»/g, "<strong>$1</strong>");
    bubble.hidden = false;
    bubble.setAttribute("role", "status");
    clearTimeout(this.#sayTimer);
    this.#sayTimer = setTimeout(() => this.hideSay(), ms);
    // Aqua moves its mouth while the bubble appears, about as long as it takes to read it.
    this.node.classList.add("talking");
    clearTimeout(this.#talkTimer);
    this.#talkTimer = setTimeout(() => this.node.classList.remove("talking"), Math.min(4000, 900 + text.length * 30));
  }

  hideSay() {
    clearTimeout(this.#sayTimer);
    this.node.querySelector("[data-say]").hidden = true;
  }

  /** Called by the frame when the screen changes. */
  onRoute(name) {
    this.node.classList.toggle("on-ai", name === "intelligence");
    if (read(localStorage, TIPS_KEY) === "off" || !HINTS[name]) return;
    const key = `aquasense.aqua.said.${name}`;
    if (read(sessionStorage, key)) return;
    write(sessionStorage, key, "1");
    setTimeout(() => this.say(HINTS[name](session.user?.fullName?.split(" ")[0] || "")), 900);
  }

  async tour() {
    this.close({ focusBot: false });
    this.hideSay();
    window.scrollTo({ top: 0 });
    // Only the buttons this person has (Admin appears only for administrators), in the order of the bar.
    // The administrator opens the care of the water from the place menu (it is not in the bar).
    const steps = TOUR_STEPS.map((step) => step.target === "[data-place-chip]" && session.user?.role === "ADMIN"
      ? { ...step, text: "El agua que estás viendo. Tócalo para cambiar de piscina, acuario o tanque, para el «Cuidado de este lugar» (calculadora de dosis, tratamientos y recordatorios) y para crear, editar o compartir lugares y sus perfiles de uso." }
      : step);
    await startTour(steps.filter((step) => !step.target || document.querySelector(step.target)));
    this.onTourEnd();
    if (session.user?.id) write(localStorage, TOUR_KEY(session.user.id), String(Date.now()));
  }

  /** The first time each person signs in on this browser, the tour starts by itself. */
  maybeFirstTour() {
    const id = session.user?.id;
    if (!id || read(localStorage, TOUR_KEY(id))) return;
    const tryStart = (attempt = 0) => {
      // It waits for any open dialog (for example the photo reader) to close first.
      if (document.querySelector(".modal-backdrop") || this.isOpen) {
        if (attempt < 20) setTimeout(() => tryStart(attempt + 1), 1500);
        return;
      }
      this.tour();
    };
    setTimeout(tryStart, 1200);
  }

  #bind() {
    const $ = (sel) => this.node.querySelector(sel);
    this.bot.addEventListener("click", () => (this.isOpen ? this.close() : this.open()));
    $("[data-aqua-close]").addEventListener("click", () => this.close());
    $("[data-aqua-back]").addEventListener("click", () => this.#showHome());
    $("[data-say-close]").addEventListener("click", () => this.hideSay());
    $("[data-aqua-chat-open]").addEventListener("click", () => this.#showChat());
    $("[data-aqua-tour]").addEventListener("click", () => this.tour());
    const tips = $("[data-aqua-tips]");
    tips.checked = read(localStorage, TIPS_KEY) !== "off";
    tips.addEventListener("change", () => {
      write(localStorage, TIPS_KEY, tips.checked ? "on" : "off");
      toast(tips.checked ? "Aqua te dará un consejo al abrir cada pantalla." : "Aqua ya no dará consejos al cambiar de pantalla.", "info", 3000);
    });
    // Choosing a function opens its screen; on a phone the panel closes so the screen can be seen.
    this.node.addEventListener("click", (event) => {
      if (event.target.closest("[data-aqua-fn]")) this.close({ focusBot: false });
    });
    const onKey = (event) => {
      if (event.key === "Escape" && this.isOpen && !document.querySelector(".modal-backdrop, .tour")) {
        event.preventDefault();
        this.close();
      }
    };
    document.addEventListener("keydown", onKey);
    this.#offs.push(() => document.removeEventListener("keydown", onKey));
    // A click outside closes the panel, except in dialogs opened from it (for example "borrar conversación").
    const onDown = (event) => {
      if (!this.isOpen || this.node.contains(event.target) || event.target.closest?.(".modal-backdrop, #toasts, .tour")) return;
      this.close({ focusBot: false });
    };
    document.addEventListener("pointerdown", onDown);
    this.#offs.push(() => document.removeEventListener("pointerdown", onDown));
    this.#offs.push(bus.on("aqua:open", (mode) => this.open(mode || "home")));
    this.#offs.push(bus.on("aqua:tour", () => this.tour()));
    this.#bindLife();
  }

  /**
   * Aqua's life: its eyes follow the pointer, it lights its antenna while the AI works, and now and then it jumps,
   * winks or looks around. Nothing moves when the person asked the system to reduce motion.
   */
  #bindLife() {
    const face = this.bot.querySelector(".aqua-face");
    this.#offs.push(bus.on("ai:busy", (count) => this.node.classList.toggle("thinking", count > 0)));
    // The mouth moves while Aqua speaks.
    this.#offs.push(bus.on("voice:speaking", (on) => this.node.classList.toggle("talking", on)));
    const voiceBtn = this.node.querySelector("[data-aqua-voice]");
    const showVoice = (on) => {
      voiceBtn.innerHTML = icon(on ? "volume" : "volumeOff");
      voiceBtn.setAttribute("aria-pressed", String(on));
    };
    this.#offs.push(bus.on("voice:enabled", showVoice));
    voiceBtn.hidden = !voice.supported();
    voiceBtn.addEventListener("click", async () => {
      voice.setEnabled(!voice.enabled);
      toast(voice.enabled ? "Aqua volverá a hablar." : "Aqua ya no hablará; solo escribirá las respuestas.", "info", 2500);
      try {
        const settings = await api.get("/users/me/settings");
        await api.put("/users/me/settings", { ...settings, voiceEnabled: voice.enabled });
      } catch { /* it stays changed in this visit */ }
    });
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return;
    let frame = 0;
    const look = (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = this.bot.getBoundingClientRect();
        const dx = event.clientX - (r.left + r.width / 2);
        const dy = event.clientY - (r.top + r.height * 0.6);
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, d / 220) * 3;
        face.style.setProperty("--look-x", `${((dx / d) * reach).toFixed(2)}px`);
        face.style.setProperty("--look-y", `${((dy / d) * reach * 0.8).toFixed(2)}px`);
      });
    };
    document.addEventListener("pointermove", look, { passive: true });
    this.#offs.push(() => document.removeEventListener("pointermove", look));
    // It already hops and flips on its own; the occasional tricks are the face ones.
    const TRICKS = ["wink", "look-around"];
    const trick = () => {
      if (!this.isOpen && !document.hidden && !this.node.classList.contains("thinking")) {
        const name = TRICKS[Math.floor(Math.random() * TRICKS.length)];
        this.node.classList.add(`trick-${name}`);
        setTimeout(() => this.node.classList.remove(`trick-${name}`), 1600);
      }
      this.#trickTimer = setTimeout(trick, 9000 + Math.random() * 7000);
    };
    this.#trickTimer = setTimeout(trick, 6000);
    this.bot.addEventListener("click", () => {
      this.node.classList.remove("splash");
      void this.node.offsetWidth;
      this.node.classList.add("splash");
    });
  }

  #trickTimer = 0;
  #talkTimer = 0;

  destroy() {
    clearTimeout(this.#trickTimer);
    clearTimeout(this.#talkTimer);
    clearTimeout(this.#sayTimer);
    this.#offs.forEach((off) => off());
    this.node.remove();
  }
}
