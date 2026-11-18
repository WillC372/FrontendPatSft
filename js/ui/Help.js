import { icon } from "./Icons.js";

// "¿Para qué sirve?" boxes: a plain explanation with examples at the top of a screen. Open the first time; once the
// person closes it, it stays closed (only in this browser) and can be opened again by tapping its title.

const KEY = (id) => `aquasense.help.${id}`;

function wasClosed(id) {
  try { return localStorage.getItem(KEY(id)) === "closed"; } catch { return false; }
}

/** items: [iconName, title, text] */
export function helpBox(id, title, items) {
  return `<details class="help-box reveal" data-help="${id}" ${wasClosed(id) ? "" : "open"}>
    <summary>${icon("info")}<span>${title}</span>${icon("chevronRight", "help-chev")}</summary>
    <ul>${items.map(([ic, head, text]) => `<li>${icon(ic)}<div><strong>${head}</strong><p>${text}</p></div></li>`).join("")}</ul>
    <button type="button" class="btn btn-sm btn-ghost" data-help-ok>${icon("check")}Entendido</button>
  </details>`;
}

/** Remembers when the person closes the box. Call after the markup is in the page. */
export function bindHelp(root) {
  root.querySelectorAll("[data-help]").forEach((box) => {
    box.querySelector("[data-help-ok]")?.addEventListener("click", () => { box.open = false; });
    box.addEventListener("toggle", () => {
      try { localStorage.setItem(KEY(box.dataset.help), box.open ? "open" : "closed"); } catch { /* private mode */ }
    });
  });
}
