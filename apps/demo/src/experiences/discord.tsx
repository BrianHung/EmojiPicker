import type { EmojiTypeaheadOptions } from "@brianhung/emoji-picker-react";
import { cn } from "@/lib/utils";
import { discord, discordAutocompleteOptions } from "@/styles/discord/picker";
import { useFontStylesheet } from "@/styles/scene-kit";
import { StyleTypeahead } from "@/styles/variants";
import type { EmojiMenuProps } from ".";

export const discordEmojiOptions: EmojiTypeaheadOptions = discordAutocompleteOptions;

export function DiscordEmojiMenu({ className, ...typeahead }: EmojiMenuProps) {
  useFontStylesheet("https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap");
  return <StyleTypeahead appStyle={discord} {...typeahead} className={cn("absolute inset-x-0 bottom-full z-10 mb-2", className)} />;
}
