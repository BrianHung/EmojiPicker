"use client";

import { useEmojiPopoverRootContext } from "../../root/EmojiPopoverRootContext";
import type { EmojiPopoverPortalProps } from "../../utils/types";
import { portal } from "../utils/portal";
import type { FloatingInternals } from "../root/EmojiPopoverRootContext";

export function EmojiPopoverPortal({ container, children }: EmojiPopoverPortalProps) {
  return portal(useEmojiPopoverRootContext<FloatingInternals>("Portal").status, container, children);
}

export declare namespace EmojiPopoverPortal {
  type Props = EmojiPopoverPortalProps;
}
