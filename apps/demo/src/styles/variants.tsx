// Every variant (popover, tapback, autocomplete, reaction pills) in any app style. Same hooks and parts underneath.
import * as React from "react";
import { Emoji, useEmojiStore, useFrequentEmoji, type EmojiSelection, type ShortcodeAutocomplete } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import { EmojiAutocomplete } from "@/components/emoji-autocomplete";
import { EmojiPickerPopover } from "@/registry/emoji-picker";
import { SmilePlus } from "./icons";
import { FitViewport } from "./scene-kit";
import { StylePicker, useStyleTokens, type Style } from "./style-picker";

/** Popover picker from a trigger, with or without search. */
export function StyleDropdown({
  appStyle,
  onSelect,
  search = true,
  children,
  side,
  align,
  label,
  triggerClassName,
}: {
  appStyle: Style;
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
    <EmojiPickerPopover
      onSelect={onSelect}
      side={side}
      align={align}
      label={label}
      triggerClassName={triggerClassName}
      picker={
        // Wider than a phone (Discord's 498px): zoom to fit, keeping the app's layout.
        <FitViewport width={appStyle.size.width}>
          <StylePicker layout={appStyle.layout} onSelect={onSelect} search={search} autoFocus={search} className={search ? undefined : "h-auto max-h-[400px]"} />
        </FitViewport>
      }
    >
      {children}
    </EmojiPickerPopover>
  );
}

/** Tapback row: top frequents + a "+" that opens the style's full picker. */
export function StyleTapback({ appStyle, onSelect, count = 5, className }: { appStyle: Style; onSelect: (s: EmojiSelection) => void; count?: number; className?: string }) {
  const store = useEmojiStore();
  const frequent = useFrequentEmoji(count);
  const top = appStyle.tapback.pinned ?? frequent;
  useStyleTokens(appStyle.id, appStyle.layout.tokens);
  return (
    <div data-style={appStyle.id} className={cn(appStyle.tapback.className, className)} role="toolbar" aria-label="Reactions">
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
              <Emoji unified={unified} />
            </button>
          );
        })}
        <StyleDropdown appStyle={appStyle} onSelect={onSelect} label="More emoji" triggerClassName={appStyle.tapback.more?.className ?? "text-[20px] opacity-60"}>
          {appStyle.tapback.more?.icon ?? <SmilePlus size={20} />}
        </StyleDropdown>
      </div>
    </div>
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
      itemClassName={cn("gap-3", a.item)}
      header={a.header}
      renderItem={(s, highlighted) => {
        const code = s.shortcode;
        const [start, end] = s.match ?? [0, 0];
        return (
          <>
            <Emoji unified={store.withSkinTone(s.record.unified)} size={22} renderer={appStyle.renderer} className="shrink-0 text-[22px] leading-none" />
            <span className="truncate">
              :{code.slice(0, start)}
              {end > start ? <mark data-active={highlighted || undefined} className={cn("bg-transparent text-inherit", a.match, a.matchActive)}>{code.slice(start, end)}</mark> : null}
              {code.slice(end)}:
            </span>
            {a.showName ? <span className="ml-auto truncate pl-3 text-[0.85em] opacity-55">{s.record.name}</span> : null}
          </>
        );
      }}
    />
  );
}

export type Reaction = { unified: string; count: number; mine: boolean };

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
            <Emoji unified={r.unified} size={16} className="text-[16px] leading-none" />
            <span className="font-semibold">{r.count}</span>
          </button>
        );
      })}
      <StyleDropdown appStyle={appStyle} label="Add reaction" onSelect={(s) => onToggle(s.unified)} triggerClassName={cn("flex items-center", appStyle.pill.add)}>
        <SmilePlus size={15} strokeWidth={2} />
      </StyleDropdown>
    </div>
  );
}

export function toggleReaction(list: Reaction[], unified: string): Reaction[] {
  const existing = list.find((r) => r.unified === unified);
  if (!existing) return [...list, { unified, count: 1, mine: true }];
  return list
    .map((r) => (r.unified === unified ? { ...r, count: r.count + (r.mine ? -1 : 1), mine: !r.mine } : r))
    .filter((r) => r.count > 0);
}
