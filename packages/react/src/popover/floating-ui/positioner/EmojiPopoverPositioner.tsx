"use client";

import * as React from "react";
import { useMergeRefs } from "@floating-ui/react";
import { SLOTS } from "../../../internals/slots";
import { useEmojiPopoverRootContext } from "../../root/EmojiPopoverRootContext";
import type { EmojiPopoverPositionerProps, EmojiPopoverPositionerState } from "../../utils/types";
import type { FloatingInternals } from "../root/EmojiPopoverRootContext";
import { usePlacement } from "../utils/usePlacement";
import { positioned } from "../utils/positioned";

export const EmojiPopoverPositioner = React.forwardRef<HTMLDivElement, EmojiPopoverPositionerProps>(function EmojiPopoverPositioner(
  { side = "bottom", align = "start", sideOffset = 8, alignOffset = 0, collisionPadding = 8, anchor, ...props },
  ref,
) {
  const p = useEmojiPopoverRootContext<FloatingInternals>("Positioner");
  const placement = usePlacement({ side, align, sideOffset, alignOffset, collisionPadding, anchor }, { rootContext: p.context, nodeId: p.nodeId, open: p.state.open });
  const refs = useMergeRefs([p.setFloating, ref]);
  return p.status && positioned(placement, p.status, p.floatingProps, SLOTS.popoverPositioner, props, refs);
});

export declare namespace EmojiPopoverPositioner {
  type Props = EmojiPopoverPositionerProps;
  type State = EmojiPopoverPositionerState;
}
