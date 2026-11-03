import * as I from "@/styles/icons";
import { Shuffle, Tabs, type Style, type Tokens } from "@/styles/style-picker";

// Measured from Notion's page-icon picker (light, app.notion.com in Chrome at 1x zoom, dpr 2, Nov 2026):
// a 408×390 white card, 10px radius, shadow 0 20 24 / 0 5 8 / 1px ring; a 40px tab row (14px regular tabs,
// 28px tall, 2px ink underline under the text) over a 1px rule; a 322×28 filter (6px radius, 3% warm wash,
// 1px edge, 1px+1px #2383e2 focus ring), a bordered 28px shuffle and the 28px ✋; 12px/500 section titles,
// 32px cells in 12 columns from x=12 (the last one clipped by the 15px scrollbar), 4px hover radius;
// a 51px bar of eleven 32px buttons with 22px icons, the active one on the hover wash.
// Notion's 2025 palette: ink #2c2c2b with warm grays #7d7a75 / #8e8b86. Dark values are not re-measured.
const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #252525)",
  "--emoji-picker-foreground": "light-dark(#2c2c2b, #ffffffcf)",
  "--emoji-picker-muted": "light-dark(#7d7a75, color-mix(in oklab, #fff 45%, transparent))",
  "--emoji-picker-subtle": "light-dark(#8e8b86, color-mix(in oklab, #fff 40%, transparent))",
  "--emoji-picker-border": "light-dark(rgb(42 28 0 / 0.07), color-mix(in oklab, #fff 9.4%, transparent))",
  "--emoji-picker-input": "light-dark(rgb(66 35 3 / 0.03), color-mix(in oklab, #fff 5.5%, transparent))",
  "--emoji-picker-hover": "light-dark(rgb(33 27 23 / 0.051), color-mix(in oklab, #fff 5.5%, transparent))",
  "--emoji-picker-selected": "light-dark(rgb(33 27 23 / 0.051), color-mix(in oklab, #fff 5.5%, transparent))",
  "--emoji-picker-accent": "#2383e2",
  "--emoji-picker-ring": "#2383e2",
  "--emoji-picker-radius": "10px",
  "--emoji-picker-shadow": "0 20px 24px rgb(25 25 25 / 0.05), 0 5px 8px rgb(25 25 25 / 0.027), 0 0 0 1px rgb(42 28 0 / 0.07)",
  "--notion-control": "light-dark(#383836, color-mix(in oklab, #fff 60%, transparent))",
  "--notion-placeholder": "light-dark(rgb(44 44 43 / 0.375), color-mix(in oklab, #fff 30%, transparent))",
  "--notion-edge": "light-dark(rgb(28 19 1 / 0.11), rgb(255 255 255 / 0.094))",
  "--notion-pill-border": "light-dark(color-mix(in oklab, #2c2c2b 16%, transparent), color-mix(in oklab, #fff 15%, transparent))",
};

export const notion: Style = {
  id: "notion",
  label: "Notion",
  size: { width: 408, height: 390 },
  layout: {
    id: "notion",
    tokens,
    root: "h-[390px] w-[408px] rounded-picker bg-picker-background text-picker-foreground shadow-picker [--emoji-size:24px] [--emoji-cell-size:32px] [--emoji-image-size:24px] [--emoji-header-height:34px] [--emoji-list-padding:12px]",
    columns: 12,
    placeholder: "Filter…",
    categories: [{ id: "suggested", name: "Recent" }, { id: "smileys_people", name: "People" }, { id: "animals_nature" }, { id: "food_drink" }, { id: "activities" }, { id: "travel_places" }, { id: "objects" }, { id: "symbols" }, { id: "flags" }, { id: "custom" }],
    // Notion's 12th column runs 3px under its 15px scrollbar; the content box is widened to fit it.
    scrollbar: "overflow-x-hidden [scrollbar-color:rgb(161_158_153/0.5)_transparent] [&_[data-epr-part=category-content]]:mr-[-3px] [&_[data-epr-part=category-content]]:max-w-none",
    cell: "rounded-[4px] hover:bg-picker-hover data-[highlighted]:bg-picker-selected",
    header: "items-start bg-picker-background px-2 pt-3 text-[12px] leading-3 font-medium text-picker-muted",
    top: (
      <Tabs
        items={["Emoji", "Icons", "Upload"]}
        active={0}
        className="flex h-10 shrink-0 items-center px-2 text-[14px] leading-[16.8px] shadow-[inset_0_-1px_0_var(--emoji-picker-border)]"
        // The 2px underline spans the text only, on the row's bottom edge.
        tab="relative flex h-7 items-center px-2"
        activeTab="text-picker-foreground after:absolute after:inset-x-2 after:-bottom-1.5 after:h-0.5 after:bg-picker-foreground"
        inactiveTab="text-picker-subtle"
        right={<span className="ml-auto flex h-7 items-center px-2 text-picker-subtle">Remove</span>}
      />
    ),
    // Filter, shuffle, then ✋ (the engine renders the tone control first, so it is reordered last).
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
    base: "h-6 rounded-full border border-(--notion-pill-border) px-1.5 text-[12px] text-(--notion-control)",
    mine: "aria-pressed:border-picker-accent/50 aria-pressed:bg-picker-accent/[0.08] aria-pressed:text-picker-accent",
    add: "h-6 rounded-full px-1.5 text-picker-subtle hover:bg-picker-hover",
  },
};
