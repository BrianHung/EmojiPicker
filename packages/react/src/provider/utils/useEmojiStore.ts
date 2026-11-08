"use client";

import type { EmojiStore } from "@brianhung/emoji-picker-core";
import { useEmojiContext } from "../EmojiProviderContext";

export const useEmojiStore = (): EmojiStore => useEmojiContext().store;
