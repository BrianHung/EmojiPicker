import type { EmojiItem, EmojiSelection } from "emoji-components";
import { EmojiPicker, EmojiPickerCell, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import styles from "./index.module.css";

const roundCell = (emoji: EmojiItem) => <EmojiPickerCell render={<button title={`:${emoji.record.shortcodes[0] ?? emoji.record.name}:`} />} className={styles.cell} />;

export function CellsAndRowsPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker onSelect={onSelect} columns={6} className={styles.root}>
      <EmojiPickerSearch />
      <EmojiPickerContent>{roundCell}</EmojiPickerContent>
      <EmojiPickerFooter />
    </EmojiPicker>
  );
}
