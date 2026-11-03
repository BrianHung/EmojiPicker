import { EmojiPicker, type EmojiSelection } from "@brianhung/emoji-picker";
import styles from "./index.module.css";

export function InlinePicker({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root onSelect={onSelect} autoFocusSearch={false} className={styles.root}>
      <EmojiPicker.Search className={styles.search} inputProps={{ className: styles.input }}>
        <EmojiPicker.SkinTone />
      </EmojiPicker.Search>
      <EmojiPicker.Viewport className={styles.viewport}>
        <EmojiPicker.List cellClassName={styles.cell} headerClassName={styles.header} />
        <EmojiPicker.Empty className={styles.empty}>No emoji found.</EmojiPicker.Empty>
      </EmojiPicker.Viewport>
      <EmojiPicker.CategoryNav className={styles.nav} tabClassName={styles.tab} />
    </EmojiPicker.Root>
  );
}
