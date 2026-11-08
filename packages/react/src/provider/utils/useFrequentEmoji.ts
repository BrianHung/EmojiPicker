"use client";

import * as React from "react";
import { subscribeAll } from "@brianhung/emoji-picker-core/internal";
import { useStore } from "../../utils/useStore";
import { useEmojiContext } from "../EmojiProviderContext";

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
