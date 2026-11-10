import { EmojiProvider, type CategoryOption, type CustomEmoji, type EmojiSelection } from "emoji-components";
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker";

const categories: CategoryOption[] = [
  { id: "frequent", name: "Frequently used" },
  { id: "custom:Bufo", name: "Bufo" },
  { id: "smileys-people" },
  { id: "animals-nature" },
  { id: "food-drink" },
  { id: "activities" },
  { id: "objects" },
  { id: "symbols" },
];

const bufo = async ({ signal }: { signal: AbortSignal }): Promise<CustomEmoji[]> => (await fetch("/packs/bufo/pack.json", { signal })).json();

export function CustomEmojiPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiProvider customEmojis={bufo}>
      <EmojiPicker onSelect={onSelect} categories={categories}>
        <EmojiPickerSearch />
        <EmojiPickerContent />
        <EmojiPickerFooter />
      </EmojiPicker>
    </EmojiProvider>
  );
}
