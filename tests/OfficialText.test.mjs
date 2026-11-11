import test from "node:test";
import assert from "node:assert/strict";
import { approval, band, num } from "../js/views/OfficialText.js";

test("pH values use one decimal with a decimal comma", () => {
  assert.equal(num(7.25), "7,3");
  assert.equal(num(8), "8,0");
  assert.equal(num("6.9"), "6,9");
  assert.equal(num(null), "--");
  assert.equal(num("n/d"), "--");
});

test("stations are grouped against the 6.5 to 8.5 reference band, limits included", () => {
  assert.equal(band(4.9).text, "Bajo 6,5");
  assert.equal(band(6.5).text, "Entre 6,5 y 8,5");
  assert.equal(band(8.5).text, "Entre 6,5 y 8,5");
  assert.equal(band(8.6).text, "Sobre 8,5");
  assert.equal(band(null).text, "Sin dato");
  assert.equal(band(9.1).cls, "badge-warn");
});

test("USGS review status in Spanish", () => {
  assert.equal(approval("Approved"), "Aprobado por el USGS");
  assert.equal(approval("Provisional"), "Provisional (sujeto a revisión del USGS)");
  assert.equal(approval("Estimated"), "Estimated");
  assert.equal(approval(null), "");
});
