import type { EmojiItem } from "emoji-components";
import { EmojiPickerCard, EmojiPickerCell } from "@/components/ui/emoji-picker";

const cell = (emoji: EmojiItem) => <EmojiPickerCell render={<button type="button" title={`:${emoji.record.shortcodes[0] ?? emoji.record.name}:`} />} className="leading-none hover:scale-125" />;

export function LargeCellPicker() {
  return <EmojiPickerCard cell={cell} columns={6} className="h-[420px] [--emoji-picker-cell-size:44px] [--emoji-picker-emoji-size:26px]" />;
}
