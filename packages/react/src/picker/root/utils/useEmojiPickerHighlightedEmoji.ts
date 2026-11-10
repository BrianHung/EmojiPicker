"use client";

import type { EmojiRecord } from "@emoji-components/core";
import { useStore } from "../../../utils/useStore";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export function useEmojiPickerHighlightedEmoji(): EmojiRecord | null {
  return useStore(useEmojiPickerRootContext("useEmojiPickerHighlightedEmoji").state, (s) => s.active?.record ?? null);
}
