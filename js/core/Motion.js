// Animations follow the system's "reduce motion" unless the person chose "Animaciones: siempre" on this device.
// The choice is per device (it is about this screen), so it also applies before signing in.
const KEY = "aquasense.motion";
const media = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

export function motionChoice() {
  try { return localStorage.getItem(KEY) === "always" ? "always" : "system"; } catch { return "system"; }
}

/** The operating system asks for less motion (in Windows: "Efectos de animación" off). */
export function systemReducesMotion() {
  return Boolean(media?.matches);
}

/** True when the app should keep still: the system asks for it and the person did not choose "siempre". */
export function reducedMotion() {
  return systemReducesMotion() && motionChoice() !== "always";
}

export function applyMotion() {
  document.documentElement.classList.toggle("motion-always", motionChoice() === "always");
}

export function setMotionChoice(choice) {
  try {
    if (choice === "always") localStorage.setItem(KEY, "always"); else localStorage.removeItem(KEY);
  } catch { /* private mode: it lasts this visit */ }
  applyMotion();
}
