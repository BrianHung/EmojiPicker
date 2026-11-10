"use client";

import * as React from "react";
import { SLOTS } from "../internals/slots";
import type { EmojiComponentsHandlers, EmojiComponentsPartProps } from "../internals/types";
import type { EmojiPickerOrientation } from "../picker/utils/types";
import { ToolbarPart } from "../picker/utils/ToolbarPart";

export const BUTTONS = "button:not([disabled])";

export type EmojiReactionBarState = { orientation: EmojiPickerOrientation };

export type EmojiReactionBarProps = EmojiComponentsHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style">> &
  EmojiComponentsPartProps<EmojiReactionBarState, HTMLDivElement> & {
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

export const ReactionBar = React.forwardRef<HTMLDivElement, EmojiReactionBarProps & { slot: string }>(function ReactionBar({ orientation = "horizontal", slot, children, ...props }, ref) {
  return (
    <ToolbarPart {...props} data-slot={slot} toolbarRef={ref} orientation={orientation} state={{ orientation }} handlers={POINTER}>
      {children}
    </ToolbarPart>
  );
});

// A toolbar of reaction buttons outside a picker, such as the reactions under a message
export const EmojiReactionBar = React.forwardRef<HTMLDivElement, EmojiReactionBarProps>(function EmojiReactionBar(props, ref) {
  return <ReactionBar {...props} ref={ref} slot={SLOTS.reactionBar} />;
});

export declare namespace EmojiReactionBar {
  type Props = EmojiReactionBarProps;
  type State = EmojiReactionBarState;
}
