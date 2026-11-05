import en from "@brianhung/emoji-picker-core/data/en.json?url";
import { EmojiProvider, type CategoryOption, type EmojiSelection } from "@brianhung/emoji-picker-react";
import { EmojiPickerCard } from "@/components/ui/emoji-picker";

const categories: CategoryOption[] = [
  { id: "suggested", name: "Frequently used" },
  { id: "custom:Bufo", name: "Bufo" },
  { id: "smileys_people" },
  { id: "animals_nature" },
  { id: "food_drink" },
  { id: "activities" },
  { id: "objects" },
  { id: "symbols" },
];

export function CustomEmojiPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiProvider data={en} customEmojis="/packs/bufo/pack.json">
      <EmojiPickerCard onSelect={onSelect} categories={categories} />
    </EmojiProvider>
  );
}
