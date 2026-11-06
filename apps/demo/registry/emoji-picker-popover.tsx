"use client";

import type * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker-react";
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";
import { buttonVariants } from "@/components/ui/button";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import { cn } from "@/lib/utils";

function EmojiPickerPopoverContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset = 0,
  container,
  ...props
}: Omit<EmojiPopover.Popup.Props, "className"> & Pick<EmojiPopover.Positioner.Props, "side" | "align" | "sideOffset" | "alignOffset"> & Pick<EmojiPopover.Portal.Props, "container"> & { className?: string }) {
  return (
    <EmojiPopover.Portal container={container}>
      <EmojiPopover.Positioner side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset}>
        <EmojiPopover.Popup
          className={cn(
            "origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95",
            className,
          )}
          {...props}
        />
      </EmojiPopover.Positioner>
    </EmojiPopover.Portal>
  );
}

function EmojiPickerPopover({
  onSelect,
  side,
  align,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  onSelect: (selection: EmojiSelection) => void;
  side?: EmojiPopover.Positioner.Props["side"];
  align?: EmojiPopover.Positioner.Props["align"];
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <EmojiPopover.Root>
      <EmojiPopover.Trigger aria-label={ariaLabel} className={cn(buttonVariants({ variant: "outline" }), className)}>
        {children}
      </EmojiPopover.Trigger>
      <EmojiPickerPopoverContent side={side} align={align} aria-label="Emoji picker">
        <EmojiPickerCard onSelect={onSelect} />
      </EmojiPickerPopoverContent>
    </EmojiPopover.Root>
  );
}

export { EmojiPickerPopover, EmojiPickerPopoverContent };
