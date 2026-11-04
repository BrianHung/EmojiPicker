// Slack's ":" list docks over its composer: the card's bottom 3px into the editor, left edges aligned.
import type { EmojiTypeaheadOptions } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { slack } from "@/styles/slack/picker";
import { StyleAutocomplete } from "@/styles/variants";
import type { EmojiMenuProps } from ".";

export const slackEmojiOptions: EmojiTypeaheadOptions = { limit: 25 };

/** Render inside the composer's `relative` box, next to the editor. */
export function SlackEmojiMenu({ className, ...typeahead }: EmojiMenuProps) {
  return <StyleAutocomplete appStyle={slack} {...typeahead} className={cn("absolute bottom-[calc(100%-3px)] left-0 z-10", className)} />;
}
