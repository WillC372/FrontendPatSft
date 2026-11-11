// Readable texts of the official data (USGS), without DOM.

/** Reference band used to group stations (U.S. EPA secondary drinking water standard). */
export const LOW = 6.5;
export const HIGH = 8.5;

/** One decimal with a decimal comma, as the USGS reports pH; "--" without a value. */
export function num(value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "--";
  return Number(value).toFixed(1).replace(".", ",");
}

/** Badge class and text of a pH value against the reference band. */
export function band(ph) {
  if (ph === null || ph === undefined || Number.isNaN(Number(ph))) return { cls: "badge-info", text: "Sin dato" };
  if (Number(ph) < LOW) return { cls: "badge-warn", text: "Bajo 6,5" };
  if (Number(ph) > HIGH) return { cls: "badge-warn", text: "Sobre 8,5" };
  return { cls: "badge-ok", text: "Entre 6,5 y 8,5" };
}

/** Review status of a USGS value, in Spanish (plain text: the caller escapes it). */
export function approval(status) {
  if (status === "Approved") return "Aprobado por el USGS";
  if (status === "Provisional") return "Provisional (sujeto a revisión del USGS)";
  return status || "";
}
