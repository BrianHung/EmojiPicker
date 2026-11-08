import * as React from "react";
import type { EmojiSelection } from "emoji-components";
import { EmojiPopover } from "emoji-components/floating-ui";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import styles from "./index.module.css";

export function PopoverPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  return (
    <EmojiPopover.Root>
      <EmojiPopover.Trigger aria-label="Open emoji picker" className={styles.trigger}>
        <span className={styles.emoji}>{picked?.emoji || "🙂"}</span> Add reaction
      </EmojiPopover.Trigger>
      <EmojiPopover.Portal>
        <EmojiPopover.Positioner>
          <EmojiPopover.Popup aria-label="Emoji picker" className={styles.popup}>
            <EmojiPickerCard
              onSelect={(selection) => {
                setPicked(selection);
                onSelect(selection);
              }}
            />
          </EmojiPopover.Popup>
        </EmojiPopover.Positioner>
      </EmojiPopover.Portal>
    </EmojiPopover.Root>
  );
}
