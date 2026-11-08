"use client";

import * as React from "react";
import type { EmojiPickerHandlers, EmojiPickerOrientation, EmojiPickerPartProps } from "../../internals/types";
import { ToolbarPart } from "../../internals/ToolbarPart";

export const BUTTONS = "button:not([disabled])";

export type ReactionBarState = { orientation: EmojiPickerOrientation };

export type ReactionBarProps = EmojiPickerHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style">> &
  EmojiPickerPartProps<ReactionBarState, HTMLDivElement> & {
    orientation?: EmojiPickerOrientation;
  };

// Once focus is inside, the pointer carries it from button to button
const POINTER: React.HTMLAttributes<HTMLElement> = {
  onPointerOver(event) {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>(BUTTONS) : null;
    const active = document.activeElement;
    const row = event.currentTarget;
    if (button && button !== active && row.contains(button) && active instanceof HTMLElement && row.contains(active)) button.focus({ preventScroll: true });
  },
};

export const ReactionBar = React.forwardRef<HTMLDivElement, ReactionBarProps>(function ReactionBar({ orientation = "horizontal", children, ...props }, ref) {
  return (
    <ToolbarPart {...props} toolbarRef={ref} orientation={orientation} state={{ orientation }} handlers={POINTER}>
      {children}
    </ToolbarPart>
  );
});
