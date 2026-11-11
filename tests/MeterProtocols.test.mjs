import test from "node:test";
import assert from "node:assert/strict";
import { parseAtlasLine, parseFirmwareLine, parseTextLine, PARSERS, PROTOCOLS } from "../js/core/MeterProtocols.js";

// The same lines as the backend test (TextMeterParserTest): the browser and the server must read them alike.
test("laboratory meters: labelled and bare values, with or without temperature", () => {
  assert.deepEqual(parseTextLine("pH 7.02  25.0 °C"), { ph: 7.02, temperatureC: 25 });
  assert.equal(parseTextLine("7.02 pH").ph, 7.02);
  assert.deepEqual(parseTextLine("PH=6.98,T=24.8C"), { ph: 6.98, temperatureC: 24.8 });
  assert.equal(parseTextLine("PH:7.12;T:24.5").ph, 7.12);
  assert.equal(parseTextLine("07.40").ph, 7.4);
  assert.equal(parseTextLine("pH: 6,85").ph, 6.85);
  assert.equal(parseTextLine("  8.1 pH   21 C").temperatureC, 21);
});

test("laboratory meters: lines without a clear pH are not readings", () => {
  for (const line of ["", "   ", "HANNA HI2211 v1.2", "mV 152.3", "12 34", "pH 15.2", "*OK", null, undefined]) {
    assert.equal(parseTextLine(line), null, `"${line}"`);
  }
});

test("AquaSense firmware lines", () => {
  assert.deepEqual(parseFirmwareLine("PH:7.12;T:24.5"), { ph: 7.12, temperatureC: 24.5 });
  assert.deepEqual(parseFirmwareLine("PH:6.987;T:NA"), { ph: 6.99, temperatureC: null });
  assert.equal(parseFirmwareLine("PONG AquaSense"), null);
  assert.equal(parseFirmwareLine("OK"), null);
});

test("Atlas Scientific EZO-pH: bare readings only, status lines ignored", () => {
  assert.deepEqual(parseAtlasLine("7.020"), { ph: 7.02, temperatureC: null });
  assert.deepEqual(parseAtlasLine(" 4.001\r"), { ph: 4, temperatureC: null });
  assert.equal(parseAtlasLine("*OK"), null);
  assert.equal(parseAtlasLine("*ER"), null);
  assert.equal(parseAtlasLine("?I,pH,2.11"), null);
  assert.equal(parseAtlasLine("15.2"), null);
});

test("every protocol offered in the screen has a reader and a line ending", () => {
  for (const [key, protocol] of Object.entries(PROTOCOLS)) {
    assert.equal(typeof PARSERS[key], "function", key);
    assert.ok(["\r\n", "\n", "\r"].includes(protocol.eol), key);
  }
});
