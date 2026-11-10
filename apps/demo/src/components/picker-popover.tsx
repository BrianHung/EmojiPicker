import * as React from "react";
import type { EmojiSelection } from "emoji-components";
import { EmojiPopover } from "emoji-components/floating-ui";
import { cn } from "@/lib/utils";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/registry/emoji-picker";

export type PickerPopoverProps = {
  onSelect: (selection: EmojiSelection) => void;
  children: React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  label?: string;
  picker?: React.ReactNode;
  focusAfterPick?: () => HTMLElement | null;
  renderTrigger?: (trigger: React.ReactElement) => React.ReactNode;
};

export function PickerPopover({ onSelect, children, side = "bottom", align = "start", triggerClassName, label = "Open emoji picker", picker, focusAfterPick, renderTrigger = (t) => t }: PickerPopoverProps) {
  const picked = React.useRef(false);
  return (
    <EmojiPopover.Root onOpenChange={(_, details) => void (picked.current = details.reason === "item-press")}>
      {renderTrigger(
        <EmojiPopover.Trigger
          aria-label={label}
          className={cn(
            "inline-flex items-center gap-2 text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background data-popup-open:bg-accent",
            triggerClassName ?? "rounded-md border border-border px-3 py-2",
          )}
        >
          {children}
        </EmojiPopover.Trigger>,
      )}
      <EmojiPopover.Portal>
        <EmojiPopover.Positioner side={side} align={align}>
          <EmojiPopover.Popup
            aria-label="Emoji picker"
            finalFocus={() => (picked.current && focusAfterPick?.()) || true}
            className="origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95"
          >
            {picker ?? (
              <EmojiPicker onSelect={onSelect}>
                <EmojiPickerSearch />
                <EmojiPickerContent />
                <EmojiPickerFooter />
              </EmojiPicker>
            )}
          </EmojiPopover.Popup>
        </EmojiPopover.Positioner>
      </EmojiPopover.Portal>
    </EmojiPopover.Root>
  );
}
