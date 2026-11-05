import { Emoji, useEmojiStore, useFrequentEmoji, type EmojiItem, type EmojiSelection } from "@brianhung/emoji-picker";
import { EmojiPickerCard, EmojiPickerCell } from "@/components/ui/emoji-picker";
import styles from "./index.module.css";

function QuickRow({ onPick }: { onPick: (selection: EmojiSelection) => void }) {
  const store = useEmojiStore();
  const top = useFrequentEmoji(8);
  return (
    <div className={styles.row}>
      <div className={styles.label}>Quick reactions</div>
      <div className={styles.reactions}>
        {top.map((unified) => (
          <button
            key={unified}
            type="button"
            className={styles.reaction}
            onClick={() => {
              const selection = store.select(store.withSkinTone(unified));
              if (selection) onPick(selection);
            }}
          >
            <Emoji emoji={store.withSkinTone(unified)} size={22} />
          </button>
        ))}
      </div>
    </div>
  );
}

const roundCell = (emoji: EmojiItem) => <EmojiPickerCell render={<button title={`:${emoji.record.shortcodes[0] ?? emoji.record.name}:`} />} className={styles.cell} />;

export function CellsAndRowsPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return <EmojiPickerCard autoFocusSearch={false} onSelect={onSelect} rows={<QuickRow onPick={onSelect} />} cell={roundCell} columns={7} frequent={false} className={styles.root} />;
}
