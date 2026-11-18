// Aqua, the water-drop robot that represents the AI of Aqua Assistant.
let seq = 0;

export function aquaFace(cls = "") {
  const id = `aquaG${++seq}`;
  return `<svg class="aqua-face ${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#3fb4ff"/><stop offset="1" stop-color="#0a6fd6"/></linearGradient></defs>
    <g class="aqua-antenna"><line x1="60" y1="14" x2="60" y2="4" stroke="#0a6fd6" stroke-width="3"/><circle cx="60" cy="5" r="5" fill="#9fe7ff" stroke="#0a6fd6" stroke-width="2"/></g>
    <path d="M60 14 C82 40 96 56 96 74 a36 36 0 0 1 -72 0 C24 56 38 40 60 14Z" fill="url(#${id})"/>
    <ellipse cx="60" cy="76" rx="25" ry="19" fill="#eaf7ff"/>
    <ellipse class="aqua-eye" cx="51" cy="74" rx="5" ry="7" fill="#0d2338"/><ellipse class="aqua-eye" cx="69" cy="74" rx="5" ry="7" fill="#0d2338"/>
    <circle cx="53" cy="71" r="1.8" fill="#fff"/><circle cx="71" cy="71" r="1.8" fill="#fff"/>
    <path class="aqua-mouth" d="M53 85 q7 6 14 0" stroke="#0d2338" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="42" cy="84" r="3.5" fill="#ffb3c1" opacity=".8"/><circle cx="78" cy="84" r="3.5" fill="#ffb3c1" opacity=".8"/>
    <ellipse cx="40" cy="44" rx="5" ry="9" fill="#ffffff" opacity=".45" transform="rotate(25 40 44)"/>
  </svg>`;
}
