import { EmojiPicker } from "emoji-components";
import { cn } from "@/lib/utils";
import * as I from "@/styles/icons";
import { noEmoji, SearchClear, useActiveTabInView, withIcons } from "@/styles/parts";
import { CELL, ROOT, type Style, type StylePickerProps, type Tokens } from "@/styles/style";

const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, oklch(26.9% 0 none))",
  "--emoji-picker-foreground": "light-dark(oklch(20.5% 0 none), #ffffff)",
  "--emoji-picker-muted": "light-dark(oklch(37.1% 0 none), oklch(87% 0 none))",
  "--emoji-picker-subtle": "light-dark(oklch(55.6% 0 none), oklch(70.8% 0 none))",
  "--emoji-picker-border": "light-dark(color-mix(in oklab, #000 6%, transparent), color-mix(in oklab, #fff 10%, transparent))",
  "--emoji-picker-input": "light-dark(color-mix(in oklab, #000 5%, transparent), color-mix(in oklab, #fff 10%, transparent))",
  "--emoji-picker-hover": "light-dark(color-mix(in oklab, #000 6%, transparent), color-mix(in oklab, #fff 10%, transparent))",
  "--emoji-picker-selected": "light-dark(color-mix(in oklab, #000 8%, transparent), color-mix(in oklab, #fff 15%, transparent))",
  "--emoji-picker-accent": "#3478f6",
  "--emoji-picker-ring": "#3478f6",
  "--emoji-picker-radius": "22px",
  "--emoji-picker-shadow": "0 12px 40px rgb(0 0 0 / 0.18)",
  "--apple-edge": "light-dark(color-mix(in oklab, #fff 60%, transparent), color-mix(in oklab, #fff 10%, transparent))",
  "--apple-control": "light-dark(color-mix(in oklab, #000 7%, transparent), color-mix(in oklab, #fff 10%, transparent))",
  "--apple-control-foreground": "light-dark(oklch(37.1% 0 none), oklch(92.2% 0 none))",
};

const CATEGORIES = withIcons(I.ICONS.apple, { size: 19, strokeWidth: 1.6 });

export function ApplePicker({ onSelect, search = true, autoFocus = false, fluid = false, searchResults, className }: StylePickerProps) {
  const nav = useActiveTabInView();
  return (
    <EmojiPicker.Root
      columns={fluid ? "fit" : 6}
      categories={CATEGORIES}
      searchResults={searchResults}
      onSelect={onSelect}
      data-style="apple"
      style={tokens}
      className={cn(
        ROOT,
        "h-[448px] w-[330px] rounded-emoji-picker border border-(--apple-edge) bg-emoji-picker-background/70 text-emoji-picker-foreground shadow-emoji-picker backdrop-blur-2xl backdrop-saturate-150 [--emoji-picker-cell-size:48px] [--emoji-picker-header-height:0px] [--emoji-picker-emoji-image-size:34px] [--emoji-picker-list-padding:12px] [--emoji-picker-emoji-size:36px]",
        className,
      )}
    >
      {search ? (
        <EmojiPicker.Search className="relative flex shrink-0 items-center gap-2 px-2.5 pt-2.5 pb-2 [--search-icon-x:22px]">
          <EmojiPicker.SearchInputGroup>
            <EmojiPicker.SearchInput placeholder="Search Emoji" autoFocus={autoFocus} className="h-[34px] w-full rounded-full bg-emoji-picker-input pr-3 pl-9 text-[15px] outline-none placeholder:text-emoji-picker-subtle focus:ring-[3.5px] focus:ring-emoji-picker-ring/55" />
            <SearchClear />
          </EmojiPicker.SearchInputGroup>
          <I.Search size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-[var(--search-icon-x,12px)] -translate-y-1/2 text-emoji-picker-subtle" />
          <button type="button" title="Add emoji" className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-(--apple-control) text-(--apple-control-foreground)">
            <I.SmilePlus size={20} strokeWidth={1.9} />
          </button>
        </EmojiPicker.Search>
      ) : null}
      <EmojiPicker.Viewport className={cn("relative min-h-0 flex-1 [scrollbar-width:thin]", !search && "pt-[var(--emoji-picker-list-padding,8px)]")}>
        <EmojiPicker.List className="outline-none" renderEmptyState={noEmoji}>
          {() => (
            <EmojiPicker.ListSection>
              <EmojiPicker.ListSectionTitle className="pointer-events-none h-0 overflow-hidden" />
              <EmojiPicker.ListItems>{() => <EmojiPicker.ListCell className={cn(CELL, "rounded-xl hover:bg-emoji-picker-hover data-focus-visible:bg-emoji-picker-hover data-[highlighted]:bg-emoji-picker-hover")} />}</EmojiPicker.ListItems>
            </EmojiPicker.ListSection>
          )}
        </EmojiPicker.List>
      </EmojiPicker.Viewport>
      <div className="flex h-[52px] shrink-0 items-center gap-0.5 border-t border-emoji-picker-border px-2">
        <EmojiPicker.CategoryNav ref={nav} className="flex min-w-0 flex-1 items-center justify-between gap-0 overflow-x-auto [scrollbar-width:none]">
          {() => <EmojiPicker.CategoryNavTab className="relative flex size-[30px] shrink-0 items-center justify-center rounded-full text-emoji-picker-muted data-active:bg-emoji-picker-selected" />}
        </EmojiPicker.CategoryNav>
      </div>
    </EmojiPicker.Root>
  );
}

export const apple: Style = {
  id: "apple",
  label: "Apple",
  tokens,
  Picker: ApplePicker,
  size: { width: 330, height: 448 },
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-full border border-(--apple-edge) bg-emoji-picker-background/80 shadow-[0_8px_30px_rgb(0_0_0/0.18)] backdrop-blur-2xl",
    reactions:
      "flex items-center gap-0.5 px-1.5 py-1 [--emoji-picker-emoji-image-size:30px] [&_button]:flex [&_button]:size-11 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:text-[30px] [&_button:hover]:bg-emoji-picker-hover",
  },
  autocomplete: {
    className: "rounded-2xl border border-(--apple-edge) bg-emoji-picker-background/80 p-1 shadow-[0_8px_30px_rgb(0_0_0/0.18)] backdrop-blur-2xl",
    item: "h-10 rounded-xl px-2.5 text-[15px] data-[highlighted]:bg-emoji-picker-accent data-[highlighted]:text-white",
    match: "font-semibold",
  },
  pill: {
    base: "h-7 rounded-full bg-emoji-picker-input px-2 text-[13px]",
    mine: "aria-pressed:bg-emoji-picker-accent aria-pressed:text-white",
    add: "h-7 rounded-full bg-emoji-picker-input px-2 text-emoji-picker-subtle",
  },
};
