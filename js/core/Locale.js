// Language chosen in this browser, read once when the app opens (changing it reloads the page). Kept apart from
// I18n.js so the formatters can import it without loading the translator.
export const LANG_KEY = "aquasense.lang";

let saved = null;
try { saved = localStorage.getItem(LANG_KEY); } catch { /* private mode */ }

/** The languages of the app, with their name in their own language. */
export const LANGUAGES = [
  { code: "es", name: "Español" },
  { code: "en", name: "English", englishName: "English" },
  { code: "fr", name: "Français", englishName: "French" },
  { code: "de", name: "Deutsch", englishName: "German" },
  { code: "it", name: "Italiano", englishName: "Italian" },
  { code: "zh-Hans", name: "中文（简体）", englishName: "Chinese" },
  { code: "ja", name: "日本語", englishName: "Japanese" },
];
export const SUPPORTED = new Set(LANGUAGES.map((l) => l.code));

/** "es", "en", "fr", "de", "it", "zh-Hans" or "ja" (a language no longer offered goes back to Spanish). */
export const LANG = SUPPORTED.has(saved) ? saved : "es";
/** For dates and numbers: Spanish keeps the formats the app always used. */
export const LOCALE = LANG === "es" ? "es" : LANG;
export const LOCALE_CO = LANG === "es" ? "es-CO" : LANG;
export const IS_SPANISH = LANG === "es";
