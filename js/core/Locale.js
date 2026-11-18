// Language chosen in this browser, read once when the app opens (changing it reloads the page). Kept apart from
// I18n.js so the formatters can import it without loading the translator.
export const LANG_KEY = "aquasense.lang";

let saved = null;
try { saved = localStorage.getItem(LANG_KEY); } catch { /* private mode */ }

/** "es", "en", "pt-BR"... */
export const LANG = saved || "es";
/** For dates and numbers: Spanish keeps the formats the app always used. */
export const LOCALE = LANG === "es" ? "es" : LANG;
export const LOCALE_CO = LANG === "es" ? "es-CO" : LANG;
export const IS_SPANISH = LANG === "es";
