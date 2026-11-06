import { controllable, createChangeDetails, type ChangeDetails } from "./change";
import { cached, createStore } from "./reactive";

export interface EmojiStorage {
  read(): string | null;
  write(value: string): void;
  subscribe?(listener: () => void): () => void;
}

// count is the use count decayed by half every halfLifeDays (14 by default), as of lastUsed
export type FrequentEntry = { count: number; lastUsed: number };
export type Frequents = Readonly<Record<string, FrequentEntry>>;
export type FrequentsChangeDetails = ChangeDetails<"pick" | "remove" | "clear"> & { emoji?: string };

export interface FrequencyStore {
  pick(unified: string): void;
  remove(unified: string): void;
  clear(): void;
  top(n: number): readonly string[];
  score(unified: string): number;
  entries(): Frequents;
  subscribe(listener: () => void): () => void;
}

export type FrequencyStoreOptions = {
  frequents?: Frequents;
  defaultFrequents?: Frequents;
  onFrequentsChange?: (frequents: Frequents, details: FrequentsChangeDetails) => void;
  storage?: EmojiStorage | null;
  tuning?: FrequentsTuning;
  deferStorage?: boolean;
};

export type FrequentsTuning = { halfLifeDays?: number; max?: number };

// Real entries that were never used: remove() takes them out and any pick ranks above them
const DEFAULTS: Frequents = Object.fromEntries(["2764-fe0f", "1f44d", "1f44e", "1f602", "203c-fe0f", "2753"].map((u, i) => [u, { count: 0, lastUsed: -i }]));
const NONE: Frequents = {};

type Tuning = Required<FrequentsTuning>;
const tuningOf = ({ halfLifeDays = 14, max = 64 }: FrequentsTuning = {}): Tuning => ({ halfLifeDays, max });

const decayed = ({ count, lastUsed }: FrequentEntry, now: number, { halfLifeDays }: Tuning) => count * 0.5 ** ((now - lastUsed) / (halfLifeDays * 864e5));
// Ties go to the later use: digit-only keys such as "2753" would otherwise sort first by object key order
const ranked = (entries: Frequents, now: number, tuning: Tuning) => Object.entries(entries).sort((a, b) => decayed(b[1], now, tuning) - decayed(a[1], now, tuning) || b[1].lastUsed - a[1].lastUsed);
// The new pick stays: it would rank last against a full list of older uses and never build up a count
const capped = (entries: Frequents, now: number, tuning: Tuning, keep?: string): Frequents => {
  const top = ranked(entries, now, tuning).slice(0, tuning.max);
  return Object.fromEntries(keep && !top.some(([u]) => u === keep) ? [...top.slice(0, -1), [keep, entries[keep]!]] : top);
};

export function mergeFrequents(a: Frequents, b: Frequents, options?: FrequentsTuning): Frequents {
  const tuning = tuningOf(options);
  const merged: Record<string, FrequentEntry> = { ...a };
  for (const [unified, entry] of Object.entries(b)) {
    const other = merged[unified];
    const lastUsed = Math.max(entry.lastUsed, other?.lastUsed ?? 0);
    merged[unified] = other ? { count: decayed(entry, lastUsed, tuning) + decayed(other, lastUsed, tuning), lastUsed } : entry;
  }
  return capped(merged, Date.now(), tuning);
}

export type FrequentsAction = { type: "pick"; emoji: string; now: number } | { type: "remove"; emoji: string } | { type: "clear" };

export function reduceFrequents(entries: Frequents, action: FrequentsAction, tuning: Tuning): Frequents {
  switch (action.type) {
    case "pick": {
      const prev = entries[action.emoji];
      return capped({ ...entries, [action.emoji]: { count: (prev ? decayed(prev, action.now, tuning) : 0) + 1, lastUsed: action.now } }, action.now, tuning, action.emoji);
    }
    case "remove": {
      if (!(action.emoji in entries)) return entries;
      const { [action.emoji]: _, ...rest } = entries;
      return rest;
    }
    case "clear":
      return NONE;
    default:
      return action satisfies never;
  }
}

type FrequencyState = { own: Frequents; controlled: Frequents | undefined };
type FrequencyAction = { type: "own"; entries: Frequents } | { type: "control"; entries: Frequents | undefined };

const reduce = (state: FrequencyState, action: FrequencyAction): FrequencyState =>
  action.type === "own" ? (action.entries === state.own ? state : { ...state, own: action.entries }) : action.entries === state.controlled ? state : { ...state, controlled: action.entries };

export function createFrequencyStore({
  frequents,
  defaultFrequents = DEFAULTS,
  onFrequentsChange,
  storage = localStorageAdapter("emoji-picker:frequents"),
  tuning: tuningOptions,
  deferStorage,
}: FrequencyStoreOptions = {}): FrequencyStore & { control(value: Frequents | undefined, onChange: FrequencyStoreOptions["onFrequentsChange"]): void } {
  const read = () => parse(storage?.read() ?? null) ?? defaultFrequents;
  const store = createStore<FrequencyState, FrequencyAction>({ own: deferStorage ? defaultFrequents : read(), controlled: frequents }, reduce);
  let onChange = onFrequentsChange;
  const tuning = tuningOf(tuningOptions);
  const tops = new WeakMap<Frequents, Map<number, readonly string[]>>();
  const value = controllable<Frequents, FrequentsChangeDetails>({
    controlled: () => store.getSnapshot().controlled,
    own: () => store.getSnapshot().own,
    onChange: () => onChange,
    write(next) {
      storage?.write(JSON.stringify(next));
      store.dispatch({ type: "own", entries: next });
    },
  });
  const entries = value.value;
  const change = (action: FrequentsAction) => value.set(reduceFrequents(entries(), action, tuning), Object.assign(createChangeDetails(action.type), { emoji: action.type === "clear" ? undefined : action.emoji }));

  return {
    pick: (emoji) => void change({ type: "pick", emoji, now: Date.now() }),
    remove: (emoji) => void change({ type: "remove", emoji }),
    clear: () => void change({ type: "clear" }),
    top(n) {
      const state = entries();
      return cached(
        cached(tops, state, () => new Map()),
        n,
        // Decay keeps the order at any reference time; the newest use avoids reading the clock during render
        () =>
          ranked(state, Math.max(0, ...Object.values(state).map((e) => e.lastUsed)), tuning)
            .slice(0, n)
            .map(([u]) => u),
      );
    },
    score(unified) {
      const entry = entries()[unified];
      return entry ? decayed(entry, Date.now(), tuning) : 0;
    },
    entries,
    subscribe: syncWith(storage, store.subscribe, () => store.dispatch({ type: "own", entries: read() })),
    control(next, handler) {
      onChange = handler;
      store.dispatch({ type: "control", entries: next });
    },
  };
}

// Storage is read again on the first subscribe (after hydration), and another tab's writes arrive while anything listens
export function syncWith(storage: EmojiStorage | null, subscribe: (listener: () => void) => () => void, sync: () => void) {
  let count = 0;
  let stop: (() => void) | undefined;
  return (listener: () => void) => {
    const unsubscribe = subscribe(listener);
    if (count++ === 0 && storage) {
      sync();
      stop = storage.subscribe?.(sync);
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

// Node 25+ defines a localStorage global (a warning, or a file shared by every request); only a browser's is per user
const browserStorage = () => (typeof window === "undefined" ? undefined : window.localStorage);

export function localStorageAdapter(key: string): EmojiStorage {
  const memory = memoryStorageAdapter();
  return {
    read() {
      try {
        const local = browserStorage();
        return local ? local.getItem(key) : memory.read();
      } catch {
        return memory.read();
      }
    },
    write(value) {
      memory.write(value);
      try {
        browserStorage()?.setItem(key, value);
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

export const memoryStorageAdapter = (): EmojiStorage => {
  let value: string | null = null;
  return { read: () => value, write: (next) => void (value = next) };
};
