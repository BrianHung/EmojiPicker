"use client";

import * as React from "react";
import { createSearch, type EmojiSearchState } from "@brianhung/emoji-picker-core";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import { useStore } from "../../utils/useStore";
import { useEmojiContext } from "../EmojiProviderContext";
import { useEmojiStatus } from "./useEmojiStatus";

export function useEmojiSearch(query: string, { limit = 50 }: { limit?: number } = {}): EmojiSearchState {
  const { store } = useEmojiContext();
  useEmojiStatus();
  const [search] = React.useState(() => createSearch(store, { query, limit }));
  useLayoutEffect(() => search.setQuery(query, limit), [search, query, limit]);
  return useStore(search);
}
