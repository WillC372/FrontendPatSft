// The siren is a WAV file made in the browser, played like a video so phones sound it (H-057).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sirenWav } from "../js/core/AlarmSound.js";

test("the siren is a valid 16-bit mono WAV of the asked length", () => {
  const view = new DataView(sirenWav(2, 8000));
  const text = (o, n) => String.fromCharCode(...Array.from({ length: n }, (_, i) => view.getUint8(o + i)));
  assert.equal(text(0, 4), "RIFF");
  assert.equal(text(8, 4), "WAVE");
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 8000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 2 * 8000 * 2);
});

test("it is loud and alternates two tones", () => {
  const rate = 8000;
  const view = new DataView(sirenWav(0.8, rate));
  const samples = (from, to) => Array.from({ length: to - from }, (_, i) => view.getInt16(44 + (from + i) * 2, true));
  const crossings = (s) => s.slice(1).filter((v, i) => (v >= 0) !== (s[i] >= 0)).length;
  const first = samples(0.05 * rate, 0.35 * rate);
  const second = samples(0.45 * rate, 0.75 * rate);
  assert.ok(Math.max(...first.map(Math.abs)) > 15000, "loud enough");
  assert.ok(crossings(first) > crossings(second), "the first tone is higher than the second");
});
