import type { EmojiRecord } from "../dataset";
import { createStore } from "../reactive";
import type { EmojiData, EmojiStore } from "../store";
import type { ProgressiveHits } from "./search";

export type SearchState = {
  results: readonly EmojiRecord[];
  pending: boolean;
};

const NONE: readonly EmojiRecord[] = [];
const IDLE: SearchState = { results: NONE, pending: false };

type Run = { key: string | null; data: EmojiData | null; state: SearchState; controller: AbortController | null; settled: readonly EmojiRecord[] };
type RunAction = { type: "start"; key: string; data: EmojiData; state: SearchState; controller: AbortController | null } | { type: "settle"; controller: AbortController; results: readonly EmojiRecord[] } | { type: "abort" };

const reduce = (run: Run, action: RunAction): Run => {
  switch (action.type) {
    case "start":
      return { ...run, key: action.key, data: action.data, state: action.state, controller: action.controller };
    case "settle":
      return run.controller === action.controller ? { ...run, state: { results: action.results, pending: false }, settled: action.results, controller: null } : run;
    case "abort":
      return run.controller ? { ...run, key: null, controller: null } : run;
  }
};

// Runs lazily from getSnapshot, so a query set during render has results in that render; only settling notifies
export function createSearch(store: EmojiStore) {
  const run = createStore<Run, RunAction>({ key: "", data: null, state: IDLE, controller: null, settled: NONE }, reduce);
  const settled = createStore(0, (n: number) => n + 1);
  const watchers = createStore(0, (n: number, by: number) => n + by);
  const abort = () => {
    run.getSnapshot().controller?.abort();
    run.dispatch({ type: "abort" });
  };
  return {
    run(query: string, limit: number): SearchState {
      const { status, data } = store.getSnapshot();
      const key = status === "ready" && query.trim() ? `${limit}:${query}` : "";
      const current = run.getSnapshot();
      if (key === current.key && (!key || data === current.data)) return current.state;
      current.controller?.abort();
      if (!key) return start(key, IDLE, null);
      const controller = new AbortController();
      const out = store.query(query, { limit, signal: controller.signal });
      if (Array.isArray(out)) return start(key, { results: out, pending: false }, null);
      const done = (results: readonly EmojiRecord[]) => {
        if (run.getSnapshot().controller !== controller) return;
        run.dispatch({ type: "settle", controller, results });
        settled.dispatch(undefined);
      };
      out.then(done, () => done(NONE));
      return start(key, { results: (out as Partial<ProgressiveHits<EmojiRecord[]>>).interim ?? current.settled, pending: true }, controller);
    },
    abort,
    subscribe(listener: () => void) {
      const off = settled.subscribe(listener);
      watchers.dispatch(1);
      return () => {
        off();
        watchers.dispatch(-1);
        if (!watchers.getSnapshot()) abort();
      };
    },
  };

  function start(key: string, state: SearchState, controller: AbortController | null) {
    run.dispatch({ type: "start", key, data: store.getSnapshot().data, state, controller });
    return state;
  }
}

export type Search = ReturnType<typeof createSearch>;
