import { controllable, createChangeDetails, type ChangeDetails } from "./change";
import { cached, createStore } from "./reactive";

// count is the use count decayed by half every 14 days, as of lastUsed
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

type FrequencyStoreOptions = {
  frequents?: Frequents;
  defaultFrequents?: Frequents;
  onFrequentsChange?: (frequents: Frequents, details: FrequentsChangeDetails) => void;
  deferStorage?: boolean;
};

const HALF_LIFE = 14 * 864e5;
const MAX = 64;

// Real entries that were never used: remove() takes them out and any pick ranks above them
const DEFAULTS: Frequents = Object.fromEntries(["2764-fe0f", "1f44d", "1f44e", "1f602", "203c-fe0f", "2753"].map((u, i) => [u, { count: 0, lastUsed: -i }]));
const NONE: Frequents = {};

const decayed = ({ count, lastUsed }: FrequentEntry, now: number) => count * 0.5 ** ((now - lastUsed) / HALF_LIFE);
// Ties go to the later use: digit-only keys such as "2753" would otherwise sort first by object key order
const ranked = (entries: Frequents, now: number) => Object.entries(entries).sort((a, b) => decayed(b[1], now) - decayed(a[1], now) || b[1].lastUsed - a[1].lastUsed);
// The new pick stays: it would rank last against a full list of older uses and never build up a count
const capped = (entries: Frequents, now: number, keep: string): Frequents => {
  const top = ranked(entries, now).slice(0, MAX);
  return Object.fromEntries(top.some(([u]) => u === keep) ? top : [...top.slice(0, -1), [keep, entries[keep]!]]);
};

type FrequentsAction = { type: "pick"; emoji: string; now: number } | { type: "remove"; emoji: string } | { type: "clear" };

function reduceFrequents(entries: Frequents, action: FrequentsAction): Frequents {
  switch (action.type) {
    case "pick": {
      const prev = entries[action.emoji];
      return capped({ ...entries, [action.emoji]: { count: (prev ? decayed(prev, action.now) : 0) + 1, lastUsed: action.now } }, action.now, action.emoji);
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
  deferStorage,
}: FrequencyStoreOptions = {}): FrequencyStore & { control(value: Frequents | undefined, onChange: FrequencyStoreOptions["onFrequentsChange"]): void } {
  const storage = persisted("emoji-picker:frequents");
  const read = () => parse(storage.read()) ?? defaultFrequents;
  const store = createStore<FrequencyState, FrequencyAction>({ own: deferStorage ? defaultFrequents : read(), controlled: frequents }, reduce);
  let onChange = onFrequentsChange;
  const tops = new WeakMap<Frequents, Map<number, readonly string[]>>();
  const value = controllable<Frequents, FrequentsChangeDetails>({
    controlled: () => store.getSnapshot().controlled,
    own: () => store.getSnapshot().own,
    onChange: () => onChange,
    write(next) {
      storage.write(JSON.stringify(next));
      store.dispatch({ type: "own", entries: next });
    },
  });
  const entries = value.value;
  const change = (action: FrequentsAction) => value.set(reduceFrequents(entries(), action), Object.assign(createChangeDetails(action.type), { emoji: action.type === "clear" ? undefined : action.emoji }));

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
          ranked(state, Math.max(0, ...Object.values(state).map((e) => e.lastUsed)))
            .slice(0, n)
            .map(([u]) => u),
      );
    },
    score(unified) {
      const entry = entries()[unified];
      return entry ? decayed(entry, Date.now()) : 0;
    },
    entries,
    subscribe: readOnFirstSubscribe(store.subscribe, () => store.dispatch({ type: "own", entries: read() })),
    control(next, handler) {
      onChange = handler;
      store.dispatch({ type: "control", entries: next });
    },
  };
}

// A server-rendered page hydrates with the defaults; storage is read once something subscribes after mount
export function readOnFirstSubscribe(subscribe: (listener: () => void) => () => void, sync: () => void) {
  let synced = false;
  return (listener: () => void) => {
    const unsubscribe = subscribe(listener);
    if (!synced) {
      synced = true;
      sync();
    }
    return unsubscribe;
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

export function persisted(key: string): { read(): string | null; write(value: string): void } {
  let memory: string | null = null;
  return {
    read() {
      try {
        return browserStorage()?.getItem(key) ?? memory;
      } catch {
        return memory;
      }
    },
    write(value) {
      memory = value;
      try {
        browserStorage()?.setItem(key, value);
      } catch {}
    },
  };
}
