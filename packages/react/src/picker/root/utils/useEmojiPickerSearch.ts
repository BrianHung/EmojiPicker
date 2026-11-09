"use client";

import { shallowEqual, useStore } from "../../../utils/useStore";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export interface EmojiPickerSearchSummary {
  query: string;
  resultCount: number | null;
}

export function useEmojiPickerSearch(): EmojiPickerSearchSummary {
  const { state } = useEmojiPickerRootContext("useEmojiPickerSearch");
  return useStore(state, ({ query, searching, pending, results }) => ({ query, resultCount: searching && !pending ? results.length : null }), shallowEqual);
}
