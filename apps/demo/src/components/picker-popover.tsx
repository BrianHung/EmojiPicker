import type * as React from "react";
import type { EmojiSelection, PopoverFinalFocus } from "@brianhung/emoji-picker-react";
import { EmojiPopover as FloatingPopover } from "@brianhung/emoji-picker-react/floating-ui";
import { EmojiPopover as AriaPopover } from "@brianhung/emoji-picker-react/react-aria";
import { cn } from "@/lib/utils";
import { EmojiPickerCard } from "@/registry/emoji-picker";

export type PickerPopoverProps = {
  onSelect: (selection: EmojiSelection) => void;
  children: React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  label?: string;
  picker?: React.ReactNode;
  adapter?: "floating-ui" | "react-aria";
  onOpenChange?: (open: boolean) => void;
  finalFocus?: PopoverFinalFocus;
  renderTrigger?: (trigger: React.ReactElement) => React.ReactNode;
};

export function PickerPopover({
  onSelect,
  children,
  side = "bottom",
  align = "start",
  triggerClassName,
  label = "Open emoji picker",
  picker,
  adapter = "floating-ui",
  onOpenChange,
  finalFocus,
  renderTrigger = (t) => t,
}: PickerPopoverProps) {
  const EmojiPopover = adapter === "react-aria" ? AriaPopover : FloatingPopover;
  return (
    <EmojiPopover.Root onOpenChange={onOpenChange}>
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
      <EmojiPopover.Content
        side={side}
        align={align}
        aria-label="Emoji picker"
        finalFocus={finalFocus}
        {...(adapter === "floating-ui" ? { duration: 100 } : {})}
        className="origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95"
      >
        {picker ?? <EmojiPickerCard onSelect={onSelect} />}
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}
