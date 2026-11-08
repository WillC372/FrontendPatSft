import { countUp } from "./components.js";

const ARC = "M 49.29 190.71 A 100 100 0 1 1 190.71 190.71";
const LENGTH = 2 * Math.PI * 100 * 0.75;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Circular pH gauge (0-14) with an animated gradient arc and a counting number.
export function createGauge(host) {
  const ticks = Array.from({ length: 15 }, (_, i) => {
    const angle = (135 + (270 * i) / 14) * (Math.PI / 180);
    const r1 = 116;
    const r2 = i % 7 === 0 ? 106 : 110;
    return `<line x1="${120 + r1 * Math.cos(angle)}" y1="${120 + r1 * Math.sin(angle)}" x2="${120 + r2 * Math.cos(angle)}" y2="${120 + r2 * Math.sin(angle)}"/>`;
  }).join("");
  host.innerHTML = `
    <div class="gauge" role="img" aria-label="Indicador de pH">
      <svg viewBox="0 0 240 240">
        <defs>
          <linearGradient id="gaugeGradient" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="220" y2="0">
            <stop offset="0" stop-color="#1e6dff"/><stop offset=".55" stop-color="#22c7f0"/><stop offset="1" stop-color="#2fd27a"/>
          </linearGradient>
        </defs>
        <g class="gauge-ticks">${ticks}</g>
        <path class="gauge-track" d="${ARC}"/>
        <path class="gauge-value" d="${ARC}" stroke-dasharray="0 ${LENGTH}"/>
      </svg>
      <div class="gauge-center">
        <div class="gauge-number" data-number>--</div>
        <div class="gauge-unit">pH</div>
      </div>
    </div>`;
  const arc = host.querySelector(".gauge-value");
  const number = host.querySelector("[data-number]");
  const wrapper = host.querySelector(".gauge");
  let current = 0;
  let frame;

  function draw(fraction) {
    arc.setAttribute("stroke-dasharray", `${(LENGTH * fraction).toFixed(2)} ${LENGTH}`);
  }

  return {
    set(value) {
      if (value === null || value === undefined) {
        number.textContent = "--";
        draw(0);
        return;
      }
      const target = Math.max(0, Math.min(14, value)) / 14;
      wrapper.setAttribute("aria-label", `pH ${value.toFixed(2)}`);
      countUp(number, value, { decimals: 2, duration: 1000 });
      cancelAnimationFrame(frame);
      if (reduced()) {
        current = target;
        draw(target);
        return;
      }
      const from = current;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1100);
        const eased = 1 - Math.pow(1 - p, 4);
        current = from + (target - from) * eased;
        draw(current);
        if (p < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
    destroy() { cancelAnimationFrame(frame); },
  };
}

export function phScale(ph, idealMin, idealMax) {
  const pos = (v) => `${(Math.max(0, Math.min(14, v)) / 14) * 100}%`;
  const band = idealMin !== undefined
    ? `<div class="ph-scale-band" style="left:${pos(idealMin)};width:calc(${pos(idealMax)} - ${pos(idealMin)})" title="Rango recomendado"></div>` : "";
  return `
    <div class="ph-scale" aria-label="Escala de pH">
      <div class="ph-scale-bar"></div>${band}
      ${ph !== null && ph !== undefined ? `<div class="ph-scale-marker" style="left:${pos(ph)}"></div>` : ""}
      <div class="ph-scale-labels"><span>0</span><span>Ácida</span><span>7</span><span>Alcalina</span><span>14</span></div>
    </div>`;
}
