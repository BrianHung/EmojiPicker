import type { EmojiRecord } from "../dataset";
import { createStore, toError, type Subscribe } from "../reactive";
import type { EmojiStore } from "../store";

export interface EmojiSearchState {
  results: readonly EmojiRecord[];
  pending: boolean;
  error: Error | null;
}

export interface EmojiSearchQuery {
  query: string;
  limit: number;
}

export interface EmojiSearchStore {
  getSnapshot(): EmojiSearchState;
  subscribe: Subscribe;
  setQuery(query: string, limit: number): void;
  abort(): void;
}

const NONE: readonly EmojiRecord[] = [];
const IDLE: EmojiSearchState = { results: NONE, pending: false, error: null };

// key is null once aborted or failed, so the next query runs even when it is the same
type Run = { key: string | null; version: number; state: EmojiSearchState; controller: AbortController | null; settled: readonly EmojiRecord[] };
type RunAction =
  | { type: "start"; key: string; version: number; state: EmojiSearchState; controller: AbortController | null }
  | { type: "settle"; controller: AbortController; results: readonly EmojiRecord[]; error: Error | null }
  | { type: "abort" };

const reduce = (run: Run, action: RunAction): Run => {
  switch (action.type) {
    case "start":
      return { ...run, key: action.key, version: action.version, state: action.state, controller: action.controller };
    case "settle":
      return run.controller === action.controller ? { ...run, key: action.error ? null : run.key, state: { results: action.results, pending: false, error: action.error }, settled: action.results, controller: null } : run;
    case "abort":
      return run.controller ? { ...run, key: null, controller: null } : run;
    default:
      return action satisfies never;
  }
};

// The query is an input: setting it starts the run, and getSnapshot only reads; a new data version reruns it while anything listens
export function createEmojiSearch(store: EmojiStore, initial: EmojiSearchQuery = { query: "", limit: 0 }): EmojiSearchStore {
  const run = createStore<Run, RunAction>({ key: "", version: -1, state: IDLE, controller: null, settled: NONE }, reduce);
  let input = initial;
  let watchers = 0;
  let unwatch: (() => void) | undefined;

  const refresh = () => {
    const { query, limit } = input;
    const key = store.status() === "ready" && query.trim() ? `${limit}:${query}` : "";
    const version = store.version();
    const current = run.getSnapshot();
    if (key === current.key && (!key || version === current.version)) return;
    current.controller?.abort();
    if (!key) return run.dispatch({ type: "start", key, version, state: IDLE, controller: null });
    const controller = new AbortController();
    const out = store.query(query, { limit, signal: controller.signal });
    if (Array.isArray(out)) return run.dispatch({ type: "start", key, version, state: { results: out, pending: false, error: null }, controller: null });
    run.dispatch({ type: "start", key, version, state: { results: current.settled, pending: true, error: null }, controller });
    out.then(
      (results) => run.dispatch({ type: "settle", controller, results, error: null }),
      (e: unknown) => run.dispatch({ type: "settle", controller, results: NONE, error: toError(e) }),
    );
  };

  const abort = () => {
    run.getSnapshot().controller?.abort();
    run.dispatch({ type: "abort" });
  };

  refresh();
  return {
    getSnapshot: () => run.getSnapshot().state,
    setQuery(query, limit) {
      input = { query, limit };
      refresh();
    },
    abort,
    subscribe(listener) {
      const off = run.subscribe(listener);
      if (watchers++ === 0) {
        unwatch = store.subscribe(refresh);
        refresh();
      }
      return () => {
        off();
        if (--watchers > 0) return;
        unwatch?.();
        abort();
      };
    },
  };
}
