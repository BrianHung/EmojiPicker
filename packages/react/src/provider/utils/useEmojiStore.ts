"use client";

import type { EmojiStore } from "@emoji-components/core";
import { useEmojiContext } from "../EmojiProviderContext";

export const useEmojiStore = (): EmojiStore => useEmojiContext().store;
