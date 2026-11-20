// The drop in Settings > About once grew to the full card width (948 px) because its SVG had no size of its own.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const settings = readFileSync(new URL("../js/views/Settings.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/css/Views.css", import.meta.url), "utf8");

test("the About drop sits in a row that gives it a fixed size", () => {
  assert.match(settings, /class="row about-brand">\$\{logo\("brand-logo"\)\}/);
  const rule = css.match(/\.about-brand \.brand-logo \{([^}]*)\}/);
  assert.ok(rule, "Views.css must size .about-brand .brand-logo");
  assert.match(rule[1], /width: \d+px/);
  assert.match(rule[1], /height: \d+px/);
  assert.match(rule[1], /flex: none/);
});
