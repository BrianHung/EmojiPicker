import * as React from "react";
import { createSearch, type EmojiSearchState, type EmojiStore, type EmojiStoreStatus, type SkinToneValue } from "@brianhung/emoji-picker-core";
import { useStore } from "../utils/store";
import { useEmojiContext, useStoreSnapshot } from "./provider";

export type FrequentEmoji = {
  items: readonly string[];
  pick(unified: string): void;
  remove(unified: string): void;
  clear(): void;
};

export function useFrequentEmoji({ limit = 5 }: { limit?: number } = {}): FrequentEmoji {
  const { store } = useEmojiContext();
  const subscribe = React.useCallback(
    (listener: () => void) => {
      const off = [store.frequents.subscribe(listener), store.subscribe(listener)];
      return () => off.forEach((unsubscribe) => unsubscribe());
    },
    [store],
  );
  const items = useStore({ subscribe, getSnapshot: () => store.frequent(limit) });
  const { pick, remove, clear } = store.frequents;
  return React.useMemo(() => ({ items, pick, remove, clear }), [items, pick, remove, clear]);
}

export function useSkinTone(): [tone: SkinToneValue, setTone: EmojiStore["setSkinTone"]] {
  const { store } = useEmojiContext();
  return [useStoreSnapshot((s) => s.skinTone()), store.setSkinTone];
}

export function useEmojiStatus(): EmojiStoreStatus {
  const { store } = useEmojiContext();
  const status = useStoreSnapshot((s) => s.status());
  React.useEffect(() => {
    if (status === "idle") store.load().catch(() => {});
  }, [status, store]);
  return status;
}

export function useEmojiSearch(query: string, { limit = 50 }: { limit?: number } = {}): EmojiSearchState {
  const { store } = useEmojiContext();
  useEmojiStatus();
  const [search] = React.useState(() => createSearch(store));
  return useStore({ subscribe: search.subscribe, getSnapshot: () => search.run(query, limit) });
}
