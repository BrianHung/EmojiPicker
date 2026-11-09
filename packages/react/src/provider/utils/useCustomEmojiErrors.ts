"use client";

import { useStoreSnapshot } from "../EmojiProviderContext";

export const useCustomEmojiErrors = (): readonly Error[] => useStoreSnapshot((s) => s.customEmojiErrors());
