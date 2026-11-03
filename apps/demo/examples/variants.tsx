// Every variant, rendered with any product skin. Same hooks and parts underneath.
import * as React from "react";
import { Emoji, useEmojiStore, useFrequentEmoji, type EmojiSelection, type ShortcodeAutocomplete } from "@brianhung/emoji-picker";
import { cn } from "../components/code";
import { EmojiAutocomplete } from "../components/emoji-autocomplete";
import { EmojiPickerPopover } from "../components/emoji-picker";
import { SmilePlus } from "./icons";
import { SkinPicker, useSkinTokens, type Skin } from "./kit";

/** Popover picker from a trigger, with or without search. */
export function SkinDropdown({
  skin,
  onSelect,
  search = true,
  children,
  side,
  align,
  label,
  triggerClassName,
}: {
  skin: Skin;
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
      picker={<SkinPicker layout={skin.layout} onSelect={onSelect} search={search} autoFocus={search} className={search ? undefined : "h-auto max-h-[400px]"} />}
    >
      {children}
    </EmojiPickerPopover>
  );
}

/** Tapback row: top frequents + a "+" that opens the skin's full picker. */
export function SkinTapback({ skin, onSelect, count = 5, className }: { skin: Skin; onSelect: (s: EmojiSelection) => void; count?: number; className?: string }) {
  const store = useEmojiStore();
  const frequent = useFrequentEmoji(count);
  const top = skin.tapback.pinned ?? frequent;
  useSkinTokens(skin.id, skin.layout.tokens);
  return (
    <div data-skin={skin.id} className={cn(skin.tapback.className, className)} role="toolbar" aria-label="Reactions">
      <div className={skin.tapback.reactions}>
        {top.map((u) => {
          const unified = store.withSkinTone(u);
          return (
            <button
              key={u}
              type="button"
              aria-label={store.get(u)?.name ?? u}
              onClick={() => {
                const s = store.select(unified);
                if (s) onSelect(s);
              }}
            >
              <Emoji unified={unified} />
            </button>
          );
        })}
        <SkinDropdown skin={skin} onSelect={onSelect} label="More emoji" triggerClassName={skin.tapback.more?.className ?? "text-[20px] opacity-60"}>
          {skin.tapback.more?.icon ?? <SmilePlus size={20} />}
        </SkinDropdown>
      </div>
    </div>
  );
}

/** The :shortcode: popup in a skin, with the typed part of each code highlighted. */
export function SkinAutocomplete({ skin, autocomplete, className }: { skin: Skin; autocomplete: ShortcodeAutocomplete; className?: string }) {
  const store = useEmojiStore();
  const a = skin.autocomplete;
  useSkinTokens(skin.id, skin.layout.tokens);
  return (
    <EmojiAutocomplete
      data-skin={skin.id}
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
            <Emoji unified={store.withSkinTone(s.record.unified)} size={22} renderer={skin.renderer} className="shrink-0 text-[22px] leading-none" />
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
export function SkinPills({ skin, reactions, onToggle }: { skin: Skin; reactions: Reaction[]; onToggle: (unified: string) => void }) {
  const store = useEmojiStore();
  useSkinTokens(skin.id, skin.layout.tokens);
  return (
    <div data-skin={skin.id} className="flex flex-wrap items-center gap-1">
      {reactions.map((r) => {
        const record = store.get(r.unified);
        return (
          <button
            key={r.unified}
            type="button"
            aria-pressed={r.mine}
            title={record?.shortcodes[0] ? `:${record.shortcodes[0]}:` : record?.name}
            onClick={() => onToggle(r.unified)}
            className={cn("flex items-center gap-1 tabular-nums transition-colors", skin.pill.base, skin.pill.mine)}
          >
            <Emoji unified={r.unified} size={16} className="text-[16px] leading-none" />
            <span className="font-semibold">{r.count}</span>
          </button>
        );
      })}
      <SkinDropdown skin={skin} label="Add reaction" onSelect={(s) => onToggle(s.unified)} triggerClassName={cn("flex items-center", skin.pill.add)}>
        <SmilePlus size={15} strokeWidth={2} />
      </SkinDropdown>
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
