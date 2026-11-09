import { EmojiPopover } from "emoji-components/floating-ui";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";

export function EmojiButton({ onEmoji }: { onEmoji: (emoji: string) => void }) {
  return (
    <EmojiPopover.Root onOpenChange={(_open, details) => details.reason === "item-press" && details.cancel()}>
      <EmojiPopover.Trigger aria-label="Add emoji">😀</EmojiPopover.Trigger>
      <EmojiPopover.Portal>
        <EmojiPopover.Positioner>
          <EmojiPopover.Popup aria-label="Emoji picker">
            <EmojiPickerCard onSelect={({ emoji }) => emoji && onEmoji(emoji)} />
          </EmojiPopover.Popup>
        </EmojiPopover.Positioner>
      </EmojiPopover.Portal>
    </EmojiPopover.Root>
  );
}
