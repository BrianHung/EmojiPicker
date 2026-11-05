import { EmojiPicker, type EmojiSelection } from "@brianhung/emoji-picker-react";
import styles from "./index.module.css";

export function InlinePicker({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root onSelect={onSelect} className={styles.root}>
      <EmojiPicker.Search className={styles.search}>
        <EmojiPicker.Search.Input className={styles.input} />
        <EmojiPicker.SkinTone className={styles.skinTone}>
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
        <EmojiPicker.List renderEmptyState={({ status }) => status === "empty" && <div className={styles.empty}>No emoji found.</div>}>
          {() => (
            <EmojiPicker.List.Section>
              <EmojiPicker.List.SectionTitle className={styles.header} />
              <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className={styles.cell} />}</EmojiPicker.List.Items>
            </EmojiPicker.List.Section>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
      <EmojiPicker.CategoryNav className={styles.nav}>{() => <EmojiPicker.CategoryNav.Tab className={styles.tab} />}</EmojiPicker.CategoryNav>
    </EmojiPicker.Root>
  );
}
