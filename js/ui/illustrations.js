export function beaker() {
  return `<svg class="beaker" viewBox="0 0 220 240" aria-hidden="true">
    <defs>
      <linearGradient id="bkWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c7f0" stop-opacity=".75"/><stop offset="1" stop-color="#1e6dff" stop-opacity=".55"/></linearGradient>
      <linearGradient id="bkGlass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9fe8ff" stop-opacity=".25"/><stop offset=".5" stop-color="#9fe8ff" stop-opacity=".05"/><stop offset="1" stop-color="#9fe8ff" stop-opacity=".25"/></linearGradient>
    </defs>
    <ellipse cx="110" cy="226" rx="80" ry="10" fill="#22c7f0" opacity=".25"/>
    <path d="M45 70h130v140a14 14 0 0 1-14 14H59a14 14 0 0 1-14-14z" fill="url(#bkGlass)" stroke="#7fdcff" stroke-opacity=".7" stroke-width="2.5"/>
    <path d="M47 130c20-8 40 8 63 0s43-8 63 0v80a12 12 0 0 1-12 12H59a12 12 0 0 1-12-12z" fill="url(#bkWater)"/>
    <circle class="b-bubble" cx="80" cy="200" r="4" fill="#c8f6ff" opacity=".8"/>
    <circle class="b-bubble" cx="140" cy="205" r="3" fill="#c8f6ff" opacity=".8"/>
    <circle class="b-bubble" cx="112" cy="210" r="5" fill="#c8f6ff" opacity=".7"/>
    <g class="probe" style="transform-origin:120px 40px">
      <rect x="106" y="8" width="34" height="96" rx="12" fill="#0e2b55" stroke="#7fdcff" stroke-width="2"/>
      <rect x="112" y="22" width="22" height="30" rx="4" fill="#06152e" stroke="#22c7f0"/>
      <text x="123" y="42" text-anchor="middle" font-family="Exo 2, sans-serif" font-size="11" font-weight="700" fill="#5ee7ff">pH</text>
      <rect x="116" y="104" width="14" height="88" rx="6" fill="#cfd8e3" opacity=".85"/>
      <circle cx="123" cy="194" r="9" fill="#9fb4c8"/>
    </g>
  </svg>`;
}

export function flask() {
  return `<svg class="flask" viewBox="0 0 120 140" aria-hidden="true">
    <defs><linearGradient id="flLiquid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c7f0"/><stop offset="1" stop-color="#1e6dff"/></linearGradient></defs>
    <path d="M45 10h30M50 10v40L18 112a12 12 0 0 0 10 18h64a12 12 0 0 0 10-18L70 50V10" fill="none" stroke="#7fdcff" stroke-width="3" stroke-linejoin="round"/>
    <path class="liquid" d="M33 86c12-6 22 6 34 0s18-6 24 0l11 26a10 10 0 0 1-9 14H28a10 10 0 0 1-9-14z" fill="url(#flLiquid)" opacity=".85"/>
    <circle class="bubble-dot" cx="52" cy="112" r="4" fill="#c8f6ff"/>
    <circle class="bubble-dot" cx="68" cy="116" r="3" fill="#c8f6ff"/>
    <circle class="bubble-dot" cx="60" cy="108" r="2.5" fill="#c8f6ff"/>
  </svg>`;
}
