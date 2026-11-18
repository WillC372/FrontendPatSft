// Memory cache of server answers that change little, so going back to a screen is instant and the free server works
// less. It cleans itself: every entry expires (its time depends on how often that data changes), at most MAX entries
// are kept (the least recently used goes first), a sweep removes the expired ones every minute, and any change made by
// the user (a POST, PUT, PATCH or DELETE), signing out or changing account empties it.

const RULES = [
  [/^\/reference\//, 10 * 60_000], // official USGS data: imported every 3 hours
  [/^\/intelligence\/library/, 10 * 60_000], // normative library
  [/^\/intelligence\/ai-status$/, 60_000],
  [/^\/profiles$/, 2 * 60_000],
  [/^\/users\/me\/settings$/, 2 * 60_000],
  [/^\/dashboard$/, 30_000],
  [/^\/intelligence\/(overview|diagnosis\/latest|recommendations)$/, 30_000],
];
const MAX = 40;

export class ApiCache {
  #entries = new Map(); // key -> { value, expires } in order of last use
  #pending = new Map(); // key -> promise of a request already on its way
  #sweeper;

  constructor(now = () => Date.now()) {
    this.now = now;
  }

  /** Lifetime in ms for a GET path, or 0 when that answer must always come fresh from the server. */
  ttl(path) {
    return RULES.find(([pattern]) => pattern.test(path))?.[1] || 0;
  }

  key(path, query) {
    const q = Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== null && v !== "").sort();
    return q.length ? `${path}?${new URLSearchParams(q)}` : path;
  }

  /** Returns a copy of the stored answer, or calls {@code load} (sharing it with identical requests in flight). */
  async get(path, query, load) {
    const ttl = this.ttl(path);
    if (!ttl) return load();
    const key = this.key(path, query);
    const hit = this.#entries.get(key);
    if (hit && hit.expires > this.now()) {
      this.#entries.delete(key); // most recently used goes to the end
      this.#entries.set(key, hit);
      return structuredClone(hit.value);
    }
    this.#entries.delete(key);
    if (this.#pending.has(key)) return structuredClone(await this.#pending.get(key));
    const generation = this.#generation;
    const request = load();
    this.#pending.set(key, request);
    try {
      const value = await request;
      // An answer that arrived after the cache was emptied (a change happened meanwhile) is not stored.
      if (generation === this.#generation) this.#store(key, value, ttl);
      return structuredClone(value);
    } finally {
      this.#pending.delete(key);
    }
  }

  #generation = 0;

  #store(key, value, ttl) {
    this.#entries.set(key, { value, expires: this.now() + ttl });
    while (this.#entries.size > MAX) this.#entries.delete(this.#entries.keys().next().value);
  }

  /** Removes the expired entries; returns how many were removed. */
  sweep() {
    let removed = 0;
    const now = this.now();
    for (const [key, entry] of this.#entries) {
      if (entry.expires <= now) { this.#entries.delete(key); removed++; }
    }
    return removed;
  }

  clear() {
    this.#generation++;
    this.#entries.clear();
  }

  get size() {
    return this.#entries.size;
  }

  startSweeping(intervalMs = 60_000) {
    clearInterval(this.#sweeper);
    this.#sweeper = setInterval(() => this.sweep(), intervalMs);
  }
}
