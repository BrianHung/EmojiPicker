import { EmojiPicker, type EmojiSelection } from "emoji-components";
import styles from "./index.module.css";

export function ReactionBar({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root
      reactions={5}
      onSelect={onSelect}
      className={styles.root}
    >
      <EmojiPicker.Reactions className={styles.reactions}>
        <EmojiPicker.ReactionsItems>{(emoji) => <EmojiPicker.ReactionsItem emoji={emoji} className={styles.reaction} />}</EmojiPicker.ReactionsItems>
        <EmojiPicker.ReactionsExpand className={styles.reaction} />
      </EmojiPicker.Reactions>
      <EmojiPicker.Panel className={styles.panel}>
        <div className={styles.search}>
          <EmojiPicker.Search className={styles.field}>
            <EmojiPicker.SearchInput className={styles.input} />
            <EmojiPicker.SearchClear className={styles.clear}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </EmojiPicker.SearchClear>
          </EmojiPicker.Search>
        </div>
        <EmojiPicker.Viewport className={styles.viewport}>
          <EmojiPicker.List>
            {() => (
              <EmojiPicker.ListSection>
                <EmojiPicker.ListSectionTitle className={styles.header} />
                <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className={styles.cell} />}</EmojiPicker.ListItems>
              </EmojiPicker.ListSection>
            )}
          </EmojiPicker.List>
        </EmojiPicker.Viewport>
      </EmojiPicker.Panel>
    </EmojiPicker.Root>
  );
}
