// Notion's ":" menu: not a list but a compact picker at the caret. Measured in Notion
// (light, Chrome, Nov 2026): a 408×356 card (the picker's radius and shadow) 4px under
// the caret line, its left edge on the ":"; no tabs or filter, the query's matches in
// Notion's sections (12px/500 titles at x=8, the first at y≈13), 12 columns of 32px cells
// from x=12 (first row y≈34.5), the first match on the hover wash, and the picker's
// bottom bar of eleven 32px buttons at y=314. The editor keeps focus: Left/Right move
// a cell, Up/Down a row, Enter/Tab insert, Escape closes.
import * as React from "react";
import { Emoji, EmojiSuggestions, useEmojiStore, type EmojiTypeaheadOptions, type KeyLike, type ShortcodeSuggestion } from "@brianhung/emoji-picker";
import * as I from "@/styles/icons";
import { notion, NOTION_SECTIONS } from "@/styles/notion/picker";
import { OPTION, tokensOf } from "@/styles/style";
import type { EmojiMenuProps } from ".";

export const notionEmojiOptions: EmojiTypeaheadOptions = { matchBy: "search", limit: 200 };

const COLUMNS = 12;
const ICONS: I.IconSet = I.ICONS.notion;

type Section = { id: string; name: string; items: number[] };

function sectionsOf(suggestions: readonly ShortcodeSuggestion[]): Section[] {
  return NOTION_SECTIONS.filter((c) => c.id !== "suggested")
    .map((c) => ({ id: c.id, name: c.name, items: suggestions.flatMap((s, i) => (s.record.group === c.id ? [i] : [])) }))
    .filter((s) => s.items.length);
}

/** Where an arrow moves within the sectioned grid (positions in display order); null: stay. */
function step(sections: Section[], at: number, key: string): number | null {
  const rows: { start: number; length: number }[] = [];
  let start = 0;
  for (const s of sections) {
    for (let r = 0; r < s.items.length; r += COLUMNS) rows.push({ start: start + r, length: Math.min(COLUMNS, s.items.length - r) });
    start += s.items.length;
  }
  if (key === "ArrowLeft") return at > 0 ? at - 1 : null;
  if (key === "ArrowRight") return at < start - 1 ? at + 1 : null;
  const row = rows.findIndex((r) => at >= r.start && at < r.start + r.length);
  const next = rows[row + (key === "ArrowDown" ? 1 : -1)];
  return next ? next.start + Math.min(at - rows[row]!.start, next.length - 1) : null;
}

export function NotionEmojiMenu({ open, query, anchor, suggestions: menu, dismiss, keyHandler, className, container = false }: EmojiMenuProps & { container?: HTMLElement | false }) {
  const store = useEmojiStore();
  const sections = React.useMemo(() => sectionsOf(menu.suggestions), [menu.suggestions]);
  const order = React.useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const highlighted = Math.max(0, order.indexOf(menu.highlightedIndex));
  const activeSection = sections.find((s) => s.items.includes(order[highlighted]!))?.id;
  const scroller = React.useRef<HTMLDivElement>(null);
  // The highlight starts on the first cell shown (sections reorder the ranked matches) until the user moves it.
  const moved = React.useRef<string | null>(null);
  const move = (at: number) => {
    moved.current = query;
    menu.setHighlightedIndex(order[at]!);
  };
  React.useLayoutEffect(() => {
    if (moved.current !== query && order.length && menu.highlightedIndex !== order[0]) menu.setHighlightedIndex(order[0]!);
  });
  React.useLayoutEffect(() => {
    keyHandler.current = (event: KeyLike) => {
      if (!event.key.startsWith("Arrow")) return false;
      const next = step(sections, highlighted, event.key);
      if (next != null) move(next);
      event.preventDefault();
      return true;
    };
    return () => void (keyHandler.current = null);
  });

  // Keep the highlighted cell in view, below the sticky section title.
  React.useLayoutEffect(() => {
    const view = scroller.current;
    const cell = view?.querySelector<HTMLElement>("[data-highlighted]");
    if (!view || !cell) return;
    const top = cell.offsetTop - 34;
    const bottom = cell.offsetTop + cell.offsetHeight - view.clientHeight;
    if (view.scrollTop > top) view.scrollTop = top;
    else if (view.scrollTop < bottom) view.scrollTop = bottom;
  }, [highlighted, menu.suggestions]);

  const jump = (section: string) => {
    const view = scroller.current;
    const header = view?.querySelector<HTMLElement>(`[data-section="${section}"]`);
    if (view && header) view.scrollTop = header.offsetTop;
    const first = sections.find((s) => s.id === section)?.items[0];
    if (first != null) move(order.indexOf(first));
  };

  let position = 0;
  return (
    <EmojiSuggestions.Popover open={open} onOpenChange={(next) => !next && dismiss()} anchor={anchor} sideOffset={4} container={container} className={className}>
      <div
        data-style={notion.id}
        style={tokensOf(notion)}
        className="flex h-[356px] w-[min(408px,calc(100vw-16px))] flex-col overflow-hidden rounded-[10px] bg-picker-background text-picker-foreground shadow-picker [font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe_UI',Helvetica,'Apple_Color_Emoji',Arial,sans-serif]"
      >
        <div ref={scroller} {...menu.getListProps()} aria-label="Emoji suggestions" className="relative min-h-0 flex-1 overflow-y-auto pt-[0.5px] [scrollbar-color:rgb(161_158_153/0.5)_transparent]">
          {sections.map((section) => (
            <div key={section.id} role="group" aria-label={section.name}>
              <div data-section={section.id} className="sticky top-0 z-10 h-[34px] bg-picker-background px-2 pt-3 text-[12px] leading-3 font-medium text-picker-muted">
                {section.name}
              </div>
              <div className="grid grid-cols-[repeat(12,minmax(0,32px))] px-3">
                {section.items.map((index) => {
                  const at = position++;
                  const s = menu.suggestions[index]!;
                  return (
                    <div
                      key={s.record.unified}
                      {...menu.getOptionProps(index)}
                      aria-label={s.record.name}
                      onPointerMove={() => at !== highlighted && move(at)}
                      className={`flex h-8 cursor-pointer items-center justify-center rounded-[4px] data-[highlighted]:bg-picker-selected ${OPTION}`}
                    >
                      <Emoji emoji={store.withSkinTone(s.record.unified)} size={24} className="text-[24px] leading-none" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex h-[51px] shrink-0 items-center gap-[3.2px] overflow-x-auto border-t border-picker-border px-3 pt-2 pb-2.5 [scrollbar-width:none]">
          {NOTION_SECTIONS.map(({ id: section, name }) => {
            const Icon = ICONS[section];
            return (
              <button
                key={section}
                type="button"
                tabIndex={-1}
                aria-label={name}
                data-active={section === activeSection || undefined}
                onClick={() => jump(section)}
                className="flex size-8 shrink-0 items-center justify-center rounded-[6px] text-picker-subtle hover:bg-picker-hover data-active:bg-picker-selected"
              >
                {Icon ? <Icon size={22} strokeWidth={1.5} /> : null}
              </button>
            );
          })}
          <span className="flex size-8 shrink-0 items-center justify-center text-picker-subtle">
            <I.PlusCircleFilled size={22} />
          </span>
        </div>
      </div>
    </EmojiSuggestions.Popover>
  );
}
