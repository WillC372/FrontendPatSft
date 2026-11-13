import test from "node:test";
import assert from "node:assert/strict";
import { esc, fmt } from "../js/core/Format.js";

test("pH values always have two decimals and missing values show --", () => {
  assert.equal(fmt.ph(7), "7.00");
  assert.equal(fmt.ph(6.987), "6.99");
  assert.equal(fmt.ph(null), "--");
  assert.equal(fmt.ph(undefined), "--");
  assert.equal(fmt.ph(Number.NaN), "--");
});

test("changes carry their sign", () => {
  assert.equal(fmt.signed(0.25), "+0.25");
  assert.equal(fmt.signed(-0.5), "-0.50");
  assert.equal(fmt.signed(0), "0.00");
});

test("relative times", () => {
  const ago = (seconds) => new Date(Date.now() - seconds * 1000).toISOString();
  assert.equal(fmt.relative(ago(10)), "hace unos segundos");
  assert.equal(fmt.relative(ago(5 * 60)), "hace 5 min");
  assert.equal(fmt.relative(ago(3 * 3600)), "hace 3 h");
  assert.equal(fmt.relative(ago(2 * 86400)), "hace 2 d");
  assert.equal(fmt.relative(null), "--");
});

test("text from the server or the user cannot inject HTML", () => {
  assert.equal(esc('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(esc("O'Neil & Co"), "O&#39;Neil &amp; Co");
  assert.equal(esc(null), "");
  assert.equal(esc(7.5), "7.5");
});

test("relative times are marked up so they can be refreshed, with the full date as tooltip", async () => {
  const { relativeTime } = await import("../js/core/Format.js");
  const iso = new Date(Date.now() - 5 * 60000).toISOString();
  const html = relativeTime(iso);
  assert.match(html, /^<time data-relative datetime="[^"]+" title="[^"]+">hace 5 min<\/time>$/);
  assert.equal(relativeTime(null), "--");
});
