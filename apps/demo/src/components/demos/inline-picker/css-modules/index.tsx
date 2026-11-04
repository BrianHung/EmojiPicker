import { EmojiPicker, type EmojiSelection } from "@brianhung/emoji-picker";
import styles from "./index.module.css";

export function InlinePicker({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root onSelect={onSelect} autoFocusSearch={false} className={styles.root}>
      <EmojiPicker.Search className={styles.search}>
        <EmojiPicker.Search.Input className={styles.input} />
        <EmojiPicker.SkinTone>
          <EmojiPicker.SkinTone.Trigger className={styles.tone}>
            <EmojiPicker.SkinTone.Glyph />
          </EmojiPicker.SkinTone.Trigger>
          <EmojiPicker.SkinTone.Options className={styles.tones}>
            {(tone) => (
              <EmojiPicker.SkinTone.Option tone={tone} className={styles.tone}>
                <EmojiPicker.SkinTone.Glyph />
              </EmojiPicker.SkinTone.Option>
            )}
          </EmojiPicker.SkinTone.Options>
        </EmojiPicker.SkinTone>
      </EmojiPicker.Search>
      <EmojiPicker.Viewport className={styles.viewport}>
        <EmojiPicker.List cellClassName={styles.cell} headerClassName={styles.header} />
        <EmojiPicker.Empty className={styles.empty}>No emoji found.</EmojiPicker.Empty>
      </EmojiPicker.Viewport>
      <EmojiPicker.CategoryNav className={styles.nav} tabClassName={styles.tab} />
    </EmojiPicker.Root>
  );
}
