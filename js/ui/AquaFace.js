// Aqua, the water-drop robot that represents the AI of Aqua Assistant.
// Inside the drop the water sways and bubbles rise; the pupils can follow the pointer (--look-x / --look-y), the mouth
// moves while Aqua talks and the antenna lights up while the AI works (classes set by AquaBot on a parent).
let seq = 0;

const DROP = "M60 14 C82 40 96 56 96 74 a36 36 0 0 1 -72 0 C24 56 38 40 60 14Z";

export function aquaFace(cls = "") {
  const n = ++seq;
  const g = `aquaG${n}`;
  const clip = `aquaC${n}`;
  return `<svg class="aqua-face ${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${g}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#3fb4ff"/><stop offset="1" stop-color="#0a6fd6"/></linearGradient>
      <clipPath id="${clip}"><path d="${DROP}"/></clipPath>
    </defs>
    <g class="aqua-antenna">
      <line x1="60" y1="14" x2="60" y2="4" stroke="#0a6fd6" stroke-width="3"/>
      <circle class="aqua-light" cx="60" cy="5" r="5" fill="#9fe7ff" stroke="#0a6fd6" stroke-width="2"/>
    </g>
    <g class="aqua-body">
      <path d="${DROP}" fill="url(#${g})"/>
      <g clip-path="url(#${clip})">
        <path class="aqua-wave aqua-wave-back" d="M-60 52 q15 -7 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V130 H-60Z" fill="#7fd3ff" opacity=".35"/>
        <path class="aqua-wave aqua-wave-front" d="M-60 58 q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V130 H-60Z" fill="#0757b8" opacity=".35"/>
        <g class="aqua-bubbles" fill="#ffffff">
          <circle class="aqua-bubble b1" cx="44" cy="62" r="2.2"/><circle class="aqua-bubble b2" cx="78" cy="66" r="1.6"/>
          <circle class="aqua-bubble b3" cx="62" cy="58" r="1.3"/><circle class="aqua-bubble b4" cx="36" cy="80" r="1.8"/>
        </g>
      </g>
      <ellipse cx="60" cy="76" rx="25" ry="19" fill="#eaf7ff"/>
      <g class="aqua-eyes">
        <g class="aqua-eye"><ellipse cx="51" cy="74" rx="5" ry="7" fill="#0d2338"/><circle cx="53" cy="71" r="1.8" fill="#fff"/></g>
        <g class="aqua-eye"><ellipse cx="69" cy="74" rx="5" ry="7" fill="#0d2338"/><circle cx="71" cy="71" r="1.8" fill="#fff"/></g>
      </g>
      <path class="aqua-mouth" d="M53 85 q7 6 14 0" stroke="#0d2338" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse class="aqua-mouth-open" cx="60" cy="86.5" rx="4.2" ry="3" fill="#0d2338"/>
      <circle cx="42" cy="84" r="3.5" fill="#ffb3c1" opacity=".8"/><circle cx="78" cy="84" r="3.5" fill="#ffb3c1" opacity=".8"/>
      <ellipse class="aqua-shine" cx="40" cy="44" rx="5" ry="9" fill="#ffffff" opacity=".45" transform="rotate(25 40 44)"/>
    </g>
  </svg>`;
}
