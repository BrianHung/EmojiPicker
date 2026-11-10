"use client";

import * as React from "react";
import { autoUpdate, flip, FloatingPortal, offset, type Placement, shift, size, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import { Emoji, useEmojiStore, type UseEmojiSuggestionsReturnValue } from "emoji-components";
import { cn } from "@/lib/utils";

type EmojiSuggestionsProps = UseEmojiSuggestionsReturnValue & { placement?: Placement; className?: string };

function EmojiSuggestions({ open, anchor, dismiss, suggestions, getListProps, getOptionProps, placement = "bottom-start", className }: EmojiSuggestionsProps) {
  const store = useEmojiStore();
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next) => next || dismiss(),
    placement,
    strategy: "fixed",
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 8, crossAxis: false }),
      shift({ padding: 8 }),
      size({ padding: 8, apply: ({ availableHeight, elements }) => void elements.floating.style.setProperty("max-height", `${Math.floor(availableHeight)}px`) }),
    ],
  });
  // The field keeps focus and handles the keys, Escape included
  React.useLayoutEffect(() => refs.setPositionReference(anchor), [refs, anchor]);
  const { getFloatingProps } = useInteractions([useDismiss(context, { escapeKey: false })]);
  if (!open) return null;
  return (
    <FloatingPortal>
      <ul
        ref={refs.setFloating}
        style={floatingStyles}
        {...getListProps(getFloatingProps())}
        data-slot="emoji-suggestions"
        className={cn("z-50 w-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg", className)}
      >
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
    </FloatingPortal>
  );
}

export { EmojiSuggestions };
export type { EmojiSuggestionsProps };
