"use client";

import * as React from "react";
import { SLOTS } from "../../../internals/slots";
import { type Overlay, usePositioner } from "../../../popover/react-aria/utils/usePositioner";
import type { EmojiSuggestionsPositionerProps, EmojiSuggestionsPositionerState } from "../../utils/types";
import { EmojiSuggestionsRootContext } from "../root/EmojiSuggestionsRootContext";

export const EmojiSuggestionsPositioner = React.forwardRef<HTMLDivElement, EmojiSuggestionsPositionerProps>(function EmojiSuggestionsPositioner(
  { side = "bottom", align = "start", sideOffset = 4, alignOffset = 0, collisionPadding = 8, ...props },
  ref,
) {
  const suggestions = React.useContext(EmojiSuggestionsRootContext);
  if (!suggestions) throw new Error("EmojiSuggestions.Positioner must be inside EmojiSuggestions.Root");
  const { open, onOpenChange, onOpenChangeComplete } = suggestions;
  const overlay: Overlay = { open, modal: false, fallback: null, onOpenChange: (next, details) => onOpenChange?.(next, details), complete: onOpenChangeComplete, slot: SLOTS.suggestionsPositioner };
  return usePositioner(overlay, { side, align, sideOffset, alignOffset, collisionPadding, ...props }, ref);
});

export declare namespace EmojiSuggestionsPositioner {
  type Props = EmojiSuggestionsPositionerProps;
  type State = EmojiSuggestionsPositionerState;
}
