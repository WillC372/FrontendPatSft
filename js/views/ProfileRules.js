// Rules of a water profile, without DOM, shared by the form and the tests.

/**
 * The same rules the server applies, checked before sending so each wrong field is marked at once:
 * a name, values between 0 and 14, and caution min ≤ ideal min < ideal max ≤ caution max.
 */
export function rangeProblems(p) {
  const problems = {};
  if (!String(p.name || "").trim()) problems.name = "Escribe un nombre.";
  for (const key of ["cautionMin", "idealMin", "idealMax", "cautionMax"]) {
    const v = p[key];
    if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 14) problems[key] = "Escribe un valor entre 0 y 14.";
  }
  if (!problems.idealMin && !problems.idealMax && p.idealMin >= p.idealMax) problems.idealMax = "Debe ser mayor que el mínimo ideal.";
  if (!problems.cautionMin && !problems.idealMin && p.cautionMin > p.idealMin) problems.cautionMin = "No puede ser mayor que el mínimo ideal.";
  if (!problems.cautionMax && !problems.idealMax && p.cautionMax < p.idealMax) problems.cautionMax = "No puede ser menor que el máximo ideal.";
  return problems;
}
