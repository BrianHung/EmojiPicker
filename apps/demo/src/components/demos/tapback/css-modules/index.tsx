import { EmojiPicker, type EmojiSelection } from "emoji-components";
import styles from "./index.module.css";

export function ReactionBar({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root
      reactions={5}
      onSelect={(selection, { collapse }) => {
        onSelect(selection);
        collapse?.();
      }}
      className={styles.root}
    >
      <EmojiPicker.Reactions className={styles.reactions}>
        <EmojiPicker.ReactionsItems>{(emoji) => <EmojiPicker.ReactionsItem emoji={emoji} className={styles.reaction} />}</EmojiPicker.ReactionsItems>
        <EmojiPicker.ReactionsExpand className={styles.reaction} />
      </EmojiPicker.Reactions>
      <EmojiPicker.Panel className={styles.panel}>
        <EmojiPicker.Search className={styles.search}>
          <EmojiPicker.SearchInput className={styles.input} />
        </EmojiPicker.Search>
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
