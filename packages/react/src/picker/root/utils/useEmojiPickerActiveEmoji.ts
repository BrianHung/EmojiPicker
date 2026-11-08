"use client";

import type { EmojiRecord } from "@emoji-components/core";
import { useStore } from "../../../utils/useStore";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export function useEmojiPickerActiveEmoji(): EmojiRecord | null {
  return useStore(useEmojiPickerRootContext("useEmojiPickerActiveEmoji").state, (s) => s.active?.record ?? null);
}
