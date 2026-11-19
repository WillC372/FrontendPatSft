// Three animation switches, chosen per device in Configuración → Apariencia (they are about this screen, so they also
// apply before signing in):
//   water: the waves of the sign-in screen and of the pH indicator (on unless switched off),
//   drop:  Aqua (hops, turns, gestures, blinking) and the drop of the logo (on unless switched off),
//   other: transitions of screens and panels, charts that draw themselves, numbers that count (by default it follows
//          the system's "reduce motion"; in Windows, "Efectos de animación").
const KEYS = { water: "aquasense.motion.water", drop: "aquasense.motion.drop", other: "aquasense.motion" };
const media = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

const read = (kind) => { try { return localStorage.getItem(KEYS[kind]); } catch { return null; } };

/** The operating system asks for less motion. */
export function systemReducesMotion() {
  return Boolean(media?.matches);
}

export function waterMotion() { return read("water") !== "off"; }
export function dropMotion() { return read("drop") !== "off"; }
export function otherMotion() {
  const v = read("other");
  if (v === "always") return true;
  if (v === "off") return false;
  return !systemReducesMotion();
}

/** The rest of the app should keep still (transitions, charts, counters). */
export function reducedMotion() {
  return !otherMotion();
}

export function applyMotion() {
  const root = document.documentElement;
  const other = read("other");
  root.classList.toggle("motion-always", other === "always");
  root.classList.toggle("motion-off", other === "off");
  root.classList.toggle("drop-off", !dropMotion());
}

/** Turns one kind on or off on this device. */
export function setMotion(kind, on) {
  try {
    if (kind === "other") localStorage.setItem(KEYS.other, on ? "always" : "off");
    else if (on) localStorage.removeItem(KEYS[kind]); else localStorage.setItem(KEYS[kind], "off");
  } catch { /* private mode: it lasts this visit */ }
  applyMotion();
}
