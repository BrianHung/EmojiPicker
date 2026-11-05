import { EmojiPicker } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import * as I from "@/styles/icons";
import { SearchClear, useActiveTabInView, withIcons } from "@/styles/parts";
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
      columns={fluid ? undefined : 6}
      categories={CATEGORIES}
      searchResults={searchResults}
      onSelect={onSelect}
      data-style="apple"
      style={tokens}
      className={cn(
        ROOT,
        "h-[448px] w-[330px] rounded-picker border border-(--apple-edge) bg-picker-background/70 text-picker-foreground shadow-picker backdrop-blur-2xl backdrop-saturate-150 [--emoji-cell-size:48px] [--emoji-header-height:0px] [--emoji-image-size:34px] [--emoji-list-padding:12px] [--emoji-size:36px]",
        className,
      )}
    >
      {search ? (
        <EmojiPicker.Search className="relative flex shrink-0 items-center gap-2 px-2.5 pt-2.5 pb-2 [--search-icon-x:22px]">
          <EmojiPicker.Search.Input placeholder="Search Emoji" autoFocus={autoFocus} className="h-[34px] w-full rounded-full bg-picker-input pr-3 pl-9 text-[15px] outline-none placeholder:text-picker-subtle focus:ring-[3.5px] focus:ring-picker-ring/55">
            <SearchClear />
          </EmojiPicker.Search.Input>
          <I.Search size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-[var(--search-icon-x,12px)] -translate-y-1/2 text-picker-subtle" />
          <button type="button" title="Add emoji" className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-(--apple-control) text-(--apple-control-foreground)">
            <I.SmilePlus size={20} strokeWidth={1.9} />
          </button>
        </EmojiPicker.Search>
      ) : null}
      <EmojiPicker.Viewport className={cn("relative min-h-0 flex-1 [scrollbar-width:thin]", !search && "pt-[var(--emoji-list-padding,8px)]")}>
        <EmojiPicker.List className="outline-none">
          {() => (
            <EmojiPicker.List.Section>
              <EmojiPicker.List.SectionTitle className="pointer-events-none h-0 overflow-hidden" />
              <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className={cn(CELL, "rounded-xl hover:bg-picker-hover data-focus-visible:bg-picker-hover data-[highlighted]:bg-picker-hover")} />}</EmojiPicker.List.Items>
            </EmojiPicker.List.Section>
          )}
        </EmojiPicker.List>
        <EmojiPicker.Empty className="py-10 text-center text-sm opacity-60">No emoji found</EmojiPicker.Empty>
      </EmojiPicker.Viewport>
      <div className="flex h-[52px] shrink-0 items-center gap-0.5 border-t border-picker-border px-2">
        <EmojiPicker.CategoryNav ref={nav} className="flex min-w-0 flex-1 items-center justify-between gap-0 overflow-x-auto [scrollbar-width:none]">
          {() => <EmojiPicker.CategoryNav.Tab className="relative flex size-[30px] shrink-0 items-center justify-center rounded-full text-picker-muted data-active:bg-picker-selected" />}
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
    className: "flex w-fit flex-col overflow-hidden rounded-full border border-(--apple-edge) bg-picker-background/80 shadow-[0_8px_30px_rgb(0_0_0/0.18)] backdrop-blur-2xl",
    reactions:
      "flex items-center gap-0.5 px-1.5 py-1 [--emoji-image-size:30px] [&_button]:flex [&_button]:size-11 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:text-[30px] [&_button:hover]:bg-picker-hover",
  },
  autocomplete: {
    className: "rounded-2xl border border-(--apple-edge) bg-picker-background/80 p-1 shadow-[0_8px_30px_rgb(0_0_0/0.18)] backdrop-blur-2xl",
    item: "h-10 rounded-xl px-2.5 text-[15px] data-[highlighted]:bg-picker-accent data-[highlighted]:text-white",
    match: "font-semibold",
  },
  pill: {
    base: "h-7 rounded-full bg-picker-input px-2 text-[13px]",
    mine: "aria-pressed:bg-picker-accent aria-pressed:text-white",
    add: "h-7 rounded-full bg-picker-input px-2 text-picker-subtle",
  },
};
