import type { EmojiItem, EmojiSelection } from "emoji-components";
import { EmojiPickerCard, EmojiPickerCell } from "@/components/ui/emoji-picker";
import styles from "./index.module.css";

const roundCell = (emoji: EmojiItem) => <EmojiPickerCell render={<button title={`:${emoji.record.shortcodes[0] ?? emoji.record.name}:`} />} className={styles.cell} />;

export function CellsAndRowsPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return <EmojiPickerCard onSelect={onSelect} cell={roundCell} columns={6} className={styles.root} />;
}
