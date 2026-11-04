// The `:` list of Slack, Discord and Linear: StyleAutocomplete's markup on any editor's typeahead.
import * as React from "react";
import { Emoji, useEmojiStore, type EmojiTypeahead } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { useStyleTokens, type Style } from "@/styles/style-picker";

export type EmojiMenuProps = EmojiTypeahead & {
  /** Where it docks; each app's default is measured against its composer. */
  className?: string;
};

export function SuggestionList({ appStyle, suggestions: menu, open, className }: Pick<EmojiMenuProps, "suggestions" | "open" | "className"> & { appStyle: Style }) {
  const store = useEmojiStore();
  const a = appStyle.autocomplete;
  const list = React.useRef<HTMLUListElement>(null);
  useStyleTokens(appStyle.id, appStyle.layout.tokens);
  React.useLayoutEffect(() => void list.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" }), [menu.highlightedIndex, open]);
  if (!open) return null;
  return (
    <div data-style={appStyle.id} onMouseDown={(e) => e.preventDefault()} className={cn("overflow-hidden", a.className, className)}>
      {a.header ? <div className={a.headerClassName ?? "border-b border-border px-3 py-1.5 text-xs text-muted-foreground"}>{a.header(menu.query)}</div> : null}
      <ul ref={list} {...menu.getListProps()} aria-label="Emoji suggestions" className={cn("overflow-y-auto", a.list ?? "max-h-64 p-1")}>
        {menu.suggestions.map((s, i) => {
          const highlighted = i === menu.highlightedIndex;
          const [start, end] = s.match ?? [0, 0];
          return (
            <li key={`${s.record.unified}:${s.shortcode}`} {...menu.getOptionProps(i)} className={cn("flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5", cn("gap-3", a.item))}>
              <Emoji emoji={store.withSkinTone(s.record.unified)} size={a.emoji ?? 22} renderer={appStyle.renderer} className="flex shrink-0 justify-center leading-none" style={{ fontSize: a.emoji ?? 22, width: a.emoji ?? 22 }} />
              <span className="truncate">
                :{s.shortcode.slice(0, start)}
                {end > start ? <mark data-active={highlighted || undefined} className={cn("bg-transparent text-inherit", a.match, a.matchActive)}>{s.shortcode.slice(start, end)}</mark> : null}
                {s.shortcode.slice(end)}:
              </span>
              {a.showName ? <span className="ml-auto truncate pl-3 text-[0.85em] opacity-55">{s.record.name}</span> : null}
              {a.hint && highlighted ? <span className="ml-auto shrink-0 pl-3">{a.hint}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
