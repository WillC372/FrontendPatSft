import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanStorage } from "../js/core/StorageJanitor.js";

function memory(entries) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    removeItem: (k) => map.delete(k),
    keys: () => [...map.keys()].sort(),
  };
}

test("removes old keys of the app and keeps the ones in use and other sites' keys", () => {
  const s = memory({ "aquasense.theme": "DARK", "aquasense.session": "{}", "aquasense.old.flag": "1", "aquasense.redesign": "x", "otro.sitio": "1" });
  assert.deepEqual(cleanStorage(s).sort(), ["aquasense.old.flag", "aquasense.redesign"]);
  assert.deepEqual(s.keys(), ["aquasense.session", "aquasense.theme", "otro.sitio"]);
});

test("keeps only the 10 most recent tour marks", () => {
  const entries = {};
  for (let i = 1; i <= 13; i++) entries[`aquasense.tour.v1.${i}`] = String(1000 + i);
  const s = memory(entries);
  const removed = cleanStorage(s);
  assert.deepEqual(removed.sort(), ["aquasense.tour.v1.1", "aquasense.tour.v1.2", "aquasense.tour.v1.3"]);
});

test("does nothing when storage cannot be read", () => {
  assert.deepEqual(cleanStorage({ get length() { throw new Error("blocked"); } }), []);
});
