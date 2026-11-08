"use client";

import * as React from "react";
import type { EmojiPopoverRootChangeEventDetails, EmojiPopoverRootChangeEventReason } from "../../../popover/utils/types";
import type { EmojiSuggestionsRootProps } from "../../utils/types";
import { useTransition } from "../../../popover/utils/useTransition";
import { EmojiSuggestionsRootContext } from "./EmojiSuggestionsRootContext";

export function EmojiSuggestionsRoot({ open, onOpenChange, onOpenChangeComplete, children }: EmojiSuggestionsRootProps) {
  const popup = React.useRef<HTMLElement | null>(null);
  const status = useTransition(open, popup, onOpenChangeComplete);
  const value = React.useMemo(() => ({ open, onOpenChange, status, popup }), [open, onOpenChange, status]);
  return <EmojiSuggestionsRootContext.Provider value={value}>{children}</EmojiSuggestionsRootContext.Provider>;
}

export declare namespace EmojiSuggestionsRoot {
  type Props = EmojiSuggestionsRootProps;
  type ChangeEventReason = EmojiPopoverRootChangeEventReason;
  type ChangeEventDetails = EmojiPopoverRootChangeEventDetails;
}
