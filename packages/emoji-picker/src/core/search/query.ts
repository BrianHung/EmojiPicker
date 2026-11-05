import type { EmojiRecord } from "../dataset";
import type { ProgressiveHits } from "./search";
import type { EmojiStore } from "../store";

export type SearchState = {
  results: readonly EmojiRecord[];
  /** An async search for the current query is in flight. */
  pending: boolean;
};

const NONE: readonly EmojiRecord[] = [];
const IDLE: SearchState = { results: NONE, pending: false };

/**
 * The store's search for one query at a time. Sync engines answer at once; an async one keeps
 * the last settled results (or its interim ones) until it settles, and a newer query aborts it.
 */
export function createSearch(store: EmojiStore, onSettle: () => void) {
  let key: string | null = null;
  let state = IDLE;
  let settled = NONE;
  let controller: AbortController | null = null;
  const abort = () => {
    controller?.abort();
    controller = null;
  };
  return {
    run(query: string, limit: number): SearchState {
      const next = store.status() === "ready" && query.trim() ? `${limit}:${query}` : "";
      if (next === key) return state;
      abort();
      key = next;
      if (!next) return (state = IDLE);
      const ctl = new AbortController();
      const out = store.query(query, { limit, signal: ctl.signal });
      if (Array.isArray(out)) return (state = { results: out, pending: false });
      controller = ctl;
      const done = (results: readonly EmojiRecord[]) => {
        if (controller !== ctl) return;
        controller = null;
        state = { results: (settled = results), pending: false };
        onSettle();
      };
      out.then(done, () => done(NONE));
      return (state = { results: (out as Partial<ProgressiveHits<EmojiRecord[]>>).interim ?? settled, pending: true });
    },
    /** Stops a search in flight; the next `run` starts it again. */
    abort() {
      if (controller) key = null;
      abort();
    },
  };
}
