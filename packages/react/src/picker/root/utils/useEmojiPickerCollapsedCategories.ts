"use client";

import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export interface EmojiPickerCollapsedCategories {
  collapsed: readonly string[];
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
  setCollapsed: (id: string, collapsed: boolean) => void;
}

export const useEmojiPickerCollapsedCategories = (): EmojiPickerCollapsedCategories => useEmojiPickerRootContext("useEmojiPickerCollapsedCategories").collapse;
