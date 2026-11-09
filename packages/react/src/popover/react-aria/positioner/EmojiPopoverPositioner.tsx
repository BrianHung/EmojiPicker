"use client";

import * as React from "react";
import { SLOTS } from "../../../internals/slots";
import { useEmojiPopoverRootContext } from "../../root/EmojiPopoverRootContext";
import type { EmojiPopoverPositionerProps, EmojiPopoverPositionerState } from "../../utils/types";
import type { AriaInternals } from "../root/EmojiPopoverRootContext";
import { type Overlay, usePositioner } from "../utils/usePositioner";

export const EmojiPopoverPositioner = React.forwardRef<HTMLDivElement, EmojiPopoverPositionerProps>(function EmojiPopoverPositioner(
  { side = "bottom", align = "start", sideOffset = 8, alignOffset = 0, collisionPadding = 8, ...props },
  ref,
) {
  const p = useEmojiPopoverRootContext<AriaInternals>("Positioner");
  const overlay: Overlay = {
    open: p.state.open,
    modal: p.modal,
    fallback: p.trigger,
    onOpenChange: (open, { reason, event }) => p.state.setOpen(open, reason, event),
    complete: p.state.complete,
    slot: SLOTS.popoverPositioner,
  };
  return usePositioner(overlay, { side, align, sideOffset, alignOffset, collisionPadding, ...props }, ref);
});

export declare namespace EmojiPopoverPositioner {
  type Props = EmojiPopoverPositionerProps;
  type State = EmojiPopoverPositionerState;
}
