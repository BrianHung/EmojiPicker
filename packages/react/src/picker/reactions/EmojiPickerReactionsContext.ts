"use client";

import * as React from "react";

export type EmojiPickerReactionsContext = { shown: readonly string[]; pressed: ReadonlySet<string> | null; press(unified: string, event: Event): void };
export const EmojiPickerReactionsContext = React.createContext<EmojiPickerReactionsContext | null>(null);

export function useEmojiPickerReactionsContext(part: string) {
  const row = React.useContext(EmojiPickerReactionsContext);
  if (!row) throw new Error(`EmojiPicker.Reactions${part} must be inside <EmojiPicker.Reactions>.`);
  return row;
}
