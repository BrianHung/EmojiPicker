import { EmojiPicker, useEmojiStore, type CategoryOption, type EmojiSelection } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import * as I from "@/styles/icons";
import { HandTone, SearchClear, Tabs, useActiveTabInView, withIcons } from "@/styles/parts";
import { CELL, ROOT, type Style, type StylePickerProps, type Tokens } from "@/styles/style";

const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #252525)",
  "--emoji-picker-foreground": "light-dark(#2c2c2b, #f0efed)",
  "--emoji-picker-muted": "light-dark(#7d7a75, #ada9a3)",
  "--emoji-picker-subtle": "light-dark(#8e8b86, #ada9a3)",
  "--emoji-picker-border": "light-dark(rgb(42 28 0 / 0.07), #383836)",
  "--emoji-picker-input": "light-dark(rgb(66 35 3 / 0.03), rgb(252 252 252 / 0.03))",
  "--emoji-picker-hover": "light-dark(rgb(33 27 23 / 0.051), rgb(255 255 255 / 0.054))",
  "--emoji-picker-selected": "light-dark(rgb(33 27 23 / 0.051), rgb(255 255 255 / 0.054))",
  "--emoji-picker-accent": "#2383e2",
  "--emoji-picker-ring": "#2383e2",
  "--emoji-picker-radius": "10px",
  "--emoji-picker-shadow": "0 20px 24px light-dark(rgb(25 25 25 / 0.05), transparent), 0 5px 8px light-dark(rgb(25 25 25 / 0.027), transparent), 0 0 0 1px light-dark(rgb(42 28 0 / 0.07), #383836), 0 14px 28px -6px light-dark(transparent, rgb(25 25 25 / 0.2)), 0 2px 4px -1px light-dark(transparent, rgb(25 25 25 / 0.118))",
  "--notion-control": "light-dark(#383836, color-mix(in oklab, #fff 60%, transparent))",
  "--notion-placeholder": "light-dark(rgb(44 44 43 / 0.375), color-mix(in oklab, #fff 30%, transparent))",
  "--notion-edge": "light-dark(rgb(28 19 1 / 0.11), rgb(255 255 255 / 0.094))",
  "--notion-mine": "light-dark(rgb(0 124 215 / 0.094), rgb(67 155 255 / 0.24))",
  "--notion-mine-foreground": "#2783de",
  "--notion-pill": "light-dark(rgb(42 28 0 / 0.07), rgb(255 255 243 / 0.082))",
  "--notion-bar-rule": "light-dark(#f0efed, #2c2c2b)",
};

export const NOTION_SECTIONS = [
  { id: "suggested", name: "Recent" },
  { id: "smileys_people", name: "People" },
  { id: "animals_nature", name: "Animals and nature" },
  { id: "food_drink", name: "Food and drink" },
  { id: "activities", name: "Activity" },
  { id: "travel_places", name: "Travel and places" },
  { id: "objects", name: "Objects" },
  { id: "symbols", name: "Symbols" },
  { id: "flags", name: "Flags" },
  { id: "custom", name: "Custom" },
] satisfies CategoryOption[];

const CATEGORIES = withIcons(I.ICONS.notion, { categories: NOTION_SECTIONS, size: 22, strokeWidth: 1.5 });

function Shuffle({ onPick }: { onPick: (s: EmojiSelection) => void }) {
  const store = useEmojiStore();
  return (
    <button
      type="button"
      title="Random"
      className="flex size-7 shrink-0 items-center justify-center rounded-[6px] border border-(--notion-edge) text-(--notion-control) hover:bg-picker-hover [&_svg]:size-3.5"
      onClick={() => {
        const all = store.records().filter((r) => !r.imageUrl);
        const r = all[Math.floor(Math.random() * all.length)];
        const s = r && store.select(store.withSkinTone(r.unified));
        if (s) onPick(s);
      }}
    >
      <I.Shuffle size={16} strokeWidth={2} />
    </button>
  );
}

function Picker({ reaction, onSelect, search = true, autoFocus = false, fluid = false, searchResults, className }: StylePickerProps & { reaction: boolean }) {
  const nav = useActiveTabInView();
  return (
    <EmojiPicker.Root
      columns={fluid ? undefined : 12}
      fitColumns={false}
      categories={CATEGORIES}
      searchResults={searchResults}
      onSelect={onSelect}
      data-style="notion"
      style={tokens}
      className={cn(
        ROOT,
        reaction ? "h-[356px]" : "h-[390px]",
        "w-[408px] rounded-picker bg-picker-background text-picker-foreground shadow-picker [--emoji-cell-size:32px] [--emoji-header-height:34px] [--emoji-image-size:24px] [--emoji-list-padding:12px] [--emoji-size:24px]",
        className,
      )}
    >
      {reaction ? null : (
        <Tabs
          items={["Emoji", "Icons", "Upload"]}
          active={0}
          className="flex h-10 shrink-0 items-center px-2 text-[14px] leading-[1.2] shadow-[inset_0_-1px_0_var(--emoji-picker-border)]"
          tab="relative flex h-7 items-center px-2"
          activeTab="text-picker-foreground after:absolute after:inset-x-2 after:-bottom-1.5 after:h-0.5 after:bg-picker-foreground"
          inactiveTab="text-picker-subtle"
          right={<span className="ml-auto flex h-7 items-center px-2 text-picker-subtle">Remove</span>}
        />
      )}
      {search ? (
        <EmojiPicker.Search
          className={cn(
            "relative flex shrink-0 items-center gap-2 px-2 [--search-icon-x:14px] [&_[data-slot=skin-tone]]:order-last",
            reaction ? "pt-2 pb-[14.5px]" : "mt-1 mb-2.5 py-1 [&_[data-slot=skin-tone]]:-ml-0.5",
          )}
        >
          <EmojiPicker.Search.Input
            placeholder="Filter…"
            autoFocus={autoFocus}
            className="h-7 w-full rounded-[6px] bg-picker-input pr-1.5 pl-7 text-[14px] leading-5 shadow-[0_0_0_1px_var(--notion-edge)] outline-none placeholder:text-(--notion-placeholder) focus:shadow-[inset_0_0_0_1px_var(--emoji-picker-ring),0_0_0_1px_var(--emoji-picker-ring)]"
          >
            <SearchClear />
          </EmojiPicker.Search.Input>
          <I.Search size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-[var(--search-icon-x,12px)] -translate-y-1/2 text-picker-subtle" />
          <HandTone className="flex size-7 items-center justify-center rounded-[6px] text-[20px] leading-none hover:bg-picker-hover" />
          {reaction ? null : <Shuffle onPick={(s) => onSelect?.(s)} />}
        </EmojiPicker.Search>
      ) : null}
      <EmojiPicker.Viewport className={cn("relative min-h-0 flex-1 overflow-x-hidden [scrollbar-color:rgb(161_158_153/0.5)_transparent] [--emoji-list-padding-end:-3px]", !search && "pt-[var(--emoji-list-padding,8px)]")}>
        <EmojiPicker.List className="outline-none">
          {() => (
            <EmojiPicker.List.Section>
              <EmojiPicker.List.SectionTitle className="flex items-start bg-picker-background px-2 pt-3 text-[12px] leading-3 font-medium text-picker-muted" />
              <EmojiPicker.List.Items>{() => <EmojiPicker.List.Cell className={cn(CELL, "rounded-[4px] hover:bg-picker-hover data-focus-visible:bg-picker-selected data-[highlighted]:bg-picker-selected")} />}</EmojiPicker.List.Items>
            </EmojiPicker.List.Section>
          )}
        </EmojiPicker.List>
        <EmojiPicker.Empty className="py-10 text-center text-sm opacity-60">No emoji found</EmojiPicker.Empty>
      </EmojiPicker.Viewport>
      <div className="flex h-[51px] shrink-0 items-center border-t border-(--notion-bar-rule) px-3 pt-2 pb-2.5">
        <EmojiPicker.CategoryNav ref={nav} className="flex min-w-0 flex-1 items-center justify-start gap-[3.2px] overflow-x-auto [scrollbar-width:none]">
          {() => <EmojiPicker.CategoryNav.Tab className="relative flex size-8 shrink-0 items-center justify-center rounded-[6px] text-picker-subtle hover:bg-picker-hover data-active:bg-picker-selected" />}
        </EmojiPicker.CategoryNav>
        <span className="flex size-8 shrink-0 items-center justify-center text-picker-subtle">
          <I.PlusCircleFilled size={22} />
        </span>
      </div>
    </EmojiPicker.Root>
  );
}

export const NotionPicker = (props: StylePickerProps) => <Picker {...props} reaction={false} />;
export const NotionReactionPicker = (props: StylePickerProps) => <Picker {...props} reaction />;

export const notion: Style = {
  id: "notion",
  label: "Notion",
  tokens,
  Picker: NotionPicker,
  ReactionPicker: NotionReactionPicker,
  size: { width: 408, height: 390 },
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-lg bg-picker-background shadow-picker",
    reactions: "flex items-center gap-0.5 p-1 [--emoji-image-size:20px] [&_button]:flex [&_button]:size-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[5px] [&_button]:text-[20px] [&_button:hover]:bg-picker-hover",
  },
  autocomplete: {
    className: "rounded-picker bg-picker-background p-1 text-picker-foreground shadow-picker",
    item: "h-7 rounded-md px-2 text-[14px] data-[highlighted]:bg-picker-selected",
    match: "font-semibold",
    showName: true,
  },
  pill: {
    base: "h-[25px] rounded-[100px] bg-(--notion-pill) px-2 py-0.5 text-[12px] text-picker-subtle",
    mine: "aria-pressed:bg-(--notion-mine) aria-pressed:text-(--notion-mine-foreground)",
    count: "leading-[14.4px] font-medium",
    add: "h-[25px] w-8 justify-center rounded-[100px] bg-(--notion-pill) text-picker-subtle hover:bg-picker-hover",
    addIcon: <I.SmilePlus size={16} strokeWidth={1.75} />,
  },
};
