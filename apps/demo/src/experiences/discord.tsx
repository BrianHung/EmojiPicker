// Discord's ":" list docks 8px above its composer, 12px in from either side, matches A–Z.
import type { EmojiTypeaheadOptions } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { discord, discordAutocompleteOptions } from "@/styles/discord/picker";
import { useFontStylesheet } from "@/styles/scene-kit";
import { StyleAutocomplete } from "@/styles/variants";
import type { EmojiMenuProps } from ".";

export const discordEmojiOptions: EmojiTypeaheadOptions = discordAutocompleteOptions;

/** Render inside the composer's `relative` box, next to the editor. */
export function DiscordEmojiMenu({ className, ...typeahead }: EmojiMenuProps) {
  useFontStylesheet("https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap");
  return <StyleAutocomplete appStyle={discord} {...typeahead} className={cn("absolute inset-x-0 bottom-full z-10 mb-2", className)} />;
}
