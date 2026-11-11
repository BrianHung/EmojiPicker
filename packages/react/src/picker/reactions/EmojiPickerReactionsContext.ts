"use client";

import * as React from "react";
import type { UseEmojiPickerReactionsReturnValue } from "./utils/useEmojiPickerReactions";

export type EmojiPickerReactionsContext = UseEmojiPickerReactionsReturnValue;
export const EmojiPickerReactionsContext = React.createContext<EmojiPickerReactionsContext | null>(null);

export function useEmojiPickerReactionsContext(part: string) {
  const row = React.useContext(EmojiPickerReactionsContext);
  if (!row) throw new Error(`EmojiPicker.Reactions${part} must be inside <EmojiPicker.Reactions>.`);
  return row;
}
