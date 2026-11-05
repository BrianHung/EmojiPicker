import type { EmojiTypeaheadOptions } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { linear } from "@/styles/linear/picker";
import { StyleAutocomplete } from "@/styles/variants";
import type { EmojiMenuProps } from ".";

export const linearEmojiOptions: EmojiTypeaheadOptions = { limit: 12 };

export function LinearEmojiMenu({ className, ...typeahead }: EmojiMenuProps) {
  return <StyleAutocomplete appStyle={linear} {...typeahead} className={cn("absolute bottom-full left-4 z-10 mb-1 max-w-[calc(100%-32px)] [line-height:calc(1.25/0.875)]", className)} />;
}
