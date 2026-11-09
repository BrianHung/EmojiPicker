"use client";

import * as React from "react";
import type { EmojiPickerStore } from "@emoji-components/core";
import type { EmojiPickerCollapsedCategories } from "./useEmojiPickerCollapsedCategories";

export function useCollapse(state: EmojiPickerStore<React.ReactNode>, collapsed: readonly string[]): EmojiPickerCollapsedCategories {
  return React.useMemo(() => ({ collapsed, isCollapsed: (id) => collapsed.includes(id), toggle: (id) => state.toggleCollapsed(id), setCollapsed: (id, value) => state.setCollapsed(id, value) }), [state, collapsed]);
}
