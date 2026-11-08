"use client";

import type { EmojiLabels } from "@brianhung/emoji-picker-core";
import { useEmojiContext } from "../EmojiProviderContext";

export const useEmojiLabels = (): EmojiLabels => useEmojiContext().labels;
