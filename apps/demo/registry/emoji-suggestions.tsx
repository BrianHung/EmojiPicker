"use client";

import { Emoji, useEmojiStore, type UseEmojiSuggestionsReturnValue } from "emoji-components";
import { EmojiSuggestions as EmojiSuggestionsPrimitive } from "emoji-components/floating-ui";
import { cn } from "@/lib/utils";

type EmojiSuggestionsProps = UseEmojiSuggestionsReturnValue & Pick<EmojiSuggestionsPrimitive.Positioner.Props, "side" | "align"> & { className?: string };

function EmojiSuggestions({ open, anchor, dismiss, suggestions, getListProps, getOptionProps, side, align, className }: EmojiSuggestionsProps) {
  const store = useEmojiStore();
  return (
    <EmojiSuggestionsPrimitive.Root open={open} onOpenChange={(next) => !next && dismiss()}>
      <EmojiSuggestionsPrimitive.Portal>
        <EmojiSuggestionsPrimitive.Positioner anchor={anchor} side={side} align={align} sideOffset={6}>
          <EmojiSuggestionsPrimitive.Popup>
            <ul {...getListProps()} data-slot="emoji-suggestions" className={cn("w-64 overflow-hidden rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg", className)}>
              {suggestions.map((s, i) => {
                const [start, end] = s.match ?? [0, 0];
                return (
                  <li key={s.record.unified} {...getOptionProps(i)} className="flex h-8 cursor-default items-center gap-2 rounded-md px-2 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
                    <Emoji emoji={store.withSkinTone(s.record.unified)} size={18} className="shrink-0 leading-none" />
                    <span className="truncate font-mono text-[13px]">
                      :{s.shortcode.slice(0, start)}
                      <b className="font-semibold">{s.shortcode.slice(start, end)}</b>
                      {s.shortcode.slice(end)}:
                    </span>
                  </li>
                );
              })}
            </ul>
          </EmojiSuggestionsPrimitive.Popup>
        </EmojiSuggestionsPrimitive.Positioner>
      </EmojiSuggestionsPrimitive.Portal>
    </EmojiSuggestionsPrimitive.Root>
  );
}

export { EmojiSuggestions };
export type { EmojiSuggestionsProps };
