import { test } from "node:test";
import assert from "node:assert/strict";
import { acidToLowerPh, amountText, carbonateState, dose, phOf } from "../js/core/DoseCalc.js";

const V = 37854; // 10 000 US gallons, the volume pool tables use
const close = (value, expected, tolerance) => assert.ok(Math.abs(value - expected) <= tolerance, `${value} not within ${tolerance} of ${expected}`);

test("the carbonate model gives back the pH it was built from", () => {
  const { ct, alk } = carbonateState(7.4, 100);
  close(phOf(ct, alk), 7.4, 0.001);
});

test("chlorine and other mass balances match the usual pool tables", () => {
  // 10 % liquid chlorine: about 13 fl oz (≈ 385 mL) per ppm per 10 000 gal.
  close(dose({ goal: "CHLORINE_UP", productKey: "LIQUID_CHLORINE_10", volumeL: V, current: 1, target: 3 }).amount, 757, 10);
  // Calcium hypochlorite 65 %: about 2 oz (≈ 58 g) per ppm per 10 000 gal.
  close(dose({ goal: "CHLORINE_UP", productKey: "CAL_HYPO", volumeL: V, current: 0, target: 1 }).amount, 58, 2);
  // Baking soda: 1.5 lb (680 g) raises alkalinity 10 ppm in 10 000 gal.
  close(dose({ goal: "ALKALINITY_UP", productKey: "SODIUM_BICARBONATE", volumeL: V, current: 80, target: 90 }).amount, 636, 60);
  // Cyanuric acid: about 13 oz (370 g) per 10 ppm per 10 000 gal.
  close(dose({ goal: "CYA_UP", productKey: "CYANURIC_ACID", volumeL: V, current: 0, target: 10 }).amount, 379, 15);
});

test("lowering the pH needs more acid when the alkalinity is higher", () => {
  const low = acidToLowerPh(7.8, 7.5, 60, 0);
  const high = acidToLowerPh(7.8, 7.5, 120, 0);
  assert.ok(high > low * 1.8);
  const r = dose({ goal: "PH_DOWN", productKey: "MURIATIC_ACID", volumeL: V, current: 7.8, target: 7.5, totalAlkalinity: 80 });
  assert.equal(r.unit, "mL");
  assert.ok(r.amount > 100 && r.amount < 400, `${r.amount}`);
});

test("raising the pH with soda ash also follows the alkalinity", () => {
  const a = dose({ goal: "PH_UP", productKey: "SODA_ASH", volumeL: V, current: 7.0, target: 7.5, totalAlkalinity: 80 });
  close(a.amount, 870, 60);
  assert.ok(a.notes.some((n) => n.includes("alcalinidad")));
});

test("requests that make no sense are explained", () => {
  assert.match(dose({ goal: "PH_DOWN", productKey: "MURIATIC_ACID", volumeL: V, current: 7.2, target: 7.6, totalAlkalinity: 80 }).error, /menor/);
  assert.match(dose({ goal: "PH_UP", productKey: "SODA_ASH", volumeL: V, current: 7.0, target: 7.4 }).error, /alcalinidad/);
  assert.match(dose({ goal: "CHLORINE_UP", productKey: "SODA_ASH", volumeL: V, current: 1, target: 3 }).error, /producto/);
  assert.match(dose({ goal: "CHLORINE_UP", productKey: "CAL_HYPO", volumeL: 0, current: 1, target: 3 }).error, /volumen/);
});

test("amounts are written in units people use", () => {
  assert.equal(amountText(1270, "g"), "1,27 kg");
  assert.equal(amountText(58.4, "g"), "58 g");
  assert.equal(amountText(757, "mL"), "757 mL");
  assert.equal(amountText(1510, "mL"), "1,51 L");
});
