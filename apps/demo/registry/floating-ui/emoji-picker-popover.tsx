"use client";

import * as React from "react";
import { autoUpdate, flip, FloatingFocusManager, FloatingPortal, offset, type Placement, shift, size, useClick, useDismiss, useFloating, useInteractions, useRole } from "@floating-ui/react";
import { emojiPickerInitialFocus, useEmojiLabels } from "emoji-components";
import { buttonVariants } from "@/components/ui/button";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import { cn } from "@/lib/utils";

type EmojiPickerPopoverProps = Omit<React.ComponentProps<typeof EmojiPicker>, "children" | "className" | "aria-label"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
  picker?: React.ReactNode;
  finalFocus?: React.RefObject<HTMLElement | null>;
};

function EmojiPickerPopover({ open: openProp, defaultOpen = false, onOpenChange, placement = "bottom-start", onSelect, className, finalFocus, "aria-label": ariaLabel, children, picker, ...props }: EmojiPickerPopoverProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const setOpen = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  };
  const labels = useEmojiLabels();
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 }), size({ padding: 8, apply: ({ availableHeight, elements }) => void elements.floating.style.setProperty("max-height", `${Math.floor(availableHeight)}px`) })],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([useClick(context), useDismiss(context), useRole(context)]);
  // Read as the popup opens
  const initialFocus = { get current() { return emojiPickerInitialFocus(refs.floating.current); } } as React.MutableRefObject<HTMLElement | null>;
  return (
    <>
      <button type="button" ref={refs.setReference} aria-label={ariaLabel} className={cn(buttonVariants({ variant: "outline" }), className)} {...getReferenceProps()}>
        {children}
      </button>
      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={initialFocus} returnFocus={finalFocus ?? true}>
            <div ref={refs.setFloating} style={floatingStyles} aria-label={labels.picker} className="z-50 flex overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden" {...getFloatingProps()}>
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
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
}

export { EmojiPickerPopover };
export type { EmojiPickerPopoverProps };
