interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache {
  private store = new Map<string, Entry<unknown>>();
  constructor(private maxEntries = 500) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.prune();
    while (this.store.size >= this.maxEntries) {
      const first = this.store.keys().next().value;
      if (first == null) break;
      this.store.delete(first);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private prune(): void {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (now > v.expiresAt) this.store.delete(k);
    }
  }
}
