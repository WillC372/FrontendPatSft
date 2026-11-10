// Protocols of the meters the browser can read over a serial port (USB, or Bluetooth paired as a serial port).
// The rules match the backend adapters (AquaSenseFirmwareAdapter, AtlasEzoPhAdapter and TextMeterParser).

export const PROTOCOLS = {
  TEXT_METER: { label: "Medidor de laboratorio que envía texto (USB o RS-232)", eol: "\r\n", calibrates: false },
  AQUASENSE_ESP32: { label: "Firmware AquaSense (ESP32)", eol: "\n", calibrates: true },
  ATLAS_EZO: { label: "Atlas Scientific EZO-pH", eol: "\r", calibrates: true },
};

export const BAUD_RATES = [9600, 4800, 2400, 1200, 19200, 38400, 57600, 115200];

const NUMBER = "([-+]?\\d{1,2}(?:[.,]\\d{1,3})?)";
const PH_BEFORE = new RegExp(`p\\s*h\\s*[:=]?\\s*${NUMBER}`, "i");
const PH_AFTER = new RegExp(`${NUMBER}\\s*p\\s*h\\b`, "i");
const TEMPERATURE = new RegExp(`(?:t(?:emp)?\\s*[:=]\\s*${NUMBER}|${NUMBER}\\s*(?:°|º|deg)?\\s*c\\b)`, "i");
const ANY_NUMBER = new RegExp(NUMBER, "g");
const toNumber = (raw) => Number.parseFloat(raw.replace(",", "."));
const round2 = (v) => Math.round(v * 100) / 100;

/** "pH 7.02  25.0 °C", "7.02 pH", "PH=6.98,T=24.8C" or a single number between 0 and 14. */
export function parseTextLine(line) {
  if (!line || !line.trim()) return null;
  let text = line.trim();
  let temperatureC = null;
  const t = TEMPERATURE.exec(text);
  if (t) {
    temperatureC = toNumber(t[1] ?? t[2]);
    text = text.slice(0, t.index) + " " + text.slice(t.index + t[0].length);
  }
  let ph = null;
  const before = PH_BEFORE.exec(text);
  const after = before ? null : PH_AFTER.exec(text);
  if (before) ph = toNumber(before[1]);
  else if (after) ph = toNumber(after[1]);
  else {
    const numbers = [...text.matchAll(ANY_NUMBER)];
    if (numbers.length === 1) ph = toNumber(numbers[0][1]);
  }
  if (ph === null || Number.isNaN(ph) || ph < 0 || ph > 14) return null;
  return { ph: round2(ph), temperatureC };
}

/** AquaSense firmware: "PH:7.12;T:24.5" or "PH:7.12;T:NA". */
export function parseFirmwareLine(line) {
  if (!line || !line.startsWith("PH:")) return null;
  let ph = null;
  let temperatureC = null;
  for (const part of line.trim().split(";")) {
    const [key, value] = part.split(":");
    if (key === "PH") ph = Number.parseFloat(value);
    if (key === "T" && value !== "NA") temperatureC = Number.parseFloat(value);
  }
  return ph === null || Number.isNaN(ph) ? null : { ph: round2(ph), temperatureC: Number.isNaN(temperatureC) ? null : temperatureC };
}

/** Atlas Scientific EZO-pH: the reading is a bare number such as "7.020"; "*OK" and "*ER" are status lines. */
export function parseAtlasLine(line) {
  const text = (line || "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const ph = Number.parseFloat(text);
  return ph >= 0 && ph <= 14 ? { ph: round2(ph), temperatureC: null } : null;
}

export const PARSERS = { TEXT_METER: parseTextLine, AQUASENSE_ESP32: parseFirmwareLine, ATLAS_EZO: parseAtlasLine };
