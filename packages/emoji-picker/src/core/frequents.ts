export type EmojiStorage = {
  read(): string | null;
  write(value: string): void;
};

export type FrequencyStore = {
  record(unified: string): void;
  top(n: number): readonly string[];
  score(unified: string): number;
  subscribe(listener: () => void): () => void;
  version(): number;
  clear(): void;
};

export type FrequencyStoreOptions = {
  storage?: EmojiStorage;
  key?: string;
  halfLifeDays?: number;
  defaults?: readonly string[];
  max?: number;
};

export const DEFAULT_FREQUENT = ["2764-fe0f", "1f44d", "1f44e", "1f602", "203c-fe0f", "2753"];

type Entry = [score: number, updatedAt: number];

export function createFrequencyStore({ storage = localStorageAdapter("emoji-picker:frequents"), halfLifeDays = 14, defaults = DEFAULT_FREQUENT, max = 64 }: FrequencyStoreOptions = {}): FrequencyStore {
  const halfLife = halfLifeDays * 864e5;
  const listeners = new Set<() => void>();
  let entries: Record<string, Entry> = parse(storage.read());
  let version = 0;
  let cache = new Map<number, readonly string[]>();

  const decayed = ([score, at]: Entry, now: number) => score * 0.5 ** ((now - at) / halfLife);

  const emit = () => {
    version++;
    cache = new Map();
    listeners.forEach((l) => l());
  };

  return {
    record(unified) {
      const now = Date.now();
      const prev = entries[unified];
      entries[unified] = [(prev ? decayed(prev, now) : 0) + 1, now];
      const sorted = Object.entries(entries).sort((a, b) => decayed(b[1], now) - decayed(a[1], now));
      entries = Object.fromEntries(sorted.slice(0, max));
      storage.write(JSON.stringify(entries));
      emit();
    },
    top(n) {
      const hit = cache.get(n);
      if (hit) return hit;
      const now = Date.now();
      const used = Object.entries(entries)
        .sort((a, b) => decayed(b[1], now) - decayed(a[1], now))
        .map(([u]) => u);
      const list = [...new Set([...used, ...defaults])].slice(0, n);
      cache.set(n, list);
      return list;
    },
    score(unified) {
      const entry = entries[unified];
      return entry ? decayed(entry, Date.now()) : 0;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
    clear() {
      entries = {};
      storage.write("{}");
      emit();
    },
  };
}

function parse(raw: string | null): Record<string, Entry> {
  try {
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function localStorageAdapter(key: string): EmojiStorage {
  let memory: string | null = null;
  return {
    read() {
      try {
        return globalThis.localStorage?.getItem(key) ?? memory;
      } catch {
        return memory;
      }
    },
    write(value) {
      memory = value;
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {}
    },
  };
}

export const memoryStorage = (): EmojiStorage => {
  let value: string | null = null;
  return { read: () => value, write: (v) => void (value = v) };
};
