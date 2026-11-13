import test from "node:test";
import assert from "node:assert/strict";
import { rangeProblems } from "../js/views/ProfileRules.js";

const ok = { name: "Estanque", cautionMin: 6.0, idealMin: 6.5, idealMax: 8.5, cautionMax: 9.0 };

test("a profile with ordered ranges has no problems, limits included", () => {
  assert.deepEqual(rangeProblems(ok), {});
  assert.deepEqual(rangeProblems({ ...ok, cautionMin: 6.5, cautionMax: 8.5 }), {});
});

test("each wrong field gets its own message", () => {
  assert.equal(rangeProblems({ ...ok, name: "  " }).name, "Escribe un nombre.");
  assert.equal(rangeProblems({ ...ok, idealMax: 6.5 }).idealMax, "Debe ser mayor que el mínimo ideal.");
  assert.equal(rangeProblems({ ...ok, cautionMin: 7 }).cautionMin, "No puede ser mayor que el mínimo ideal.");
  assert.equal(rangeProblems({ ...ok, cautionMax: 8 }).cautionMax, "No puede ser menor que el máximo ideal.");
});

test("values outside 0 to 14 or empty are rejected", () => {
  assert.equal(rangeProblems({ ...ok, idealMax: 15 }).idealMax, "Escribe un valor entre 0 y 14.");
  assert.equal(rangeProblems({ ...ok, cautionMin: Number.NaN }).cautionMin, "Escribe un valor entre 0 y 14.");
});
