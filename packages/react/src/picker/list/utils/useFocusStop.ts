"use client";

import * as React from "react";
import type { Key } from "@react-types/shared";
import type { EmojiPickerStore } from "@emoji-components/core";
import type { GridLatest } from "./types";

// One cell is the list's tab stop
export function useFocusStop(core: EmojiPickerStore<React.ReactNode>, listRef: React.RefObject<HTMLElement | null>, latest: { readonly current: GridLatest }) {
  const lastFocused = React.useRef<Key | null>(null);
  const syncStop = () => {
    const list = listRef.current;
    if (list?.contains(document.activeElement) && document.activeElement !== list) return;
    const { collection, geometry } = latest.current;
    const stop = core.getSnapshot().tabStop;
    if (stop == null || !geometry.isVisible(stop) || !collection.emoji(stop)) {
      const last = lastFocused.current;
      const next = last != null && collection.emoji(last) && geometry.isVisible(last) ? last : geometry.firstVisible();
      core.setTabStop(next == null ? null : String(next));
    }
  };
  return { lastFocused, syncStop };
}
