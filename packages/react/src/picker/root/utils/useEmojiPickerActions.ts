"use client";

import { type EmojiPickerRootActions, useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export const useEmojiPickerActions = (): EmojiPickerRootActions => useEmojiPickerRootContext("useEmojiPickerActions").actions;
