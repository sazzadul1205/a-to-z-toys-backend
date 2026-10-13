// Simple in-memory cache with TTL support
// For production, replace with Redis

class Cache {
  constructor({ ttl = 300000 } = {}) {
    this.ttl = ttl;
    this.store = new Map();
    this.timers = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.timers.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttl = this.ttl) {
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt });

    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set expiration timer
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, ttl);
    // Don't let an eviction timer keep the process alive (e.g. during tests
    // or when the server is shutting down).
    if (typeof timer.unref === "function") timer.unref();

    this.timers.set(key, timer);
  }

  invalidate(pattern) {
    // Simple pattern matching for invalidation
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
      }
    }
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.timers.clear();
  }
}

export function createCache(options) {
  return new Cache(options);
}