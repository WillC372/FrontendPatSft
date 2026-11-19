import { bus } from "./EventBus.js";

const KEY = "aquasense.theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

export const theme = {
  get preference() {
    try { return localStorage.getItem(KEY) || "LIGHT"; } catch { return "LIGHT"; }
  },

  apply(preference = this.preference) {
    try { localStorage.setItem(KEY, preference); } catch { /* ignore */ }
    const dark = preference === "DARK" || (preference === "AUTO" && media.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    // The browser's own bar (on phones) takes the same background.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a0a0a" : "#eaf3fc");
    bus.emit("theme:changed", preference);
  },
};

media.addEventListener("change", () => { if (theme.preference === "AUTO") theme.apply("AUTO"); });
