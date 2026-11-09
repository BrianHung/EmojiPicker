"use client";

import * as React from "react";
import type { EmojiSuggestionsRootChangeEventDetails, EmojiSuggestionsRootChangeEventReason, EmojiSuggestionsRootProps } from "../../utils/types";
import { EmojiSuggestionsRootContext } from "./EmojiSuggestionsRootContext";

export function EmojiSuggestionsRoot({ open, onOpenChange, onOpenChangeComplete, children }: EmojiSuggestionsRootProps) {
  const value = React.useMemo(() => ({ open, onOpenChange, onOpenChangeComplete }), [open, onOpenChange, onOpenChangeComplete]);
  return <EmojiSuggestionsRootContext.Provider value={value}>{children}</EmojiSuggestionsRootContext.Provider>;
}

export declare namespace EmojiSuggestionsRoot {
  type Props = EmojiSuggestionsRootProps;
  type ChangeEventReason = EmojiSuggestionsRootChangeEventReason;
  type ChangeEventDetails = EmojiSuggestionsRootChangeEventDetails;
}
