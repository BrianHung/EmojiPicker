import * as React from "react";
import { createSearch, type SearchState, type SkinToneValue } from "@brianhung/emoji-picker-core";
import { useStore } from "../utils/store";
import { useEmojiContext, useStoreSnapshot } from "./provider";

export function useFrequentEmoji(n = 5): readonly string[] {
  const { store } = useEmojiContext();
  const subscribe = React.useCallback(
    (listener: () => void) => {
      const off = [store.frequents.subscribe(listener), store.subscribe(listener)];
      return () => off.forEach((unsubscribe) => unsubscribe());
    },
    [store],
  );
  return useStore({ subscribe, getSnapshot: () => store.frequent(n) });
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

export type EmojiSearchState = SearchState;

export function useEmojiSearch(query: string, { limit = 50 }: { limit?: number } = {}): EmojiSearchState {
  const { store } = useEmojiContext();
  useEmojiStatus();
  const [search] = React.useState(() => createSearch(store));
  return useStore({ subscribe: search.subscribe, getSnapshot: () => search.run(query, limit) });
}
