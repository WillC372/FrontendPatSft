import test from "node:test";
import assert from "node:assert/strict";
import { duration, period } from "../js/views/SessionText.js";

test("session durations", () => {
  assert.equal(duration(0), "menos de 1 min");
  assert.equal(duration(45), "45 min");
  assert.equal(duration(60), "1 h");
  assert.equal(duration(65), "1 h 5 min");
  assert.equal(duration(-3), "menos de 1 min");
  assert.equal(duration(undefined), "menos de 1 min");
});

test("an open session in use ends in ahora", () => {
  const text = period({ status: "OPEN", startedAt: "2026-11-10T15:00:00Z", lastActivityAt: "2026-11-10T15:30:00Z" },
    Date.parse("2026-11-10T15:40:00Z"));
  assert.match(text, / – ahora$/);
});

test("an open session left without use says since when", () => {
  const text = period({ status: "OPEN", startedAt: "2026-11-10T15:00:00Z", lastActivityAt: "2026-11-10T15:30:00Z" },
    Date.parse("2026-11-10T19:00:00Z"));
  assert.match(text, / – sin uso desde \d{2}:\d{2}$/);
});

test("a session that ended the same day shows only the end time", () => {
  const text = period({ status: "ENDED", startedAt: "2026-11-10T15:00:00Z", endedAt: "2026-11-10T15:42:00Z" });
  assert.match(text, / – \d{2}:\d{2}$/);
});

test("a session that ended another day shows that day", () => {
  const text = period({ status: "ENDED", startedAt: "2026-11-10T15:00:00Z", endedAt: "2026-11-13T09:00:00Z" });
  assert.match(text, / – .*2026, \d{2}:\d{2}$/);
});

test("an expired session ends at its last activity", () => {
  const expired = period({ status: "EXPIRED", startedAt: "2026-11-10T15:00:00Z", lastActivityAt: "2026-11-10T15:20:00Z" });
  const ended = period({ status: "ENDED", startedAt: "2026-11-10T15:00:00Z", endedAt: "2026-11-10T15:20:00Z" });
  assert.equal(expired, ended);
});
