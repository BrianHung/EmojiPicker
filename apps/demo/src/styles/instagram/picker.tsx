import * as I from "@/styles/icons";
import { type Style, type Tokens } from "@/styles/style-picker";

// Measured from Instagram's web DMs (dark theme), Nov 2026. Reaction bar: 308×56, radius 26,
// six 40px cells with 32px emoji from x=12, then a 40px "+" circle. Picker: 340×316, radius 6,
// a 40px pill search at (8,12), 12px/600 section titles, eight 40px columns from x=10, and a
// category bar of 32px buttons on a 41px pitch under a divider. Light values by eye (Messenger web).
const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #262626)",
  "--emoji-picker-foreground": "light-dark(#000000, #f5f5f5)",
  "--emoji-picker-muted": "light-dark(#65676b, #a8a8a8)",
  "--emoji-picker-subtle": "light-dark(#65676b, #8e8e8e)",
  "--emoji-picker-border": "light-dark(#dbdbdb, #363636)",
  "--emoji-picker-input": "light-dark(#f0f2f5, rgb(37 41 46))",
  "--emoji-picker-hover": "light-dark(#f2f2f2, #363636)",
  "--emoji-picker-selected": "light-dark(#f2f2f2, #363636)",
  "--emoji-picker-accent": "light-dark(#000000, rgb(112 141 255))",
  "--emoji-picker-radius": "6px",
  "--emoji-picker-shadow": "0 4px 12px rgb(0 0 0 / 0.15)",
  "--emoji-picker-font": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  "--instagram-more": "light-dark(#f0f2f5, #363636)",
};

/** Instagram's default reactions: ❤️ 😂 😮 😢 😡 👍. */
const REACTIONS = ["2764-fe0f", "1f602", "1f62e", "1f622", "1f621", "1f44d"];

export const instagram: Style = {
  id: "instagram",
  label: "Instagram",
  size: { width: 340, height: 316 },
  layout: {
    id: "instagram",
    tokens,
    root: "h-[316px] w-[340px] rounded-picker bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-size:32px] [--emoji-cell-size:40px] [--emoji-image-size:32px] [--emoji-header-height:34px] [--emoji-list-padding:10px]",
    columns: 8,
    placeholder: "Search emoji",
    suggested: REACTIONS,
    categories: [{ id: "suggested", name: "Your Reactions" }, { id: "custom" }, { id: "smileys_people" }, { id: "animals_nature" }, { id: "food_drink" }, { id: "activities" }, { id: "travel_places" }, { id: "objects" }, { id: "symbols" }, { id: "flags" }],
    cell: "rounded-lg hover:bg-picker-hover data-[highlighted]:bg-picker-selected",
    header: "h-[34px] bg-picker-background pt-[9.5px] pl-[14px] text-[12px] leading-4 font-semibold text-picker-muted",
    searchRow: "-mb-px px-2 pt-3 pb-0 [--search-icon-x:18px]",
    input: "h-10 w-full rounded-full bg-picker-input pr-4 pl-[32px] text-[14px] outline-none placeholder:text-picker-subtle",
    searchIcon: "left",
    // Centered on the field, not the row (which has 12px of top padding).
    searchIconClass: "top-[calc(50%+6px)] text-picker-subtle",
    scrollbar: "[scrollbar-width:none]",
    nav: {
      placement: "bottom",
      className: "h-11 border-t border-picker-border px-[11px] pt-2 pb-1",
      listClassName: "flex w-full justify-between",
      button: "flex size-8 items-center justify-center rounded-full text-picker-subtle hover:text-picker-foreground",
      active: "data-active:text-picker-foreground",
      icons: I.ICONS.instagram,
      iconSize: 20,
      strokeWidth: 1.75,
      hide: ["suggested", "custom"],
    },
  },
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
