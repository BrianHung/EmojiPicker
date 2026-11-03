import { EmojiPicker, Tapback, type EmojiSelection } from "@brianhung/emoji-picker";
import styles from "./index.module.css";

export function ReactionBar({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <Tapback onSelect={onSelect} className={styles.root} reactionsClassName={styles.reactions}>
      <EmojiPicker.Search className={styles.search} inputProps={{ className: styles.input }} />
      <EmojiPicker.Viewport className={styles.viewport}>
        <EmojiPicker.List cellClassName={styles.cell} headerClassName={styles.header} />
      </EmojiPicker.Viewport>
    </Tapback>
  );
}
