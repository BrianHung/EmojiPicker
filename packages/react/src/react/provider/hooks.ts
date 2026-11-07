"use client";

import * as React from "react";
import { createSearch, type EmojiSearchState, type EmojiStore, type EmojiStoreStatus, type SkinToneValue } from "@brianhung/emoji-picker-core";
import { subscribeAll } from "@brianhung/emoji-picker-core/internal";
import { useStore } from "../utils/store";
import { useLayoutEffect } from "../utils/utils";
import { useEmojiContext, useStoreSnapshot } from "./provider";

export type FrequentEmoji = {
  items: readonly string[];
  pick(unified: string): void;
  remove(unified: string): void;
  clear(): void;
};

export function useFrequentEmoji({ limit = 5 }: { limit?: number } = {}): FrequentEmoji {
  const { store } = useEmojiContext();
  const subscribe = React.useMemo(() => subscribeAll(store.frequents.subscribe, store.subscribe), [store]);
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
  const [search] = React.useState(() => createSearch(store, { query, limit }));
  useLayoutEffect(() => search.setQuery(query, limit), [search, query, limit]);
  return useStore(search);
}
