import { LOCALE } from "./Locale.js";
// Dose calculator: how much product to add to a volume of water to go from the current value to the desired one.
// pH changes use the carbonate system of the water (it depends on the total alkalinity), the others are mass balances.
// Results are estimates: the app always asks to add a part first, wait with the water circulating and measure again.

// Carbonic acid constants at 25 °C and ion product of water.
const K1 = 10 ** -6.35;
const K2 = 10 ** -10.33;
const KW = 1e-14;

const fractions = (h) => {
  const d = h * h + K1 * h + K1 * K2;
  return { a1: (K1 * h) / d, a2: (K1 * K2) / d };
};

/** Alkalinity (eq/L) of water with total carbonate ct (mol/L) at pH. */
function alkalinityAt(ct, ph) {
  const h = 10 ** -ph;
  const { a1, a2 } = fractions(h);
  return ct * (a1 + 2 * a2) + KW / h - h;
}

/** pH of water with total carbonate ct (mol/L) and alkalinity alk (eq/L), by bisection. */
export function phOf(ct, alk) {
  let lo = 2;
  let hi = 12;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (alkalinityAt(ct, mid) > alk) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Carbonate state of the water. Total alkalinity is given as mg/L CaCO3; cyanuric acid adds alkalinity that is not
 * carbonate (about a third of its concentration at pool pH), so it is subtracted.
 */
export function carbonateState(ph, totalAlkalinity, cyanuricAcid = 0) {
  const carbonateAlk = Math.max(totalAlkalinity - (cyanuricAcid || 0) / 3, 1);
  const alk = carbonateAlk / 50000;
  const h = 10 ** -ph;
  const { a1, a2 } = fractions(h);
  const ct = (alk - KW / h + h) / (a1 + 2 * a2);
  return { ct, alk };
}

/** Acid (equivalents per liter) needed to lower the pH from `from` to `to` (the total carbonate does not change). */
export function acidToLowerPh(from, to, totalAlkalinity, cyanuricAcid) {
  const { ct, alk } = carbonateState(from, totalAlkalinity, cyanuricAcid);
  return Math.max(0, alk - alkalinityAt(ct, to));
}

/** Sodium carbonate (mol per liter) needed to raise the pH from `from` to `to`: it adds carbonate and two equivalents. */
export function sodaAshToRaisePh(from, to, totalAlkalinity, cyanuricAcid) {
  const { ct, alk } = carbonateState(from, totalAlkalinity, cyanuricAcid);
  if (to <= from) return 0;
  let lo = 0;
  let hi = 0.05;
  for (let i = 0; i < 80; i++) {
    const x = (lo + hi) / 2;
    if (phOf(ct + x, alk + 2 * x) < to) lo = x; else hi = x;
  }
  return (lo + hi) / 2;
}

// Products: concentration and what one unit does. Molar masses in g/mol.
export const PRODUCTS = {
  MURIATIC_ACID: { label: "Ácido muriático 31,45 %", unit: "mL", treatment: "MURIATIC_ACID" },
  SODIUM_BISULFATE: { label: "Bisulfato de sodio (93 %)", unit: "g", treatment: "SODIUM_BISULFATE" },
  SODA_ASH: { label: "Carbonato de sodio (sube pH)", unit: "g", treatment: "SODA_ASH" },
  LIQUID_CHLORINE_10: { label: "Cloro líquido 10 % (piscinas)", unit: "mL", treatment: "LIQUID_CHLORINE", strength: 10 },
  LIQUID_CHLORINE_5: { label: "Blanqueador casero 5 %", unit: "mL", treatment: "LIQUID_CHLORINE", strength: 5 },
  CAL_HYPO: { label: "Hipoclorito de calcio 65 % (granulado)", unit: "g", treatment: "CAL_HYPO", strength: 65 },
  DICHLOR: { label: "Dicloro 56 % (estabilizado)", unit: "g", treatment: "DICHLOR", strength: 56 },
  TRICHLOR: { label: "Tricloro 90 % (pastillas o granulado)", unit: "g", treatment: "TRICHLOR", strength: 90 },
  SODIUM_BICARBONATE: { label: "Bicarbonato de sodio", unit: "g", treatment: "SODIUM_BICARBONATE" },
  CALCIUM_CHLORIDE: { label: "Cloruro de calcio en escamas (77 %)", unit: "g", treatment: "CALCIUM_CHLORIDE" },
  CYANURIC_ACID: { label: "Ácido cianúrico (estabilizador)", unit: "g", treatment: "CYANURIC_ACID" },
};

// What can be adjusted, which value it moves and which products do it.
export const GOALS = {
  PH_DOWN: { label: "Bajar el pH", param: "ph", products: ["MURIATIC_ACID", "SODIUM_BISULFATE"], needsAlkalinity: true },
  PH_UP: { label: "Subir el pH", param: "ph", products: ["SODA_ASH"], needsAlkalinity: true },
  CHLORINE_UP: { label: "Subir el cloro libre", param: "freeChlorine", products: ["LIQUID_CHLORINE_10", "LIQUID_CHLORINE_5", "CAL_HYPO", "DICHLOR", "TRICHLOR"] },
  ALKALINITY_UP: { label: "Subir la alcalinidad", param: "totalAlkalinity", products: ["SODIUM_BICARBONATE"] },
  ALKALINITY_DOWN: { label: "Bajar la alcalinidad", param: "totalAlkalinity", products: ["MURIATIC_ACID"] },
  HARDNESS_UP: { label: "Subir la dureza cálcica", param: "calciumHardness", products: ["CALCIUM_CHLORIDE"] },
  CYA_UP: { label: "Subir el estabilizador (ácido cianúrico)", param: "cyanuricAcid", products: ["CYANURIC_ACID"] },
};

const MURIATIC_MOL_PER_L = 10.0; // 31.45 % HCl, density 1.16
const BISULFATE_G_PER_EQ = 120.06 / 0.93;
const SODA_ASH_G_PER_MOL = 105.99;

/**
 * Amount of `productKey` for `volumeL` liters to go from `current` to `target`.
 * `water` carries the total alkalinity and cyanuric acid (mg/L), needed for pH. Returns { amount, unit, notes[] } or
 * { error } when the request does not make sense.
 */
export function dose({ goal, productKey, volumeL, current, target, totalAlkalinity, cyanuricAcid = 0 }) {
  const g = GOALS[goal];
  const product = PRODUCTS[productKey];
  if (!g || !product || !g.products.includes(productKey)) return { error: "Elige qué quieres ajustar y con qué producto." };
  if (!(volumeL > 0)) return { error: "Escribe el volumen del agua." };
  if (!Number.isFinite(current) || !Number.isFinite(target)) return { error: "Escribe el valor actual y el que quieres." };
  const up = !goal.endsWith("_DOWN");
  if (up ? target <= current : target >= current) {
    return { error: up ? "El valor deseado debe ser mayor que el actual." : "El valor deseado debe ser menor que el actual." };
  }
  const notes = [];
  let amount;
  if (g.param === "ph") {
    if (current < 0 || current > 14 || target < 0 || target > 14) return { error: "El pH va de 0 a 14." };
    if (!(totalAlkalinity > 0)) return { error: "Para el pH hace falta la alcalinidad total (mg/L). Mídela o escribe un valor aproximado." };
    if (Math.abs(target - current) > 1) notes.push("Es un cambio grande: hazlo en varios días, de 0,2 a 0,3 de pH cada vez.");
    if (goal === "PH_DOWN") {
      const eq = acidToLowerPh(current, target, totalAlkalinity, cyanuricAcid) * volumeL;
      amount = productKey === "MURIATIC_ACID" ? (eq / MURIATIC_MOL_PER_L) * 1000 : eq * BISULFATE_G_PER_EQ;
      notes.push("El ácido también baja la alcalinidad.");
    } else {
      amount = sodaAshToRaisePh(current, target, totalAlkalinity, cyanuricAcid) * volumeL * SODA_ASH_G_PER_MOL;
      notes.push("El carbonato también sube la alcalinidad.");
    }
  } else {
    const delta = target - current; // mg/L
    const mg = Math.abs(delta) * volumeL;
    switch (productKey) {
      case "LIQUID_CHLORINE_10":
      case "LIQUID_CHLORINE_5":
        amount = mg / (product.strength * 10);
        break;
      case "CAL_HYPO":
        amount = mg / 1000 / 0.65;
        notes.push("Sube un poco la dureza cálcica.");
        break;
      case "DICHLOR":
        amount = mg / 1000 / 0.56;
        notes.push(`También sube el ácido cianúrico unos ${(delta * 0.9).toFixed(1)} mg/L.`);
        break;
      case "TRICHLOR":
        amount = mg / 1000 / 0.9;
        notes.push(`También sube el ácido cianúrico unos ${(delta * 0.6).toFixed(1)} mg/L y baja un poco el pH.`);
        break;
      case "SODIUM_BICARBONATE":
        amount = (mg * 1.68) / 1000;
        notes.push("Sube un poco el pH.");
        break;
      case "MURIATIC_ACID":
        amount = (mg / 50000 / MURIATIC_MOL_PER_L) * 1000;
        notes.push("También baja el pH: después súbelo con aireación (bomba, cascadas) más que con productos.");
        break;
      case "CALCIUM_CHLORIDE":
        amount = (mg * 1.47) / 1000;
        break;
      case "CYANURIC_ACID":
        amount = mg / 1000;
        notes.push("Se disuelve lento: ponlo en el skimmer o disuelto en un balde, nunca directo sobre el fondo.");
        break;
      default:
        return { error: "Producto no soportado." };
    }
  }
  return { amount, unit: product.unit, notes };
}

/** "1,25 kg", "350 g", "2,4 L", "35 mL". */
export function amountText(amount, unit) {
  const n = (v, d) => v.toLocaleString(LOCALE, { maximumFractionDigits: d });
  if (unit === "g") return amount >= 1000 ? `${n(amount / 1000, 2)} kg` : `${n(amount, amount < 10 ? 1 : 0)} g`;
  if (unit === "mL") return amount >= 1000 ? `${n(amount / 1000, 2)} L` : `${n(amount, amount < 10 ? 1 : 0)} mL`;
  return `${n(amount, 2)} ${unit}`;
}
