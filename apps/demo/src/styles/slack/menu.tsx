import type { UseEmojiSuggestionsReturnValue, UseEmojiSuggestionsOptions } from "emoji-components";
import { cn } from "@/lib/utils";
import { slack } from "./picker";
import { StyleSuggestions } from "@/styles/variants";

export const slackEmojiOptions: UseEmojiSuggestionsOptions = { limit: 25 };

export function SlackEmojiMenu({ className, ...suggestions }: UseEmojiSuggestionsReturnValue & { className?: string }) {
  return <StyleSuggestions appStyle={slack} {...suggestions} className={cn("absolute bottom-[calc(100%-3px)] left-0 z-10", className)} />;
}
