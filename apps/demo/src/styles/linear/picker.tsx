import { EmojiPicker, type CategoryOption } from "emoji-components";
import { cn } from "@/lib/utils";
import { noEmoji, SearchClear } from "@/styles/parts";
import { CELL, ROOT, type Style, type StylePickerProps, type Tokens } from "@/styles/style";

const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(lch(100 0 282), lch(12.72 0.85 272))",
  "--emoji-picker-foreground": "light-dark(lch(20 1 282), lch(91.178 1.425 272))",
  "--emoji-picker-muted": "light-dark(lch(40 1 282), lch(64.714 1.425 272))",
  "--emoji-picker-subtle": "light-dark(lch(47 1 282), lch(64.714 1.425 272))",
  "--emoji-picker-border": "light-dark(lch(91.9 0 282), lch(25.68 1.93 272))",
  "--emoji-picker-hover": "light-dark(lch(95 0 282), lch(18 1 282))",
  "--emoji-picker-selected": "light-dark(lch(95 0 282), lch(18 1 282))",
  "--emoji-picker-accent": "#5e6ad2",
  "--emoji-picker-radius": "8px",
  "--emoji-picker-font": "'Inter Variable', Inter, -apple-system, system-ui, sans-serif",
  "--emoji-picker-shadow": "0 6px 18px lch(0 0 0 / 0.02), 0 3px 9px lch(0 0 0 / 0.04), 0 1px 1px lch(0 0 0 / 0.04)",
  "--linear-divider": "light-dark(lch(97.3 0 282), lch(17.04 1.93 272))",
  "--linear-thumb": "light-dark(lch(64.94 1.25 282), lch(38 1.25 282))",
  "--linear-pill": "light-dark(lch(98 0 282), lch(14 1 282))",
  "--linear-pill-foreground": "light-dark(lch(40 1 282), lch(70 1 282))",
  "--linear-menu-text": "light-dark(lch(10 0 282), lch(100 0 272))",
};

const POPUP = "rounded-picker border-[0.5px] border-picker-border bg-picker-background shadow-picker";

export const LINEAR_CATEGORIES: CategoryOption[] = [{ id: "suggested", name: "Frequently used" }, { id: "custom" }, { id: "smileys_people" }, { id: "animals_nature" }, { id: "food_drink" }, { id: "travel_places" }, { id: "activities" }, { id: "objects" }, { id: "symbols" }, { id: "flags" }];

export function LinearPicker({ onSelect, search = true, autoFocus = false, fluid = false, searchResults, className }: StylePickerProps) {
  return (
    <EmojiPicker.Root
      columns={fluid ? "fit" : 9}
      frequent={18}
      categories={LINEAR_CATEGORIES}
      searchResults={searchResults}
      onSelect={onSelect}
      data-style="linear"
      style={tokens}
      className={cn(ROOT, "h-[321px] w-[273px] font-picker text-picker-foreground [--emoji-cell-size:28px] [--emoji-header-height:28px] [--emoji-image-size:20px] [--emoji-list-padding:9.5px] [--emoji-size:19px]", POPUP, className)}
    >
      {search ? (
        <EmojiPicker.Search className="relative flex shrink-0 items-center border-b border-(--linear-divider) px-[5px] pt-1 pb-1">
          <EmojiPicker.SearchInput placeholder="Search emoji…" autoFocus={autoFocus} className="h-7 w-full rounded-[8px] bg-transparent py-1.5 pr-7 pl-[9px] text-[13px] outline-none placeholder:text-picker-muted">
            <SearchClear />
          </EmojiPicker.SearchInput>
        </EmojiPicker.Search>
      ) : null}
      <EmojiPicker.Viewport className={cn("relative min-h-0 flex-1 overflow-x-hidden [scrollbar-color:var(--linear-thumb)_transparent] [scrollbar-width:thin]", !search && "pt-2.5")}>
        <EmojiPicker.List className="outline-none" renderEmptyState={noEmoji}>
          {() => (
            <EmojiPicker.ListSection>
              <EmojiPicker.ListSectionTitle className="flex h-7 items-center bg-picker-background pt-1.5 pr-1.5 pl-3.5 text-[12px] leading-[22px] font-medium text-picker-muted" />
              <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className={cn(CELL, "rounded-[8px] hover:bg-picker-hover data-focus-visible:bg-picker-selected data-[focused]:bg-picker-selected")} />}</EmojiPicker.ListItems>
            </EmojiPicker.ListSection>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}

export const linear: Style = {
  id: "linear",
  label: "Linear",
  tokens,
  Picker: LinearPicker,
  size: { width: 273, height: 321 },
  tapback: {
    className: `flex w-fit flex-col overflow-hidden ${POPUP}`,
    reactions: "flex items-center gap-0.5 p-1 [--emoji-image-size:18px] [&_button]:flex [&_button]:size-7 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[8px] [&_button]:text-[18px] [&_button:hover]:bg-picker-hover",
  },
  autocomplete: {
    className: "w-[190.6px] max-w-full rounded-[10px] border-[0.5px] border-picker-border bg-picker-background font-picker text-(--linear-menu-text) shadow-picker",
    list: "max-h-[416px] p-1",
    item: "h-[34px] gap-2 rounded-[6px] px-[10px] py-0 text-[13px] font-[450] data-[highlighted]:bg-picker-selected",
    match: "",
    emoji: 15,
  },
  pill: {
    base: "h-6 rounded-full border-[0.5px] border-picker-border bg-(--linear-pill) px-2 text-[12px] text-(--linear-pill-foreground)",
    mine: "aria-pressed:border-picker-accent/60 aria-pressed:bg-picker-accent/10 aria-pressed:text-picker-accent",
    add: "h-6 rounded-full px-1.5 text-picker-subtle hover:bg-picker-hover",
  },
};
