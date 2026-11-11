"use client";

import * as React from "react";
import { emojiPickerInitialFocus, useEmojiLabels } from "emoji-components";
import { buttonVariants } from "@/components/ui/button";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type EmojiPickerPopoverProps = Omit<React.ComponentProps<typeof EmojiPicker>, "children" | "className" | "aria-label"> &
  Pick<React.ComponentProps<typeof PopoverContent>, "side" | "align" | "finalFocus"> & {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
    "aria-label"?: string;
    children: React.ReactNode;
    picker?: React.ReactNode;
  };

function EmojiPickerPopover({ open: openProp, defaultOpen = false, onOpenChange, side = "bottom", align = "start", finalFocus, onSelect, className, "aria-label": ariaLabel, children, picker, ...props }: EmojiPickerPopoverProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const setOpen = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  };
  const labels = useEmojiLabels();
  const popup = React.useRef<HTMLDivElement>(null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={ariaLabel} className={cn(buttonVariants({ variant: "outline" }), className)}>
        {children}
      </PopoverTrigger>
      <PopoverContent ref={popup} side={side} align={align} initialFocus={() => emojiPickerInitialFocus(popup.current)} finalFocus={finalFocus} aria-label={labels.picker} className="w-auto overflow-hidden p-0">
        <EmojiPicker
          {...props}
          onSelect={(selection, details) => {
            onSelect?.(selection, details);
            if (!details.isCanceled) setOpen(false);
          }}
          className="rounded-none border-0 shadow-none"
        >
          {picker ?? (
            <>
              <EmojiPickerSearch autoFocus />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </>
          )}
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  );
}

export { EmojiPickerPopover };
export type { EmojiPickerPopoverProps };
