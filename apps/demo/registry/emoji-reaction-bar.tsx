"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { useToolbar } from "react-aria/useToolbar";
import { cn } from "@/lib/utils";

const BUTTONS = "button:not([disabled])";

type EmojiReactionBarProps = Omit<React.ComponentProps<"div">, "ref"> & { orientation?: "horizontal" | "vertical" };

// React Aria's toolbar: the arrow keys move focus, Home and End go to the ends, and once focus is inside, the pointer carries it
function EmojiReactionBar({ orientation = "horizontal", className, ...props }: EmojiReactionBarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { toolbarProps } = useToolbar({ orientation, "aria-label": props["aria-label"], "aria-labelledby": props["aria-labelledby"] }, ref);
  const own: React.HTMLAttributes<HTMLDivElement> = {
    onKeyDown(event) {
      const buttons = event.currentTarget.querySelectorAll<HTMLElement>(BUTTONS);
      if (event.key === "Home" || event.key === "End") buttons[event.key === "Home" ? 0 : buttons.length - 1]?.focus();
      else if (!(orientation === "horizontal" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"]).includes(event.key)) return;
      event.preventDefault();
    },
    onPointerOver(event) {
      const button = (event.target as Element).closest<HTMLElement>(BUTTONS);
      const active = document.activeElement;
      const bar = event.currentTarget;
      if (button && button !== active && bar.contains(button) && active instanceof HTMLElement && bar.contains(active)) button.focus({ preventScroll: true });
    },
  };
  return (
    <div
      {...mergeProps(props, toolbarProps, own)}
      ref={ref}
      data-slot="emoji-reaction-bar"
      data-orientation={orientation}
      className={cn("flex flex-wrap items-center gap-1 data-[orientation=vertical]:flex-col", className)}
    />
  );
}

export { EmojiReactionBar };
export type { EmojiReactionBarProps };
