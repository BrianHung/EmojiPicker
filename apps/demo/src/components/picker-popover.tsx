import * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker";
import { EmojiPopover as FloatingPopover } from "@brianhung/emoji-picker/floating-ui";
import { EmojiPopover as AriaPopover } from "@brianhung/emoji-picker/react-aria";
import { cn } from "@/lib/utils";
import { EmojiPickerCard } from "@/registry/emoji-picker";

export type PickerPopoverProps = {
  onSelect: (selection: EmojiSelection) => void;
  /** The trigger's contents ("🙂 Add reaction"). */
  children: React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  /** Trigger classes; replaces the default outline button look. */
  triggerClassName?: string;
  /** Accessible name of the trigger. */
  label?: string;
  /** A different picker inside (a product style). Picking closes the popover. */
  picker?: React.ReactNode;
  /** Which EmojiPopover: Floating UI (the root export) or React Aria. */
  adapter?: "floating-ui" | "react-aria";
  onOpenChange?: (open: boolean) => void;
};

/** A trigger that opens the picker in a popover; picking closes it. */
export function PickerPopover({ onSelect, children, side = "bottom", align = "start", triggerClassName, label = "Open emoji picker", picker, adapter = "floating-ui", onOpenChange }: PickerPopoverProps) {
  const EmojiPopover = adapter === "react-aria" ? AriaPopover : FloatingPopover;
  return (
    <EmojiPopover.Root onOpenChange={onOpenChange}>
      <EmojiPopover.Trigger
        aria-label={label}
        className={cn(
          "inline-flex items-center gap-2 text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:bg-accent",
          triggerClassName ?? "rounded-md border border-border px-3 py-2",
        )}
      >
        {children}
      </EmojiPopover.Trigger>
      {/* Scales from the trigger (--transform-origin) and fades: 150ms in, 100ms out, interruptible. Reduced motion keeps only the fade. */}
      <EmojiPopover.Content
        side={side}
        align={align}
        aria-label="Emoji picker"
        {...(adapter === "floating-ui" ? { duration: 100 } : {})}
        className="origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95"
      >
        {picker ?? <EmojiPickerCard onSelect={onSelect} />}
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}
