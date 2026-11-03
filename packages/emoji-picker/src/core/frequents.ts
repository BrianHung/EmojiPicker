export type FrequencyStorage = {
  read(): string | null;
  write(value: string): void;
};

export type FrequencyStore = {
  /** Count one use of an emoji (pass the base unified code, without skin tone). */
  record(unified: string): void;
  /** Most-used emoji, with `defaults` filling the rest until there is history. */
  top(n: number): readonly string[];
  /** Decayed use count of one emoji; 0 when unused (defaults don't count). */
  score(unified: string): number;
  subscribe(listener: () => void): () => void;
  /** Changes on every record(); usable as a useSyncExternalStore snapshot. */
  version(): number;
  clear(): void;
};

export type FrequencyStoreOptions = {
  /** Default: localStorage under `key` (memory only when unavailable). */
  storage?: FrequencyStorage;
  key?: string;
  /** A use counts half as much after this many days. Default 14. */
  halfLifeDays?: number;
  /** Fills the list until there is history. Default: iOS tapback set. */
  defaults?: readonly string[];
  /** Keep at most this many emoji. Default 64. */
  max?: number;
};

/** ❤️ 👍 👎 😂 ‼️ ❓, the iOS tapback set. */
export const DEFAULT_FREQUENT = ["2764-fe0f", "1f44d", "1f44e", "1f602", "203c-fe0f", "2753"];

type Entry = [score: number, updatedAt: number];

/** Frequency with recency decay: each use adds 1, and scores halve every `halfLifeDays`. */
export function createFrequencyStore({
  storage = localStorageAdapter("emoji-picker:frequents"),
  halfLifeDays = 14,
  defaults = DEFAULT_FREQUENT,
  max = 64,
}: FrequencyStoreOptions = {}): FrequencyStore {
  const halfLife = halfLifeDays * 864e5;
  const listeners = new Set<() => void>();
  let entries: Record<string, Entry> = parse(storage.read());
  let version = 0;
  // Per-n cache: snapshots must be referentially stable between changes, and
  // different components ask for different n (picker 16, tapback 5).
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

/** localStorage, falling back to memory where it's missing or throws (SSR, private mode). */
export function localStorageAdapter(key: string): FrequencyStorage {
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
      } catch {
        // memory copy is kept
      }
    },
  };
}

export const memoryStorage = (): FrequencyStorage => {
  let value: string | null = null;
  return { read: () => value, write: (v) => void (value = v) };
};
