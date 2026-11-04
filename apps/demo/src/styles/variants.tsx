import * as React from "react";
import { Emoji, ReactionBar, useEmojiStore, useFrequentEmoji, type EmojiSelection, type EmojiTypeahead } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { PickerPopover } from "@/components/picker-popover";
import { SmilePlus } from "./icons";
import { FitViewport, type Reaction } from "./scene-kit";
import { StylePicker, useStyleTokens, type PickerLayout, type Style } from "./style-picker";

/** Popover picker from a trigger, with or without search. */
export function StyleDropdown({
  appStyle,
  layout = appStyle.layout,
  onSelect,
  search = true,
  children,
  side,
  align,
  label,
  triggerClassName,
}: {
  appStyle: Style;
  /** A layout other than the style's own (its reaction picker). */
  layout?: PickerLayout;
  onSelect: (s: EmojiSelection) => void;
  search?: boolean;
  children: React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
  label?: string;
  triggerClassName?: string;
}) {
  // The popover measures its content, and picking closes it.
  return (
    <PickerPopover
      onSelect={onSelect}
      side={side}
      align={align}
      label={label}
      triggerClassName={triggerClassName}
      picker={
        // Wider than a phone (Discord's 498px): zoom to fit, keeping the app's layout.
        <FitViewport width={appStyle.size.width}>
          <StylePicker layout={layout} onSelect={onSelect} search={search} autoFocus={search} className={search ? undefined : "h-auto max-h-[400px]"} />
        </FitViewport>
      }
    >
      {children}
    </PickerPopover>
  );
}

/** Tapback row: top frequents + a "+" that opens the style's full picker. One tab stop; arrows, Home and End move along it. */
export function StyleTapback({ appStyle, onSelect, count = 5, className }: { appStyle: Style; onSelect: (s: EmojiSelection) => void; count?: number; className?: string }) {
  const store = useEmojiStore();
  const frequent = useFrequentEmoji(count);
  const top = appStyle.tapback.pinned ?? frequent;
  useStyleTokens(appStyle.id, appStyle.layout.tokens);
  return (
    <ReactionBar data-style={appStyle.id} className={cn(appStyle.tapback.className, className)} aria-label="Reactions">
      <div className={appStyle.tapback.reactions}>
        {top.map((u) => {
          const unified = store.withSkinTone(u);
          return (
            <button
              key={u}
              type="button"
              aria-label={store.get(u)?.name ?? u}
              // Press feedback: a slight shrink while held.
              className="transition-transform duration-150 ease-out active:not-disabled:scale-[0.97]"
              onClick={() => {
                const s = store.select(unified);
                if (s) onSelect(s);
              }}
            >
              <Emoji emoji={unified} />
            </button>
          );
        })}
        <StyleDropdown appStyle={appStyle} layout={appStyle.reaction} onSelect={onSelect} label="More emoji" triggerClassName={appStyle.tapback.more?.className ?? "text-[20px] opacity-60"}>
          {appStyle.tapback.more?.icon ?? <SmilePlus size={20} />}
        </StyleDropdown>
      </div>
    </ReactionBar>
  );
}

/** The :shortcode: list in an app style, on any editor's typeahead, with the typed part of each code highlighted. */
export function StyleAutocomplete({ appStyle, suggestions: menu, open, className }: Pick<EmojiTypeahead, "suggestions" | "open"> & { appStyle: Style; className?: string }) {
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
            <li key={`${s.record.unified}:${s.shortcode}`} {...menu.getOptionProps(i)} className={cn("flex cursor-default items-center gap-3 rounded-md px-2 py-1.5", a.item)}>
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

/** Reaction pills with counts, plus an add-reaction picker (Slack / Discord / Linear / Notion). */
export function StylePills({ appStyle, reactions, onToggle }: { appStyle: Style; reactions: Reaction[]; onToggle: (unified: string) => void }) {
  const store = useEmojiStore();
  useStyleTokens(appStyle.id, appStyle.layout.tokens);
  return (
    <div data-style={appStyle.id} className="flex flex-wrap items-center gap-1">
      {reactions.map((r) => {
        const record = store.get(r.unified);
        return (
          <button
            key={r.unified}
            type="button"
            aria-pressed={r.mine}
            title={record?.shortcodes[0] ? `:${record.shortcodes[0]}:` : record?.name}
            onClick={() => onToggle(r.unified)}
            className={cn("flex items-center gap-1 tabular-nums transition-colors", appStyle.pill.base, appStyle.pill.mine)}
          >
            <Emoji emoji={r.unified} size={appStyle.pill.emoji ?? 16} className="flex justify-center leading-none" style={{ fontSize: appStyle.pill.emoji ?? 16, width: appStyle.pill.emoji ?? 16 }} />
            <span className={appStyle.pill.count ?? "font-semibold"}>{r.count}</span>
          </button>
        );
      })}
      <StyleDropdown appStyle={appStyle} layout={appStyle.reaction} label="Add reaction" onSelect={(s) => onToggle(s.unified)} triggerClassName={cn("flex items-center", appStyle.pill.add)}>
        {appStyle.pill.addIcon ?? <SmilePlus size={15} strokeWidth={2} />}
      </StyleDropdown>
    </div>
  );
}
