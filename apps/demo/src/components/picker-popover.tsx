import * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker-react";
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";
import { cn } from "@/lib/utils";
import { EmojiPickerCard } from "@/registry/emoji-picker";
import { EmojiPickerPopoverContent } from "@/registry/emoji-picker-popover";

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
      <EmojiPickerPopoverContent side={side} align={align} aria-label="Emoji picker" finalFocus={() => (picked.current && focusAfterPick?.()) || true}>
        {picker ?? <EmojiPickerCard onSelect={onSelect} />}
      </EmojiPickerPopoverContent>
    </EmojiPopover.Root>
  );
}
