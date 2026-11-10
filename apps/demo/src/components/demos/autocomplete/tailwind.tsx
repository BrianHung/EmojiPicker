import * as React from "react";
import { Emoji, useTextFieldEmojiSuggestions } from "emoji-components";
import { EmojiSuggestions } from "emoji-components/floating-ui";

export function ShortcodeSuggestions() {
  const ref = React.useRef<HTMLInputElement>(null);
  const menu = useTextFieldEmojiSuggestions(ref, { limit: 6 });
  const { open, anchor, dismiss } = menu;
  return (
    <>
      <input
        ref={ref}
        aria-label="Message"
        placeholder="Type :tada or :thu"
        className="h-10 w-full max-w-[352px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      />
      <EmojiSuggestions.Root open={open} onOpenChange={(next) => !next && dismiss()}>
        <EmojiSuggestions.Portal>
          <EmojiSuggestions.Positioner anchor={anchor} side="top" sideOffset={6}>
            <EmojiSuggestions.Popup>
              <ul {...menu.getListProps()} className="max-h-64 w-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg">
                {menu.suggestions.map((s, i) => (
                  <li key={`${s.record.unified}:${s.shortcode}`} {...menu.getOptionProps(i)} className="flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 data-[highlighted]:bg-accent">
                    <Emoji emoji={s.record.unified} size={20} className="text-xl leading-none" />
                    <span className="font-medium">:{s.shortcode}:</span>
                  </li>
                ))}
              </ul>
            </EmojiSuggestions.Popup>
          </EmojiSuggestions.Positioner>
        </EmojiSuggestions.Portal>
      </EmojiSuggestions.Root>
    </>
  );
}
