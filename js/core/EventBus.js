// Observer (publish/subscribe): modules communicate through events without knowing each other.
class EventBus {
  #handlers = new Map();

  on(event, handler) {
    if (!this.#handlers.has(event)) this.#handlers.set(event, new Set());
    this.#handlers.get(event).add(handler);
    return () => this.#handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this.#handlers.get(event)?.forEach((handler) => {
      try { handler(payload); } catch (error) { console.error(`Handler for ${event} failed`, error); }
    });
  }
}

export const bus = new EventBus();
