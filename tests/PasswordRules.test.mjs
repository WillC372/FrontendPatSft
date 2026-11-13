import test from "node:test";
import assert from "node:assert/strict";
import { checkPassword } from "../js/core/PasswordRules.js";

const ok = (p) => Object.fromEntries(checkPassword(p).map((r) => [r.id, r.ok]));

test("a valid password meets every rule", () => {
  assert.deepEqual(ok("Clave1234"), { length: true, letter: true, number: true });
});

test("each missing rule is reported", () => {
  assert.deepEqual(ok("corta1"), { length: false, letter: true, number: true });
  assert.deepEqual(ok("12345678"), { length: true, letter: false, number: true });
  assert.deepEqual(ok("soloLetras"), { length: true, letter: true, number: false });
  assert.equal(ok("a1".repeat(37)).length, false);
  assert.deepEqual(ok(undefined), { length: false, letter: false, number: false });
});
