import { EmojiPicker, useFrequentEmoji, type EmojiSelection } from "@brianhung/emoji-picker-react";
import styles from "./index.module.css";

export function ReactionBar({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPicker.Root
      reactions={useFrequentEmoji(5)}
      onSelect={(selection, { collapse }) => {
        onSelect(selection);
        collapse?.();
      }}
      className={styles.root}
    >
      <EmojiPicker.Reactions className={styles.reactions}>
        <EmojiPicker.Reactions.Items>{(emoji) => <EmojiPicker.Reactions.Item emoji={emoji} className={styles.reaction} />}</EmojiPicker.Reactions.Items>
        <EmojiPicker.Reactions.Expand className={styles.reaction} />
      </EmojiPicker.Reactions>
      <EmojiPicker.Panel className={styles.panel}>
        <EmojiPicker.Search className={styles.search}>
          <EmojiPicker.Search.Input className={styles.input} />
        </EmojiPicker.Search>
        <EmojiPicker.Viewport className={styles.viewport}>
          <EmojiPicker.List>
            {() => (
              <EmojiPicker.List.Section>
                <EmojiPicker.List.SectionTitle className={styles.header} />
                <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className={styles.cell} />}</EmojiPicker.List.Items>
              </EmojiPicker.List.Section>
            )}
          </EmojiPicker.List>
        </EmojiPicker.Viewport>
      </EmojiPicker.Panel>
    </EmojiPicker.Root>
  );
}
