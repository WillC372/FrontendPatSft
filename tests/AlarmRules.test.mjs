import { test } from "node:test";
import assert from "node:assert/strict";
import { alarmSpeech, alarmsToSound, FRESH_MS } from "../js/core/AlarmRules.js";

const now = Date.parse("2026-11-19T15:00:00Z");
const alert = (id, minutesAgo, extra = {}) => ({ id, kind: "PH_ALTERATION", read: false, severity: "CRITICAL",
  createdAt: new Date(now - minutesAgo * 60000).toISOString(), ...extra });

test("solo suenan las alteraciones nuevas, sin leer y no vistas, la más reciente primero", () => {
  const list = [alert(1, 5), alert(2, 1), alert(3, 2, { read: true }), alert(4, 1, { kind: "OUT_OF_RANGE" }), alert(5, 3)];
  assert.deepEqual(alarmsToSound(list, new Set([5]), now).map((a) => a.id), [2, 1]);
});

test("una alteración de hace más de 15 minutos no suena al abrir la app", () => {
  assert.equal(alarmsToSound([alert(1, FRESH_MS / 60000 + 1)], new Set(), now).length, 0);
  assert.equal(alarmsToSound(null, new Set(), now).length, 0);
});

test("Aqua dice el título y luego el mensaje", () => {
  assert.equal(alarmSpeech("Alteración del pH en el agua", "El pH bajó de 7.50 a 5.20 en 3 minutos. Es peligroso."),
    "Alteración del pH en el agua. El pH bajó de 7.50 a 5.20 en 3 minutos. Es peligroso.");
});
