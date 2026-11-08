import { api } from "./Api.js";
import { session } from "./Session.js";
import { bus } from "./EventBus.js";

// Server-Sent Events reader built on fetch (allows sending the token in a header).
// Publishes "live:reading" and "live:status" on the bus and reconnects with increasing backoff.
class LiveStream {
  #controller = null;
  #retry = 1000;
  #timer = null;

  start() {
    if (this.#controller || !session.isAuthenticated) return;
    this.#controller = new AbortController();
    this.#run(this.#controller.signal);
  }

  stop() {
    clearTimeout(this.#timer);
    this.#controller?.abort();
    this.#controller = null;
  }

  async #run(signal) {
    try {
      const response = await fetch(api.url("/devices/live"), {
        headers: { Authorization: `Bearer ${session.token}`, Accept: "text/event-stream" },
        signal,
      });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      this.#retry = 1000;
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let index;
        while ((index = buffer.indexOf("\n\n")) >= 0) {
          this.#dispatch(buffer.slice(0, index));
          buffer = buffer.slice(index + 2);
        }
      }
    } catch (error) {
      if (signal.aborted) return;
    }
    if (!signal.aborted && session.isAuthenticated) {
      this.#controller = null;
      this.#timer = setTimeout(() => this.start(), this.#retry);
      this.#retry = Math.min(this.#retry * 2, 15000);
    }
  }

  #dispatch(block) {
    let event = "message";
    const data = [];
    block.split("\n").forEach((line) => {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5));
    });
    if (!data.length) return;
    try {
      const payload = JSON.parse(data.join("\n"));
      if (event === "reading") bus.emit("live:reading", payload);
      if (event === "status") bus.emit("live:status", payload);
    } catch { /* ignore malformed event */ }
  }
}

export const liveStream = new LiveStream();
