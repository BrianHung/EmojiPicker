"use client";

import * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker-react";
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
  "aria-label": ariaLabel,
}: {
  onSelect: (selection: EmojiSelection) => void;
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
      <PopoverContent side={side} align={align} aria-label="Emoji picker" className="w-auto overflow-hidden p-0">
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
