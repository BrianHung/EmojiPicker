"use client";

import * as React from "react";
import type { EmojiPickerStore } from "@emoji-components/core";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export interface EmojiPickerCollapsedCategories {
  collapsed: readonly string[];
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
  setCollapsed: (id: string, collapsed: boolean) => void;
}

export function useCollapse(state: EmojiPickerStore<React.ReactNode>, collapsed: readonly string[]): EmojiPickerCollapsedCategories {
  return React.useMemo(() => ({ collapsed, isCollapsed: (id) => collapsed.includes(id), toggle: (id) => state.toggleCollapsed(id), setCollapsed: (id, value) => state.setCollapsed(id, value) }), [state, collapsed]);
}

export const useEmojiPickerCollapsedCategories = (): EmojiPickerCollapsedCategories => useEmojiPickerRootContext("useEmojiPickerCollapsedCategories").collapse;
