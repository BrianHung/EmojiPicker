import en from "@emoji-components/data/en/iamcal.json?url";
import { EmojiProvider, type CategoryOption, type CustomEmoji, type EmojiSelection } from "emoji-components";
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

const bufo = async ({ signal }: { signal: AbortSignal }): Promise<CustomEmoji[]> => (await fetch("/packs/bufo/pack.json", { signal })).json();

export function CustomEmojiPicker({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  return (
    <EmojiProvider data={en} customEmojis={bufo}>
      <EmojiPickerCard onSelect={onSelect} categories={categories} />
    </EmojiProvider>
  );
}
