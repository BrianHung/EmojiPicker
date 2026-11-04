// Every variant (popover, tapback, autocomplete, reaction pills) in any app style. Same hooks and parts underneath.
import * as React from "react";
import { Emoji, ReactionBar, useEmojiStore, useFrequentEmoji, type EmojiSelection, type ShortcodeAutocomplete } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { EmojiAutocomplete } from "@/components/emoji-autocomplete";
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

/** The :shortcode: popup in an app style, with the typed part of each code highlighted. */
export function StyleAutocomplete({ appStyle, autocomplete, className }: { appStyle: Style; autocomplete: ShortcodeAutocomplete; className?: string }) {
  const store = useEmojiStore();
  const a = appStyle.autocomplete;
  useStyleTokens(appStyle.id, appStyle.layout.tokens);
  return (
    <EmojiAutocomplete
      data-style={appStyle.id}
      autocomplete={autocomplete}
      appearance={a.className}
      className={className}
      listClassName={a.list}
      itemClassName={cn("gap-3", a.item)}
      header={a.header}
      headerClassName={a.headerClassName}
      renderItem={(s, highlighted) => {
        const code = s.shortcode;
        const [start, end] = s.match ?? [0, 0];
        return (
          <>
            <Emoji emoji={store.withSkinTone(s.record.unified)} size={a.emoji ?? 22} renderer={appStyle.renderer} className="flex shrink-0 justify-center leading-none" style={{ fontSize: a.emoji ?? 22, width: a.emoji ?? 22 }} />
            <span className="truncate">
              :{code.slice(0, start)}
              {end > start ? <mark data-active={highlighted || undefined} className={cn("bg-transparent text-inherit", a.match, a.matchActive)}>{code.slice(start, end)}</mark> : null}
              {code.slice(end)}:
            </span>
            {a.showName ? <span className="ml-auto truncate pl-3 text-[0.85em] opacity-55">{s.record.name}</span> : null}
            {a.hint && highlighted ? <span className="ml-auto shrink-0 pl-3">{a.hint}</span> : null}
          </>
        );
      }}
    />
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
