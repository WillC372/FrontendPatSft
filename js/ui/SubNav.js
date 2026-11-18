import { icon } from "./Icons.js";

// Screens that live inside another one of the bar: a row of links at the top moves between them.
// [route, label, icon]
export const PLACES_NAV = [["places", "Mis lugares", "pin"], ["profiles", "Perfiles de uso", "profiles"]];
export const SETTINGS_NAV = [["settings", "Ajustes", "settings"], ["devices", "Medidor", "bluetooth"], ["sessions", "Actividad", "clock"]];
export const LIBRARY_NAV = [["intelligence/library", "Normas", "book"], ["official", "Datos oficiales", "globe"]];

/** Which tab of the bar is lit on a screen that lives inside another one. */
export const PARENT_TAB = { profiles: "places", devices: "settings", sessions: "settings" };

export function subNav(current, items, label = "Secciones") {
  return `<nav class="subnav reveal" aria-label="${label}">${items.map(([route, text, ic]) => {
    const on = route === current;
    return `<a href="#/${route}" class="${on ? "active" : ""}"${on ? ' aria-current="page"' : ""}>${icon(ic)}<span>${text}</span></a>`;
  }).join("")}</nav>`;
}
