import type { EmojiItem, EmojiSelection } from "@brianhung/emoji-picker-react";
import { EmojiPickerCard, EmojiPickerCell } from "@/components/ui/emoji-picker";

const roundCell = (emoji: EmojiItem) => <EmojiPickerCell render={<button title={`:${emoji.record.shortcodes[0] ?? emoji.record.name}:`} />} className="leading-none hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring" />;

export function CellsAndRowsPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return <EmojiPickerCard onSelect={onSelect} cell={roundCell} columns={6} className="h-[420px] [--emoji-cell-size:44px] [--emoji-size:26px]" />;
}
