"use client";

import type { EmojiLabels } from "@emoji-components/core";
import { useEmojiContext } from "../EmojiProviderContext";

export const useEmojiLabels = (): EmojiLabels => useEmojiContext().labels;
