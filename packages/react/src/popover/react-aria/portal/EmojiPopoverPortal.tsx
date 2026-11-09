"use client";

import type { EmojiPopoverPortalProps } from "../../utils/types";
import { EmojiPopoverPortalContext } from "./EmojiPopoverPortalContext";

export function EmojiPopoverPortal({ container, children }: EmojiPopoverPortalProps) {
  return <EmojiPopoverPortalContext.Provider value={container}>{children}</EmojiPopoverPortalContext.Provider>;
}

export declare namespace EmojiPopoverPortal {
  type Props = EmojiPopoverPortalProps;
}
