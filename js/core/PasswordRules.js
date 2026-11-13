// Password rules, the same the server applies (8 to 72 characters, at least one letter and one number), without DOM.

export const PASSWORD_RULES = [
  { id: "length", text: "Entre 8 y 72 caracteres", test: (p) => p.length >= 8 && p.length <= 72 },
  { id: "letter", text: "Al menos una letra", test: (p) => /[A-Za-z]/.test(p) },
  { id: "number", text: "Al menos un número", test: (p) => /\d/.test(p) },
];

/** Which rules a password meets: [{ id, text, ok }]. */
export function checkPassword(password) {
  const value = String(password ?? "");
  return PASSWORD_RULES.map((r) => ({ id: r.id, text: r.text, ok: r.test(value) }));
}
