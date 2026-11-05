import { createStore } from "./reactive";

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

type Entry = readonly [score: number, updatedAt: number];
type Entries = Readonly<Record<string, Entry>>;
type FrequencyState = { entries: Entries; version: number };
type FrequencyAction = { type: "record"; unified: string; now: number } | { type: "clear" };

export function createFrequencyStore({ storage = localStorageAdapter("emoji-picker:frequents"), halfLifeDays = 14, defaults = DEFAULT_FREQUENT, max = 64 }: FrequencyStoreOptions = {}): FrequencyStore {
  const halfLife = halfLifeDays * 864e5;
  const decayed = ([score, at]: Entry, now: number) => score * 0.5 ** ((now - at) / halfLife);
  const ranked = (entries: Entries, now: number) => Object.entries(entries).sort((a, b) => decayed(b[1], now) - decayed(a[1], now));

  const reduce = (state: FrequencyState, action: FrequencyAction): FrequencyState => {
    if (action.type === "clear") return { entries: {}, version: state.version + 1 };
    const { unified, now } = action;
    const prev = state.entries[unified];
    const entries = { ...state.entries, [unified]: [(prev ? decayed(prev, now) : 0) + 1, now] as const };
    return { entries: Object.fromEntries(ranked(entries, now).slice(0, max)), version: state.version + 1 };
  };
  const store = createStore<FrequencyState, FrequencyAction>({ entries: parse(storage.read()), version: 0 }, reduce);
  const tops = new WeakMap<FrequencyState, Map<number, readonly string[]>>();

  const top = (n: number) => {
    const state = store.getSnapshot();
    const byCount = tops.get(state) ?? new Map<number, readonly string[]>();
    tops.set(state, byCount);
    const list = byCount.get(n) ?? [...new Set([...ranked(state.entries, Date.now()).map(([u]) => u), ...defaults])].slice(0, n);
    byCount.set(n, list);
    return list;
  };
  const commit = (action: FrequencyAction) => {
    store.dispatch(action);
    storage.write(JSON.stringify(store.getSnapshot().entries));
  };

  return {
    record: (unified) => commit({ type: "record", unified, now: Date.now() }),
    top,
    score(unified) {
      const entry = store.getSnapshot().entries[unified];
      return entry ? decayed(entry, Date.now()) : 0;
    },
    subscribe: store.subscribe,
    version: () => store.getSnapshot().version,
    clear: () => commit({ type: "clear" }),
  };
}

function parse(raw: string | null): Entries {
  try {
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function localStorageAdapter(key: string): EmojiStorage {
  const memory = memoryStorage();
  return {
    read() {
      try {
        return globalThis.localStorage?.getItem(key) ?? memory.read();
      } catch {
        return memory.read();
      }
    },
    write(value) {
      memory.write(value);
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {}
    },
  };
}

export const memoryStorage = (): EmojiStorage => {
  const box = createStore<string | null, string>(null, (_, value) => value);
  return { read: box.getSnapshot, write: box.dispatch };
};
