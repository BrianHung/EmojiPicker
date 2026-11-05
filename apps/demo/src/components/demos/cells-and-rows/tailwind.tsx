import { Emoji, useEmojiStore, useFrequentEmoji, type EmojiItem, type EmojiSelection } from "@brianhung/emoji-picker-react";
import { EmojiPickerCard, EmojiPickerCell } from "@/components/ui/emoji-picker";

function QuickRow({ onPick }: { onPick: (selection: EmojiSelection) => void }) {
  const store = useEmojiStore();
  const top = useFrequentEmoji({ limit: 8 }).items;
  return (
    <div className="flex flex-col gap-1 border-b border-border px-2 pb-2">
      <div className="px-1 text-xs font-medium text-muted-foreground">Quick reactions</div>
      <div className="flex justify-between">
        {top.map((unified) => (
          <button
            key={unified}
            type="button"
            className="flex size-9 items-center justify-center rounded-full text-[22px] hover:bg-accent"
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

const roundCell = (emoji: EmojiItem) => <EmojiPickerCell render={<button title={`:${emoji.record.shortcodes[0] ?? emoji.record.name}:`} />} className="leading-none hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring" />;

export function CellsAndRowsPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiPickerCard
     
      onSelect={onSelect}
      rows={<QuickRow onPick={onSelect} />}
      cell={roundCell}
      columns={7}
      frequent={false}
      className="h-[420px] [--emoji-cell-size:44px] [--emoji-size:26px]"
    />
  );
}
