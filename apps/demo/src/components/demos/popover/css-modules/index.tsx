import * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker-react";
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";
import styles from "./index.module.css";

export function PopoverPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  return (
    <EmojiPopover.Root>
      <EmojiPopover.Trigger aria-label="Open emoji picker" className={styles.trigger}>
        <span className={styles.emoji}>{picked?.emoji || "🙂"}</span> Add reaction
      </EmojiPopover.Trigger>
      <EmojiPopover.Content aria-label="Emoji picker" duration={100} className={styles.content}>
        <EmojiPickerCard
          onSelect={(selection) => {
            setPicked(selection);
            onSelect(selection);
          }}
        />
      </EmojiPopover.Content>
    </EmojiPopover.Root>
  );
}
