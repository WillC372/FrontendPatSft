import test from "node:test";
import assert from "node:assert/strict";
import { SseParser } from "../js/core/SseParser.js";

const all = (chunks) => {
  const parser = new SseParser();
  return [...chunks.flatMap((c) => parser.push(c)), ...parser.end()];
};

test("reads events with JSON data as the server sends them", () => {
  const events = all(['event:delta\ndata:{"t":"El pH "}\n\nevent:delta\ndata:{"t":"es 7."}\n\n', 'event:done\ndata:{"answer":"ok"}\n\n']);
  assert.deepEqual(events, [
    { name: "delta", data: { t: "El pH " } },
    { name: "delta", data: { t: "es 7." } },
    { name: "done", data: { answer: "ok" } },
  ]);
});

test("an event split across chunks is delivered once complete", () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push("event:del"), []);
  assert.deepEqual(parser.push('ta\ndata:{"t":"ho'), []);
  assert.deepEqual(parser.push('la"}\n'), []);
  assert.deepEqual(parser.push("\n"), [{ name: "delta", data: { t: "hola" } }]);
});

test("a CRLF line ending split between two chunks does not end the event early", () => {
  const events = all(["event:delta\r", "\ndata:{\"t\":\"a\"}\r\n\r", "\n"]);
  assert.deepEqual(events, [{ name: "delta", data: { t: "a" } }]);
});

test("data that is not JSON stays as text, and several data lines are joined", () => {
  assert.deepEqual(all(["data: línea 1\ndata: línea 2\n\n"]), [{ name: "message", data: "línea 1\nlínea 2" }]);
});

test("comments and blocks without data are ignored", () => {
  assert.deepEqual(all([": keep-alive\n\nevent:ping\n\n"]), []);
});

test("the last event is delivered when the stream closes without a blank line", () => {
  assert.deepEqual(all(['event:error\ndata:{"status":503}']), [{ name: "error", data: { status: 503 } }]);
});
