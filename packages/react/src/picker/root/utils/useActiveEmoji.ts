"use client";

import type { EmojiRecord } from "@emoji-components/core";
import { useStore } from "../../../utils/useStore";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export function useActiveEmoji(): EmojiRecord | null {
  return useStore(useEmojiPickerRootContext("useActiveEmoji").state, (s) => s.active?.record ?? null);
}
