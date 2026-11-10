import * as React from "react";
import type { EmojiSelection } from "emoji-components";
import { EmojiPopover } from "emoji-components/floating-ui";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";

export function PopoverPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  return (
    <EmojiPopover.Root>
      <EmojiPopover.Trigger
        aria-label="Open emoji picker"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm transition-transform outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] data-popup-open:bg-accent"
      >
        <span className="text-base">{picked?.emoji || "🙂"}</span> Add reaction
      </EmojiPopover.Trigger>
      <EmojiPopover.Portal>
        <EmojiPopover.Positioner>
          <EmojiPopover.Popup
            aria-label="Emoji picker"
            className="origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95"
          >
            <EmojiPicker
              onSelect={(selection) => {
                setPicked(selection);
                onSelect(selection);
              }}
            >
              <EmojiPickerSearch />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
          </EmojiPopover.Popup>
        </EmojiPopover.Positioner>
      </EmojiPopover.Portal>
    </EmojiPopover.Root>
  );
}
