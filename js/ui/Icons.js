// Inline SVG icons (24x24 stroke). Used with icon("name").
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  history: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  brain: '<path d="M9.5 3A2.5 2.5 0 0 0 7 5.5v.2A3 3 0 0 0 4.5 9a3 3 0 0 0 .4 1.5A3 3 0 0 0 4 13a3 3 0 0 0 2 2.8V16a3 3 0 0 0 3 3 2.5 2.5 0 0 0 3-.5V5.5A2.5 2.5 0 0 0 9.5 3z"/><path d="M14.5 3A2.5 2.5 0 0 1 17 5.5v.2A3 3 0 0 1 19.5 9a3 3 0 0 1-.4 1.5A3 3 0 0 1 20 13a3 3 0 0 1-2 2.8V16a3 3 0 0 1-3 3 2.5 2.5 0 0 1-3-.5"/><path d="M9 8.5c1 0 1.5.5 1.5 1.5M15 8.5c-1 0-1.5.5-1.5 1.5M8.5 13.5c1 0 1.5.6 1.5 1.5M15.5 13.5c-1 0-1.5.6-1.5 1.5"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  bluetooth: '<path d="m7 7 10 10-5 5V2l5 5L7 17"/>',
  profiles: '<path d="M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  drop: '<path d="M12 2.7s-7 7.6-7 12.3a7 7 0 0 0 14 0c0-4.7-7-12.3-7-12.3z"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  error: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill="currentColor"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M1.5 21a7.5 7.5 0 0 1 15 0"/><path d="M16 3.5a4 4 0 0 1 0 8M19 14.5a7.5 7.5 0 0 1 3.5 6.5"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  play: '<path d="m6 4 14 8-14 8z"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7 15h10"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  cup: '<path d="M5 8h14l-1.5 12a2 2 0 0 1-2 1.8h-7a2 2 0 0 1-2-1.8z"/><path d="M5 8 4 4h16l-1 4"/><path d="M8 13c2 1.5 6 1.5 8 0"/>',
  pool: '<path d="M8 20V5a2 2 0 0 1 4 0M16 20V5a2 2 0 0 0-4 0"/><path d="M8 9h8M8 14h8"/><path d="M2 20c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/>',
  fish: '<path d="M6.5 12c3-5 9-6 14-0-5 6-11 5-14 0z"/><path d="M6.5 12 2 8v8z"/><circle cx="16" cy="11" r="1" fill="currentColor"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 4 13C4 7 9 3 20 3c0 11-4 16-9 17z"/><path d="M4 21c4-6 8-9 12-11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  usb: '<circle cx="12" cy="20" r="2"/><path d="M12 18V3M9 6l3-3 3 3M7 12v2l5 3M17 10v3l-5 3"/><rect x="15.5" y="8" width="3" height="2"/><circle cx="7" cy="11" r="1.2"/>',
  thermometer: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 7h7M9 11h5"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
};

export function icon(name, cls = "") {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;
}

let logoSeq = 0;

export function logo(cls = "brand-logo") {
  const id = `logoG${++logoSeq}`;
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ee7ff"/><stop offset="1" stop-color="#1e6dff"/></linearGradient>
    </defs>
    <path d="M32 4C32 4 12 28 12 40a20 20 0 0 0 40 0C52 28 32 4 32 4z" fill="url(#${id})" opacity=".95"/>
    <path d="M32 14C32 14 20 30 20 40a12 12 0 0 0 4 9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M17 46c5 4 10 4 15 0s10-4 15 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>
  </svg>`;
}

export function brainHolo() {
  return `<svg class="brain" viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
    <path d="M58 12c-6-6-18-5-21 4-8-1-14 6-12 13-7 3-9 12-4 18-4 6-1 15 7 16 1 8 10 13 17 9 4 6 12 5 13-1"/>
    <path d="M62 12c6-6 18-5 21 4 8-1 14 6 12 13 7 3 9 12 4 18 4 6 1 15-7 16-1 8-10 13-17 9-4 6-12 5-13-1"/>
    <path d="M60 10v70" opacity=".6"/>
    <path d="M37 16c4 3 5 8 3 12M25 29c6 0 10 4 10 9M21 47c5-2 11 0 13 5M28 63c2-5 8-7 12-5M45 72c0-5 4-8 8-8" opacity=".85"/>
    <path d="M83 16c-4 3-5 8-3 12M95 29c-6 0-10 4-10 9M99 47c-5-2-11 0-13 5M92 63c-2-5-8-7-12-5M75 72c0-5-4-8-8-8" opacity=".85"/>
    <g fill="currentColor" stroke="none"><circle cx="40" cy="28" r="2.2"/><circle cx="35" cy="38" r="2.2"/><circle cx="34" cy="52" r="2.2"/><circle cx="80" cy="28" r="2.2"/><circle cx="85" cy="38" r="2.2"/><circle cx="86" cy="52" r="2.2"/><circle cx="53" cy="64" r="2.2"/><circle cx="67" cy="64" r="2.2"/></g>
  </svg>`;
}

export const PROFILE_ICONS = { GENERAL: "globe", DRINKING: "cup", POOL: "pool", AQUARIUM: "fish", IRRIGATION: "leaf", CUSTOM: "profiles" };
