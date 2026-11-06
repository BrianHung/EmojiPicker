import { EmojiPicker } from "@brianhung/emoji-picker-react";
import { cn } from "@/lib/utils";
import * as I from "@/styles/icons";
import { noEmoji, SearchClear, useActiveTabInView, withIcons } from "@/styles/parts";
import { CELL, ROOT, type Style, type StylePickerProps, type Tokens } from "@/styles/style";

const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #262626)",
  "--emoji-picker-foreground": "light-dark(#0c1014, #f5f5f5)",
  "--emoji-picker-muted": "light-dark(#6a717a, #a8a8a8)",
  "--emoji-picker-subtle": "#8e8e8e",
  "--instagram-placeholder": "light-dark(#6a717a, #8e8e8e)",
  "--emoji-picker-border": "light-dark(#dbdbdb, #363636)",
  "--emoji-picker-input": "light-dark(#f3f5f7, rgb(37 41 46))",
  "--emoji-picker-input-border": "light-dark(#dbdfe4, transparent)",
  "--emoji-picker-hover": "light-dark(#f2f2f2, #363636)",
  "--emoji-picker-selected": "light-dark(#f2f2f2, #363636)",
  "--emoji-picker-accent": "light-dark(#000000, rgb(112 141 255))",
  "--emoji-picker-radius": "6px",
  "--emoji-picker-shadow": "0 4px 12px rgb(12 16 20 / 0.15)",
  "--emoji-picker-font": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  "--instagram-more": "light-dark(#efefef, #363636)",
  "--instagram-link": "light-dark(#4150f7, rgb(112 141 255))",
};

const REACTIONS = ["2764-fe0f", "1f602", "1f62e", "1f622", "1f621", "1f44d"];

const CATEGORIES = withIcons(I.ICONS.instagram, {
  categories: [{ id: "suggested", name: "Your Reactions" }, { id: "custom" }, { id: "smileys_people" }, { id: "animals_nature" }, { id: "food_drink" }, { id: "activities" }, { id: "travel_places" }, { id: "objects" }, { id: "symbols" }, { id: "flags" }],
  size: 18,
  strokeWidth: 2,
  hide: ["suggested", "custom"],
});

export function InstagramPicker({ onSelect, search = true, autoFocus = false, fluid = false, columns, searchResults, className }: StylePickerProps) {
  const nav = useActiveTabInView();
  return (
    <EmojiPicker.Root
      columns={columns ?? (fluid ? "fit" : 8)}
      suggested={REACTIONS}
      categories={CATEGORIES}
      searchResults={searchResults}
      onSelect={onSelect}
      data-style="instagram"
      style={tokens}
      className={cn(
        ROOT,
        "h-[316px] w-[340px] rounded-picker bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-cell-size:40px] [--emoji-header-height:34px] [--emoji-image-size:32px] [--emoji-list-padding:10px] [--emoji-size:32px]",
        className,
      )}
    >
      {search ? (
        <EmojiPicker.Search className="relative flex shrink-0 items-center px-2 pt-3 pb-0 [--search-icon-x:20px]">
          <EmojiPicker.Search.Input
            placeholder="Search emoji"
            autoFocus={autoFocus}
            className="h-10 w-full rounded-full border border-picker-input-border bg-picker-input pr-4 pl-[33.3px] text-[14px] text-picker-foreground outline-none placeholder:text-(--instagram-placeholder)"
          >
            <SearchClear />
          </EmojiPicker.Search.Input>
          <I.Search size={16} strokeWidth={2} className="pointer-events-none absolute top-[calc(50%+6px)] left-[var(--search-icon-x,12px)] size-[14px] -translate-y-1/2 text-picker-subtle" />
        </EmojiPicker.Search>
      ) : null}
      <EmojiPicker.Viewport className={cn("relative min-h-0 flex-1 [scrollbar-width:none]", !search && "pt-[var(--emoji-list-padding,8px)]")}>
        <EmojiPicker.List className="outline-none" renderEmptyState={noEmoji}>
          {() => (
            <EmojiPicker.List.Section>
              <EmojiPicker.List.SectionTitle className="flex h-[34px] items-center bg-picker-background pt-[8.5px] pr-[14px] pl-[14px] text-[12px] leading-4 font-semibold text-picker-muted [[data-category=suggested]_&]:after:ml-auto [[data-category=suggested]_&]:after:text-(--instagram-link) [[data-category=suggested]_&]:after:content-['Customize']" />
              <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className={cn(CELL, "rounded-lg hover:bg-picker-hover data-focus-visible:bg-picker-selected data-[focused]:bg-picker-selected")} />}</EmojiPicker.List.Items>
            </EmojiPicker.List.Section>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
      <div className="flex h-[42px] shrink-0 items-center border-t border-picker-border px-[10.5px]">
        <EmojiPicker.CategoryNav ref={nav} className="flex w-full min-w-0 flex-1 items-center justify-between overflow-x-auto [scrollbar-width:none]">
          {() => <EmojiPicker.CategoryNav.Tab className="relative flex size-8 shrink-0 items-center justify-center rounded-full text-picker-subtle hover:text-picker-foreground data-active:text-picker-foreground" />}
        </EmojiPicker.CategoryNav>
      </div>
    </EmojiPicker.Root>
  );
}

export const instagram: Style = {
  id: "instagram",
  label: "Instagram",
  tokens,
  Picker: InstagramPicker,
  size: { width: 340, height: 316 },
  sheetColumns: 7,
  tapback: {
    className: "flex w-fit items-center rounded-[26px] bg-picker-background shadow-picker",
    reactions:
      "flex h-14 items-center px-3 [--emoji-image-size:32px] [&>button]:flex [&>button]:size-10 [&>button]:items-center [&>button]:justify-center [&>button]:text-[32px] [&>button]:leading-none [&>button]:transition-transform [&>button:hover]:scale-110",
    pinned: REACTIONS,
    more: { className: "ml-1 flex size-10 items-center justify-center rounded-full bg-(--instagram-more) text-picker-foreground", icon: <I.Plus size={18} strokeWidth={2} /> },
  },
  autocomplete: {
    className: "rounded-picker bg-picker-background p-1 font-picker text-picker-foreground shadow-picker",
    item: "h-9 rounded-md px-2 text-[14px] data-[highlighted]:bg-picker-hover",
    match: "font-semibold",
  },
  pill: {
    base: "h-6 rounded-full bg-picker-input px-1.5 text-[12px]",
    mine: "aria-pressed:bg-picker-accent/15",
    add: "h-6 rounded-full px-1.5 text-picker-subtle hover:bg-picker-hover",
  },
};
