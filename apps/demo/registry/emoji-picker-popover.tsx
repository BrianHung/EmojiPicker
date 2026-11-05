"use client";

import * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker";
import { buttonVariants } from "@/components/ui/button";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function EmojiPickerPopover({
  onSelect,
  side = "bottom",
  align = "start",
  className,
  children,
  finalFocus,
  "aria-label": ariaLabel,
}: {
  onSelect: (selection: EmojiSelection) => void;
  /** Focused once the popover closes, instead of the trigger (an editor). Base UI's finalFocus. */
  finalFocus?: React.ComponentProps<typeof PopoverContent>["finalFocus"];
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={ariaLabel} className={cn(buttonVariants({ variant: "outline" }), className)}>
        {children}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} finalFocus={finalFocus} aria-label="Emoji picker" className="w-auto overflow-hidden p-0">
        <EmojiPickerCard
          autoFocus
          onSelect={(selection) => {
            onSelect(selection);
            setOpen(false);
          }}
          className="rounded-none border-0 shadow-none"
        />
      </PopoverContent>
    </Popover>
  );
}

export { EmojiPickerPopover };
