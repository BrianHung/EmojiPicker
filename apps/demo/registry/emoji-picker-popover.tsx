"use client";

import * as React from "react";
import { useEmojiLabels } from "emoji-components";
import { buttonVariants } from "@/components/ui/button";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type EmojiPickerPopoverProps = Omit<React.ComponentProps<typeof EmojiPicker>, "children" | "className" | "aria-label"> &
  Pick<React.ComponentProps<typeof PopoverContent>, "side" | "align"> & {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
    "aria-label"?: string;
    children: React.ReactNode;
  };

function EmojiPickerPopover({ open: openProp, defaultOpen = false, onOpenChange, side = "bottom", align = "start", onSelect, className, "aria-label": ariaLabel, children, ...props }: EmojiPickerPopoverProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const setOpen = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  };
  const labels = useEmojiLabels();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger data-slot="emoji-picker-popover-trigger" aria-label={ariaLabel} className={cn(buttonVariants({ variant: "outline" }), className)}>
        {children}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} aria-label={labels.picker} className="w-auto overflow-hidden p-0">
        <EmojiPicker
          {...props}
          onSelect={(selection, details) => {
            onSelect?.(selection, details);
            if (!details.isCanceled) setOpen(false);
          }}
          className="rounded-none border-0 shadow-none"
        >
          <EmojiPickerSearch autoFocus />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  );
}

export { EmojiPickerPopover };
export type { EmojiPickerPopoverProps };
