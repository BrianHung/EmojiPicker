"use client";

import * as React from "react";
import type { EmojiSuggestionsRootProps } from "../../utils/types";

export type EmojiSuggestionsRootContext = Pick<EmojiSuggestionsRootProps, "open" | "onOpenChange" | "onOpenChangeComplete">;

export const EmojiSuggestionsRootContext = React.createContext<EmojiSuggestionsRootContext | null>(null);

export function useEmojiSuggestionsRootContext(part: string) {
  const suggestions = React.useContext(EmojiSuggestionsRootContext);
  if (!suggestions) throw new Error(`EmojiSuggestions.${part} must be inside EmojiSuggestions.Root`);
  return suggestions;
}
