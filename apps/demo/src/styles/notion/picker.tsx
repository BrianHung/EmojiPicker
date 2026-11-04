import * as I from "@/styles/icons";
import { Shuffle, Tabs, type PickerLayout, type Style, type Tokens } from "@/styles/style-picker";

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
  "--notion-mine": "light-dark(rgb(0 124 215 / 0.094), rgb(35 131 226 / 0.2))",
  "--notion-mine-foreground": "light-dark(#2783de, #529cca)",
};

/** Notion's sections, in the order its bar shows them. */
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
];

const layout: PickerLayout = {
  id: "notion",
  tokens,
  root: "h-[390px] w-[408px] rounded-picker bg-picker-background text-picker-foreground shadow-picker [--emoji-size:24px] [--emoji-cell-size:32px] [--emoji-image-size:24px] [--emoji-header-height:34px] [--emoji-list-padding:12px]",
  columns: 12,
  placeholder: "Filter…",
  categories: NOTION_SECTIONS,
  // The 12th column runs 3px under the scrollbar.
  scrollbar: "overflow-x-hidden [scrollbar-color:rgb(161_158_153/0.5)_transparent] [--emoji-list-padding-end:-3px]",
  fixedColumns: true,
  cell: "rounded-[4px] hover:bg-picker-hover data-[highlighted]:bg-picker-selected data-focus-visible:bg-picker-selected",
  header: "items-start bg-picker-background px-2 pt-3 text-[12px] leading-3 font-medium text-picker-muted",
  top: (
    <Tabs
      items={["Emoji", "Icons", "Upload"]}
      active={0}
      className="flex h-10 shrink-0 items-center px-2 text-[14px] leading-[16.8px] shadow-[inset_0_-1px_0_var(--emoji-picker-border)]"
      tab="relative flex h-7 items-center px-2"
      activeTab="text-picker-foreground after:absolute after:inset-x-2 after:-bottom-1.5 after:h-0.5 after:bg-picker-foreground"
      inactiveTab="text-picker-subtle"
      right={<span className="ml-auto flex h-7 items-center px-2 text-picker-subtle">Remove</span>}
    />
  ),
  // The engine renders the tone control first; Notion shows it last.
  searchRow: "mt-1 mb-2.5 gap-2 px-2 py-1 [--search-icon-x:14px] [&_[data-slot=skin-tone]]:order-last [&_[data-slot=skin-tone]]:-ml-0.5",
  input:
    "h-7 w-full rounded-[6px] bg-picker-input pr-1.5 pl-7 text-[14px] leading-5 outline-none shadow-[0_0_0_1px_var(--notion-edge)] placeholder:text-(--notion-placeholder) focus:shadow-[inset_0_0_0_1px_var(--emoji-picker-ring),0_0_0_1px_var(--emoji-picker-ring)]",
  searchIcon: "left",
  searchIconClass: "text-picker-subtle",
  trailing: (pick) => (
    <Shuffle onPick={pick} className="flex size-7 shrink-0 items-center justify-center rounded-[6px] border border-(--notion-edge) text-(--notion-control) hover:bg-picker-hover [&_svg]:size-3.5" />
  ),
  skinTone: "hand",
  toneButton: "size-7 rounded-[6px] text-[20px] hover:bg-picker-hover",
  nav: {
    placement: "bottom",
    className: "h-[51px] border-t border-picker-border px-3 pt-2 pb-2.5",
    listClassName: "justify-start gap-[3.2px]",
    button: "flex size-8 items-center justify-center rounded-[6px] text-picker-subtle hover:bg-picker-hover",
    active: "data-active:bg-picker-selected",
    icons: I.ICONS.notion,
    iconSize: 22,
    strokeWidth: 1.5,
    trailing: (
      <span className="flex size-8 shrink-0 items-center justify-center text-picker-subtle">
        <I.PlusCircleFilled size={22} />
      </span>
    ),
  },
};

export const notion: Style = {
  id: "notion",
  label: "Notion",
  size: { width: 408, height: 390 },
  layout,
  reaction: {
    ...layout,
    root: layout.root.replace("h-[390px]", "h-[356px]"),
    top: undefined,
    trailing: undefined,
    searchRow: "gap-2 px-2 pt-2 pb-[14.5px] [--search-icon-x:14px] [&_[data-slot=skin-tone]]:order-last",
  },
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
    base: "h-[25px] rounded-[100px] bg-picker-border px-2 py-0.5 text-[12px] text-picker-subtle",
    mine: "aria-pressed:bg-(--notion-mine) aria-pressed:text-(--notion-mine-foreground)",
    count: "font-medium",
    add: "h-[25px] w-8 justify-center rounded-[100px] bg-picker-border text-picker-subtle hover:bg-picker-hover",
    addIcon: <I.SmilePlus size={16} strokeWidth={1.75} />,
  },
};

