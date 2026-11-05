import { Emoji, useEmojiStore, type EmojiTypeahead } from "@brianhung/emoji-picker-react";
import { EmojiSuggestions } from "@brianhung/emoji-picker-react/floating-ui";
import { cn } from "@/lib/utils";

export type SuggestionMenuProps = { className?: string; side?: "top" | "bottom" };

export function SuggestionMenu({ open, anchor, dismiss, suggestions: menu, className, side }: EmojiTypeahead & SuggestionMenuProps) {
  const store = useEmojiStore();
  return (
    <EmojiSuggestions.Popover open={open} onOpenChange={(next) => !next && dismiss()} anchor={anchor} side={side} sideOffset={6}>
      <ul {...menu.getListProps()} aria-label="Emoji suggestions" className={cn("w-64 overflow-hidden rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg", className)}>
        {menu.suggestions.map((s, i) => {
          const [start, end] = s.match ?? [0, 0];
          return (
            <li key={s.record.unified} {...menu.getOptionProps(i)} className="flex h-8 cursor-default items-center gap-2 rounded-md px-2 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
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
    </EmojiSuggestions.Popover>
  );
}
