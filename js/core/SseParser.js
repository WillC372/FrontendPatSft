/**
 * Reader of Server-Sent Events (text/event-stream) for responses read with fetch. Text arrives in chunks of any
 * size: an event can be split across chunks, and so can a "\r\n" line ending. push() returns the events completed by
 * each chunk; end() returns the last one if the stream closed without a blank line. Data that is JSON is parsed.
 */
export class SseParser {
  #buffer = "";

  push(chunk) {
    let text = this.#buffer + chunk;
    // A "\r" at the very end may be the first half of "\r\n": keep it until the next chunk.
    let pending = "";
    if (text.endsWith("\r")) {
      pending = "\r";
      text = text.slice(0, -1);
    }
    text = text.replace(/\r\n?/g, "\n");
    const events = [];
    let end;
    while ((end = text.indexOf("\n\n")) >= 0) {
      const event = SseParser.parse(text.slice(0, end));
      if (event) events.push(event);
      text = text.slice(end + 2);
    }
    this.#buffer = text + pending;
    return events;
  }

  end() {
    const rest = this.#buffer.replace(/\r\n?/g, "\n").trim();
    this.#buffer = "";
    const event = rest ? SseParser.parse(rest) : null;
    return event ? [event] : [];
  }

  /** One block of lines: "event:" names it, "data:" lines are joined, lines starting with ":" are comments. */
  static parse(block) {
    let name = "message";
    const data = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (!data.length) return null;
    let value = data.join("\n");
    try { value = JSON.parse(value); } catch { /* plain text */ }
    return { name, data: value };
  }
}
