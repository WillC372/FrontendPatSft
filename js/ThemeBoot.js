// Applies the saved theme before the styles paint, so the page does not flash in the wrong theme. It is a classic
// script (not a module) loaded synchronously in <head>, and it lives in a file so the security policy can forbid
// inline scripts.
try {
  var t = localStorage.getItem("aquasense.theme") || "DARK";
  var dark = t === "DARK" || (t === "AUTO" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
} catch (e) {}
