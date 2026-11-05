import * as React from "react";
import type { EmojiRecord } from "../../core/dataset";
import { createSearch, type SearchState } from "../../core/search/query";
import { emitter } from "../../core/reactive";
import { useEmojiContext, useStoreSnapshot } from "./provider";

/** Top `n` emoji (base unified codes) by decayed frequency, filled with defaults. */
export function useFrequentEmoji(n = 5): readonly string[] {
  const { store } = useEmojiContext();
  return React.useSyncExternalStore(
    store.frequents.subscribe,
    () => store.frequents.top(n),
    () => store.frequents.top(n),
  );
}

/** Shared skin tone, 0 (none) to 5. Persisted, and applied by every picker. */
export function useSkinTone(): [tone: number, setTone: (tone: number) => void] {
  const { store } = useEmojiContext();
  return [useStoreSnapshot((s) => s.skinTone()), store.setSkinTone];
}

/** Loading state of the shared dataset; triggers the load on first use. */
export function useEmojiStatus() {
  const { store } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  React.useEffect(() => {
    if (status === "idle") store.load().catch(() => {});
  }, [status, store]);
  return status;
}

/**
 * Results of the provider's `search` for a query: the picker's results grid,
 * a command palette, a custom grid. Sync engines answer in the same render; an
 * async engine keeps showing the previous results until its promise settles,
 * and a newer query aborts the older request.
 */
export function useEmojiSearch(query: string, { limit = 50 }: { limit?: number } = {}): readonly EmojiRecord[] {
  return useEmojiSearchState(query, { limit }).results;
}

export type EmojiSearchState = SearchState;

/** `useEmojiSearch` plus whether an async engine is still working on the current query. */
export function useEmojiSearchState(query: string, { limit = 50 }: { limit?: number } = {}): EmojiSearchState {
  const { store } = useEmojiContext();
  useEmojiStatus();
  const [search] = React.useState(() => {
    const events = emitter(() => () => runner.abort());
    const runner = createSearch(store, events.emit);
    return { runner, subscribe: events.subscribe };
  });
  const read = () => search.runner.run(query, limit);
  return React.useSyncExternalStore(search.subscribe, read, read);
}
