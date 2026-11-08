"use client";

import * as React from "react";
import type { Mount } from "../../../popover/floating-ui/root/EmojiPopoverRootContext";
import type { EmojiSuggestionsRootProps } from "../../utils/types";

export type EmojiSuggestionsRootContext = Mount & Pick<EmojiSuggestionsRootProps, "open" | "onOpenChange">;

export const EmojiSuggestionsRootContext = React.createContext<EmojiSuggestionsRootContext | null>(null);

export function useEmojiSuggestionsRootContext(part: string) {
  const suggestions = React.useContext(EmojiSuggestionsRootContext);
  if (!suggestions) throw new Error(`EmojiSuggestions.${part} must be inside EmojiSuggestions.Root`);
  return suggestions;
}
