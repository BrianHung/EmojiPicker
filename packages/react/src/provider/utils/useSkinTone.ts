"use client";

import type { EmojiStore, SkinToneValue } from "@emoji-components/core";
import { useEmojiContext, useStoreSnapshot } from "../EmojiProviderContext";

export function useSkinTone(): [tone: SkinToneValue, setTone: EmojiStore["setSkinTone"]] {
  const { store } = useEmojiContext();
  return [useStoreSnapshot((s) => s.skinTone()), store.setSkinTone];
}
