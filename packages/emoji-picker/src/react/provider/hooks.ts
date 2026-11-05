import * as React from "react";
import type { EmojiRecord, SkinToneValue } from "../../core/dataset";
import { createSearch, type SearchState } from "../../core/search/query";
import { emitter } from "../../core/reactive";
import { useEmojiContext, useStoreSnapshot } from "./provider";

export function useFrequentEmoji(n = 5): readonly string[] {
  const { store } = useEmojiContext();
  return React.useSyncExternalStore(
    store.frequents.subscribe,
    () => store.frequents.top(n),
    () => store.frequents.top(n),
  );
}

export function useSkinTone(): [tone: SkinToneValue, setTone: (tone: SkinToneValue) => void] {
  const { store } = useEmojiContext();
  return [useStoreSnapshot((s) => s.skinTone()), store.setSkinTone];
}

export function useEmojiStatus() {
  const { store } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  React.useEffect(() => {
    if (status === "idle") store.load().catch(() => {});
  }, [status, store]);
  return status;
}

export function useEmojiSearch(query: string, { limit = 50 }: { limit?: number } = {}): readonly EmojiRecord[] {
  return useEmojiSearchState(query, { limit }).results;
}

export type EmojiSearchState = SearchState;

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
