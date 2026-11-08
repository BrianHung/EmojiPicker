"use client";

import type { EmojiStore, SkinToneValue } from "@brianhung/emoji-picker-core";
import { useEmojiContext, useStoreSnapshot } from "../EmojiProviderContext";

export function useSkinTone(): [tone: SkinToneValue, setTone: EmojiStore["setSkinTone"]] {
  const { store } = useEmojiContext();
  return [useStoreSnapshot((s) => s.skinTone()), store.setSkinTone];
}
