"use client";

import * as React from "react";
import type { EmojiPickerStore } from "@emoji-components/core";
import { useStoreSnapshot } from "../../../provider/EmojiProviderContext";
import { useStore } from "../../../utils/useStore";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export interface UseEmojiPickerSearchReturnValue {
  query: string;
  setQuery(query: string): void;
  clear(): void;
  resultCount: number | null;
}

// No count while a search runs, or once it or the data failed to load
export function useResultCount(state: EmojiPickerStore<React.ReactNode>): number | null {
  const ready = useStoreSnapshot((store) => store.status()) === "ready";
  const count = useStore(state, (s) => (s.searching && !s.pending && !s.searchError ? s.results.length : null));
  return ready ? count : null;
}

export function useEmojiPickerSearch(): UseEmojiPickerSearchReturnValue {
  const { state, actions } = useEmojiPickerRootContext("useEmojiPickerSearch");
  const setQuery = React.useCallback((query: string) => void state.setQuery(query, { reason: "imperative-action" }), [state]);
  return { query: useStore(state, (s) => s.query), setQuery, clear: actions.clearSearch, resultCount: useResultCount(state) };
}
