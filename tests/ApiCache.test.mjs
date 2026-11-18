import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiCache } from "../js/core/ApiCache.js";

const clock = () => { const c = { t: 1000 }; c.now = () => c.t; return c; };

test("answers that change little are reused until they expire", async () => {
  const c = clock();
  const cache = new ApiCache(c.now);
  let calls = 0;
  const load = async () => ({ n: ++calls });
  assert.deepEqual(await cache.get("/profiles", null, load), { n: 1 });
  assert.deepEqual(await cache.get("/profiles", null, load), { n: 1 });
  c.t += 2 * 60_000 + 1;
  assert.deepEqual(await cache.get("/profiles", null, load), { n: 2 });
});

test("paths without a rule always go to the server", async () => {
  const cache = new ApiCache();
  let calls = 0;
  await cache.get("/alerts", null, async () => ++calls);
  await cache.get("/alerts", null, async () => ++calls);
  assert.equal(calls, 2);
  assert.equal(cache.size, 0);
});

test("callers get copies, so changing one does not change the kept answer", async () => {
  const cache = new ApiCache();
  const first = await cache.get("/dashboard", null, async () => ({ plan: "FREE" }));
  first.plan = "CHANGED";
  assert.deepEqual(await cache.get("/dashboard", null, async () => ({ plan: "OTHER" })), { plan: "FREE" });
});

test("identical requests in flight are shared", async () => {
  const cache = new ApiCache();
  let calls = 0;
  const load = () => new Promise((ok) => setTimeout(() => ok({ n: ++calls }), 5));
  const [a, b] = await Promise.all([cache.get("/reference/summary", null, load), cache.get("/reference/summary", null, load)]);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
});

test("the query is part of the key", async () => {
  const cache = new ApiCache();
  await cache.get("/reference/stations", { page: 1 }, async () => "p1");
  assert.equal(await cache.get("/reference/stations", { page: 2 }, async () => "p2"), "p2");
  assert.equal(await cache.get("/reference/stations", { page: 1 }, async () => "x"), "p1");
});

test("the sweep removes expired entries and the size limit drops the least recently used", async () => {
  const c = clock();
  const cache = new ApiCache(c.now);
  for (let i = 0; i < 45; i++) await cache.get("/reference/x", { i }, async () => i);
  assert.equal(cache.size, 40);
  assert.equal(await cache.get("/reference/x", { i: 0 }, async () => "fresh"), "fresh"); // the oldest one was dropped
  c.t += 11 * 60_000;
  assert.equal(cache.sweep(), 40);
  assert.equal(cache.size, 0);
});

test("an answer that arrives after a clear is not kept", async () => {
  const cache = new ApiCache();
  let release;
  const slow = cache.get("/dashboard", null, () => new Promise((ok) => { release = ok; }));
  cache.clear();
  release({ old: true });
  await slow;
  assert.equal(cache.size, 0);
});
