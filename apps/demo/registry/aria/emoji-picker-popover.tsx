"use client";

import * as React from "react";
import { useEmojiLabels } from "emoji-components";
import { Button } from "@/components/ui/button";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

type EmojiPickerPopoverProps = Omit<React.ComponentProps<typeof EmojiPicker>, "children" | "className" | "aria-label"> &
  Pick<React.ComponentProps<typeof Popover>, "placement"> & {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
    "aria-label"?: string;
    children: React.ReactNode;
    picker?: React.ReactNode;
  };

function EmojiPickerPopover({ open: openProp, defaultOpen = false, onOpenChange, placement = "bottom start", onSelect, className, "aria-label": ariaLabel, children, picker, ...props }: EmojiPickerPopoverProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const setOpen = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  };
  const labels = useEmojiLabels();
  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button variant="outline" aria-label={ariaLabel} className={className}>
        {children}
      </Button>
      <Popover placement={placement} aria-label={labels.picker} className="w-auto overflow-hidden p-0">
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
      </Popover>
    </PopoverTrigger>
  );
}

export { EmojiPickerPopover };
export type { EmojiPickerPopoverProps };
