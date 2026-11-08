"use client";

import * as React from "react";
import { useDismiss, useInteractions, useMergeRefs } from "@floating-ui/react";
import { createChangeDetails } from "@emoji-components/core/internal";
import { SLOTS } from "../../../internals/slots";
import { positioned } from "../../../popover/floating-ui/utils/positioned";
import { reasonOf, usePlacement } from "../../../popover/floating-ui/utils/usePlacement";
import type { EmojiSuggestionsPositionerProps, EmojiSuggestionsPositionerState } from "../../../popover/utils/types";
import { useEmojiSuggestionsRootContext } from "../root/EmojiSuggestionsRootContext";

export const EmojiSuggestionsPositioner = React.forwardRef<HTMLDivElement, EmojiSuggestionsPositionerProps>(function EmojiSuggestionsPositioner(
  { anchor, side = "bottom", align = "start", sideOffset = 4, alignOffset = 0, collisionPadding = 8, ...props },
  ref,
) {
  const { open, onOpenChange, status } = useEmojiSuggestionsRootContext("Positioner");
  const placement = usePlacement({ side, align, sideOffset, alignOffset, collisionPadding, anchor }, { open, onOpenChange: (next, event, reason) => onOpenChange?.(next, createChangeDetails(reasonOf(reason), event)) });
  const { getFloatingProps } = useInteractions([useDismiss(placement.context, { escapeKey: false })]);
  const refs = useMergeRefs([placement.setFloating, ref]);
  return status && positioned(placement, status, getFloatingProps, SLOTS.suggestionsPositioner, props, refs);
});

export declare namespace EmojiSuggestionsPositioner {
  type Props = EmojiSuggestionsPositionerProps;
  type State = EmojiSuggestionsPositionerState;
}
