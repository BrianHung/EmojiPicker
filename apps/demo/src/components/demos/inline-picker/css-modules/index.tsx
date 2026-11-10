import { EmojiPicker, type EmojiSelection } from "emoji-components";
import styles from "./index.module.css";

export function InlinePicker({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root onSelect={onSelect} className={styles.root}>
      <EmojiPicker.Search className={styles.search}>
        <EmojiPicker.SearchInputGroup className={styles.field}>
          <EmojiPicker.SearchInput className={styles.input} />
<EmojiPicker.SearchClear className={styles.clear}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </EmojiPicker.SearchClear>
        </EmojiPicker.SearchInputGroup>
        <EmojiPicker.SkinTone className={styles.skinTone}>
          <EmojiPicker.SkinToneTrigger className={styles.tone}>
            <EmojiPicker.SkinToneGlyph />
          </EmojiPicker.SkinToneTrigger>
          <EmojiPicker.SkinToneOptions className={styles.tones}>
            {(tone) => (
              <EmojiPicker.SkinToneOption tone={tone} className={styles.tone}>
                <EmojiPicker.SkinToneGlyph />
              </EmojiPicker.SkinToneOption>
            )}
          </EmojiPicker.SkinToneOptions>
        </EmojiPicker.SkinTone>
      </EmojiPicker.Search>
      <EmojiPicker.Viewport className={styles.viewport}>
        <EmojiPicker.List renderEmptyState={({ status }) => status === "empty" && <div className={styles.empty}>No emoji found.</div>}>
          {() => (
            <EmojiPicker.ListSection>
              <EmojiPicker.ListSectionTitle className={styles.header} />
              <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className={styles.cell} />}</EmojiPicker.ListItems>
            </EmojiPicker.ListSection>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
      <EmojiPicker.CategoryNav className={styles.nav}>{() => <EmojiPicker.CategoryNavTab className={styles.tab} />}</EmojiPicker.CategoryNav>
    </EmojiPicker.Root>
  );
}
