import { createChangeDetails, type ChangeDetails } from "./change";
import { createStore } from "./reactive";

export type EmojiStorage = {
  read(): string | null;
  write(value: string): void;
  subscribe?(listener: () => void): () => void;
};

// count is the use count decayed by half every 14 days, as of lastUsed
export type FrequentEntry = { count: number; lastUsed: number };
export type Frequents = Readonly<Record<string, FrequentEntry>>;
export type FrequentsChangeDetails = ChangeDetails<"pick" | "remove" | "clear"> & { emoji?: string };

export type FrequencyStore = {
  record(unified: string): void;
  remove(unified: string): void;
  clear(): void;
  top(n: number): readonly string[];
  score(unified: string): number;
  entries(): Frequents;
  subscribe(listener: () => void): () => void;
};

export type FrequencyStoreOptions = {
  frequents?: Frequents;
  defaultFrequents?: Frequents;
  onFrequentsChange?: (frequents: Frequents, details: FrequentsChangeDetails) => void;
  frequentsStorage?: EmojiStorage | null;
};

const DEFAULTS = ["2764-fe0f", "1f44d", "1f44e", "1f602", "203c-fe0f", "2753"];
const HALF_LIFE = 14 * 864e5;
const MAX = 64;
const NONE: Frequents = {};

const decayed = ({ count, lastUsed }: FrequentEntry, now: number) => count * 0.5 ** ((now - lastUsed) / HALF_LIFE);
const ranked = (entries: Frequents, now: number) => Object.entries(entries).sort((a, b) => decayed(b[1], now) - decayed(a[1], now));
const capped = (entries: Frequents, now: number): Frequents => Object.fromEntries(ranked(entries, now).slice(0, MAX));

export function mergeFrequents(a: Frequents, b: Frequents): Frequents {
  const merged: Record<string, FrequentEntry> = { ...a };
  for (const [unified, entry] of Object.entries(b)) {
    const other = merged[unified];
    const lastUsed = Math.max(entry.lastUsed, other?.lastUsed ?? 0);
    merged[unified] = other ? { count: decayed(entry, lastUsed) + decayed(other, lastUsed), lastUsed } : entry;
  }
  return capped(merged, Date.now());
}

type FrequencyState = { own: Frequents; controlled: Frequents | undefined };
type FrequencyAction = { type: "own"; entries: Frequents } | { type: "control"; entries: Frequents | undefined };

const reduce = (state: FrequencyState, action: FrequencyAction): FrequencyState =>
  action.type === "own" ? (action.entries === state.own ? state : { ...state, own: action.entries }) : action.entries === state.controlled ? state : { ...state, controlled: action.entries };

export function createFrequencyStore({
  frequents,
  defaultFrequents = NONE,
  onFrequentsChange,
  frequentsStorage = localStorageAdapter("emoji-picker:frequents"),
}: FrequencyStoreOptions = {}): FrequencyStore & { control(value: Frequents | undefined, onChange: FrequencyStoreOptions["onFrequentsChange"]): void } {
  const read = () => parse(frequentsStorage?.read() ?? null) ?? defaultFrequents;
  const store = createStore<FrequencyState, FrequencyAction>({ own: read(), controlled: frequents }, reduce);
  const callbacks = { onFrequentsChange };
  const entries = () => store.getSnapshot().controlled ?? store.getSnapshot().own;
  const tops = new WeakMap<Frequents, Map<number, readonly string[]>>();

  const change = (next: Frequents, reason: FrequentsChangeDetails["reason"], emoji?: string) => {
    const details = Object.assign(createChangeDetails(reason), { emoji });
    callbacks.onFrequentsChange?.(next, details);
    if (details.isCanceled || store.getSnapshot().controlled !== undefined) return;
    frequentsStorage?.write(JSON.stringify(next));
    store.dispatch({ type: "own", entries: next });
  };

  return {
    record(unified) {
      const now = Date.now();
      const prev = entries()[unified];
      change(capped({ ...entries(), [unified]: { count: (prev ? decayed(prev, now) : 0) + 1, lastUsed: now } }, now), "pick", unified);
    },
    remove(unified) {
      if (!(unified in entries())) return;
      const { [unified]: _, ...rest } = entries();
      change(rest, "remove", unified);
    },
    clear: () => change(NONE, "clear"),
    top(n) {
      const state = entries();
      const byCount = tops.get(state) ?? new Map<number, readonly string[]>();
      tops.set(state, byCount);
      const list = byCount.get(n) ?? [...new Set([...ranked(state, Date.now()).map(([u]) => u), ...DEFAULTS])].slice(0, n);
      byCount.set(n, list);
      return list;
    },
    score(unified) {
      const entry = entries()[unified];
      return entry ? decayed(entry, Date.now()) : 0;
    },
    entries,
    subscribe: syncWith(frequentsStorage, store.subscribe, () => store.dispatch({ type: "own", entries: read() })),
    control(value, onChange) {
      callbacks.onFrequentsChange = onChange;
      store.dispatch({ type: "control", entries: value });
    },
  };
}

// Another tab's writes arrive while anything listens
export function syncWith(storage: EmojiStorage | null, subscribe: (listener: () => void) => () => void, sync: () => void) {
  let count = 0;
  let stop: (() => void) | undefined;
  return (listener: () => void) => {
    const unsubscribe = subscribe(listener);
    if (count++ === 0 && storage?.subscribe) {
      sync();
      stop = storage.subscribe(sync);
    }
    return () => {
      unsubscribe();
      if (--count === 0) stop?.();
    };
  };
}

const isEntry = (value: unknown): value is FrequentEntry => typeof (value as FrequentEntry)?.count === "number" && typeof (value as FrequentEntry).lastUsed === "number";

function parse(raw: string | null): Frequents | undefined {
  try {
    const value: unknown = raw ? JSON.parse(raw) : undefined;
    return value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([, entry]) => isEntry(entry))) : undefined;
  } catch {
    return undefined;
  }
}

export function localStorageAdapter(key: string): EmojiStorage {
  const memory = memoryStorage();
  return {
    read() {
      try {
        const local = globalThis.localStorage;
        return local ? local.getItem(key) : memory.read();
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
    subscribe(listener) {
      if (typeof addEventListener !== "function") return () => {};
      const onStorage = (event: StorageEvent) => event.key === key && listener();
      addEventListener("storage", onStorage);
      return () => removeEventListener("storage", onStorage);
    },
  };
}

export const memoryStorage = (): EmojiStorage => {
  const box = createStore<string | null, string>(null, (_, value) => value);
  return { read: box.getSnapshot, write: box.dispatch };
};
