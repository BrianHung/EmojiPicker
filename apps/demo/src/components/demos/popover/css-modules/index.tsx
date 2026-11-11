import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { emojiPickerInitialFocus, type EmojiSelection } from "emoji-components";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import styles from "./index.module.css";

export function PopoverPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<EmojiSelection | null>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label="Open emoji picker" className={styles.trigger}>
        <span className={styles.emoji}>{picked?.emoji || "🙂"}</span> Add reaction
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={8} positionMethod="fixed" className={styles.positioner}>
          <Popover.Popup ref={popup} initialFocus={() => emojiPickerInitialFocus(popup.current)} aria-label="Emoji picker" className={styles.popup}>
            <EmojiPicker
              onSelect={(selection) => {
                setPicked(selection);
                onSelect(selection);
                setOpen(false);
              }}
            >
              <EmojiPickerSearch autoFocus />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
