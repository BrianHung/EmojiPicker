"use client";

import * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker-react";
import { Button } from "@/components/ui/button";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

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
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button variant="outline" aria-label={ariaLabel} className={className}>
        {children}
      </Button>
      <Popover placement={align === "center" ? side : `${side} ${align}`} aria-label="Emoji picker" className="w-auto overflow-hidden p-0">
        <EmojiPickerCard
          autoFocus
          onSelect={(selection) => {
            onSelect(selection);
            setOpen(false);
          }}
          className="rounded-none border-0 shadow-none"
        />
      </Popover>
    </PopoverTrigger>
  );
}

export { EmojiPickerPopover };
