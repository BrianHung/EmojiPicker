import type { UseEmojiSuggestionsReturnValue, UseEmojiSuggestionsOptions } from "emoji-components";
import { cn } from "@/lib/utils";
import { linear } from "./picker";
import { StyleTypeahead } from "@/styles/variants";

export const linearEmojiOptions: UseEmojiSuggestionsOptions = { limit: 12 };

export function LinearEmojiMenu({ className, ...typeahead }: UseEmojiSuggestionsReturnValue & { className?: string }) {
  return <StyleTypeahead appStyle={linear} {...typeahead} className={cn("absolute bottom-full left-4 z-10 mb-1 max-w-[calc(100%-32px)] [line-height:calc(1.25/0.875)]", className)} />;
}
