import { esc } from "../core/Format.js";
import { aquaFace } from "../ui/AquaFace.js";

let running = null;

export const tourRunning = () => Boolean(running);

/**
 * Guided tour: Aqua points at each part of the real screen with a speech bubble.
 * steps: [{ target: CSS selector or null (centered), title, text }]. Resolves when it ends or is skipped.
 */
export function startTour(steps) {
  running?.end();
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "tour";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "tour-title");
    overlay.setAttribute("aria-describedby", "tour-text");
    overlay.innerHTML = `<div class="tour-spot" aria-hidden="true"></div>
      <div class="tour-card">
        <span class="tour-arrow" aria-hidden="true"></span>
        <div class="tour-top">${aquaFace("tour-bot")}<div><small class="tour-count" data-count></small><h2 id="tour-title" data-title></h2></div></div>
        <p id="tour-text" data-text aria-live="polite"></p>
        <div class="tour-dots" aria-hidden="true">${steps.map(() => "<i></i>").join("")}</div>
        <div class="tour-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-skip>Saltar</button>
          <span style="flex:1"></span>
          <button type="button" class="btn btn-sm" data-back>Atrás</button>
          <button type="button" class="btn btn-primary btn-sm" data-next>Siguiente</button>
        </div>
      </div>`;
    document.body.append(overlay);
    const spot = overlay.querySelector(".tour-spot");
    const card = overlay.querySelector(".tour-card");
    const arrow = overlay.querySelector(".tour-arrow");
    let index = 0;

    const targetOf = (step) => {
      if (!step.target) return null;
      const el = document.querySelector(step.target);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width && r.height ? el : null;
    };

    const place = () => {
      const step = steps[index];
      const el = targetOf(step);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cw = Math.min(340, vw - 24);
      card.style.width = `${cw}px`;
      if (!el) {
        spot.hidden = true;
        arrow.hidden = true;
        card.style.left = `${(vw - cw) / 2}px`;
        card.style.top = `${Math.max(12, (vh - card.offsetHeight) / 2)}px`;
        return;
      }
      // The frame covers the element and whatever it draws outside its own box (the raised circle of "Medir").
      // Shapes inside a drawing count by the drawing's own box: theirs ignore the clipping (Aqua's water is wider).
      const r = [...el.querySelectorAll("*")].filter((child) => !child.parentElement?.closest("svg")).reduce((box, child) => {
        const c = child.getBoundingClientRect();
        if (!c.width || !c.height) return box;
        return { left: Math.min(box.left, c.left), top: Math.min(box.top, c.top), right: Math.max(box.right, c.right), bottom: Math.max(box.bottom, c.bottom) };
      }, (({ left, top, right, bottom }) => ({ left, top, right, bottom }))(el.getBoundingClientRect()));
      r.width = r.right - r.left;
      r.height = r.bottom - r.top;
      const pad = 6;
      spot.hidden = false;
      // The frame stays inside the screen, so its border is seen whole even around Aqua in the corner.
      const box = { left: Math.max(8, r.left - pad), top: Math.max(8, r.top - pad), right: Math.min(vw - 8, r.right + pad), bottom: Math.min(vh - 8, r.bottom + pad) };
      Object.assign(spot.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.right - box.left}px`, height: `${box.bottom - box.top}px` });
      const left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12);
      card.style.left = `${left}px`;
      const below = r.top + r.height / 2 < vh / 2;
      const top = below ? r.bottom + pad + 14 : r.top - pad - 14 - card.offsetHeight;
      card.style.top = `${Math.min(Math.max(12, top), vh - card.offsetHeight - 12)}px`;
      arrow.hidden = false;
      arrow.className = `tour-arrow ${below ? "up" : "down"}`;
      arrow.style.left = `${Math.min(Math.max(18, r.left + r.width / 2 - left), cw - 18)}px`;
    };

    let still = null;
    const show = (i) => {
      index = i;
      const step = steps[i];
      still?.classList.remove("tour-target");
      still = targetOf(step);
      still?.classList.add("tour-target");
      // A button hidden at the side of the sliding bar (phones) is brought into view before pointing at it.
      targetOf(step)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
      overlay.querySelector("[data-count]").textContent = `Paso ${i + 1} de ${steps.length}`;
      overlay.querySelector("[data-title]").textContent = step.title;
      overlay.querySelector("[data-text]").innerHTML = esc(step.text).replace(/«(.+?)»/g, "<strong>$1</strong>");
      overlay.querySelectorAll(".tour-dots i").forEach((dot, k) => dot.classList.toggle("on", k === i));
      overlay.querySelector("[data-back]").hidden = i === 0;
      const next = overlay.querySelector("[data-next]");
      next.textContent = i === steps.length - 1 ? "¡Listo!" : "Siguiente";
      card.classList.remove("tour-pop");
      void card.offsetWidth;
      card.classList.add("tour-pop");
      place();
      next.focus({ preventScroll: true });
    };

    const end = () => {
      if (running !== handle) return;
      running = null;
      still?.classList.remove("tour-target");
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      previous?.focus?.({ preventScroll: true });
      resolve();
    };
    const onKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); end(); return; }
      if (event.key === "ArrowRight") { event.preventDefault(); if (index < steps.length - 1) show(index + 1); else end(); return; }
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); show(index - 1); return; }
      if (event.key === "Tab") {
        // Focus stays on the buttons of the bubble while the tour is open.
        const items = [...card.querySelectorAll("button")].filter((b) => !b.hidden);
        const at = items.indexOf(document.activeElement);
        event.preventDefault();
        items[(at + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
      }
    };
    const handle = { end };
    running = handle;
    overlay.querySelector("[data-skip]").addEventListener("click", end);
    overlay.querySelector("[data-back]").addEventListener("click", () => show(Math.max(0, index - 1)));
    overlay.querySelector("[data-next]").addEventListener("click", () => (index < steps.length - 1 ? show(index + 1) : end()));
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey, true);
    show(0);
  });
}
