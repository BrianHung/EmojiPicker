"use client";

import type * as React from "react";
import type { EmojiPickerStore } from "@emoji-components/core";
import { useStoreSnapshot } from "../../../provider/EmojiProviderContext";
import { useStore } from "../../../utils/useStore";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export interface EmojiPickerSearchSummary {
  query: string;
  resultCount: number | null;
}

// No count while a search runs, or once it or the data failed to load
export function useResultCount(state: EmojiPickerStore<React.ReactNode>): number | null {
  const ready = useStoreSnapshot((store) => store.status()) === "ready";
  const count = useStore(state, (s) => (s.searching && !s.pending && !s.searchError ? s.results.length : null));
  return ready ? count : null;
}

export function useEmojiPickerSearch(): EmojiPickerSearchSummary {
  const { state } = useEmojiPickerRootContext("useEmojiPickerSearch");
  return { query: useStore(state, (s) => s.query), resultCount: useResultCount(state) };
}
