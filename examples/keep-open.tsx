"use client";

import type { EmojiSelection } from "emoji-components";
import { EmojiPopover } from "emoji-components/floating-ui";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";

export function EmojiButton({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPopover.Root onOpenChange={(_open, details) => details.reason === "item-press" && details.cancel()}>
      <EmojiPopover.Trigger aria-label="Add emoji">😀</EmojiPopover.Trigger>
      <EmojiPopover.Portal>
        <EmojiPopover.Positioner>
          <EmojiPopover.Popup aria-label="Emoji picker">
            <EmojiPicker onSelect={onSelect}>
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
