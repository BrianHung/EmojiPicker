import * as React from "react";
import type { PickerHandlers } from "../utils/events";
import type { Orientation, PartProps } from "../utils/render";
import { ToolbarPart } from "../utils/toolbar";

export const BUTTONS = "button:not([disabled])";

export type ReactionBarState = { orientation: Orientation };

export type ReactionBarProps = PickerHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style">> &
  PartProps<ReactionBarState, HTMLDivElement> & {
    orientation?: Orientation;
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
