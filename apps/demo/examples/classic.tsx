import * as I from "./icons";
import { type Skin, type Tokens } from "./kit";

// emoji-mart's classic look, from a screenshot at 2x.
// emoji-mart's grays and purple accent.
const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #222)",
  "--emoji-picker-foreground": "light-dark(#222427, #fff)",
  "--emoji-picker-muted": "#858585",
  "--emoji-picker-subtle": "#9a9a9a",
  "--emoji-picker-border": "light-dark(#d9d9d9, #555)",
  "--emoji-picker-input": "light-dark(#ffffff, #222)",
  "--emoji-picker-input-border": "light-dark(#d9d9d9, #555)",
  "--emoji-picker-hover": "light-dark(#f4f4f4, #444)",
  "--emoji-picker-selected": "light-dark(#f4f4f4, #444)",
  "--emoji-picker-accent": "#ae65c5",
  "--emoji-picker-ring": "#ae65c5",
  "--emoji-picker-radius": "5px",
  "--emoji-picker-font": "-apple-system, 'Helvetica Neue', sans-serif",
  "--classic-strong": "#464646",
};

export const classic: Skin = {
  id: "classic",
  label: "emoji-mart classic",
  note: "Category tabs, search with a trailing icon, bold section titles and a preview footer.",
  size: { width: 345, height: 434 },
  layout: {
    id: "classic",
    tokens,
    root: "h-[434px] w-[345px] rounded-picker border border-picker-border bg-picker-background font-picker text-picker-foreground [--emoji-size:26px] [--emoji-cell-size:36px] [--emoji-image-size:26px] [--emoji-header-height:30px] [--emoji-list-padding:4px]",
    columns: 9,
    placeholder: "Search",
    cell: "rounded-full hover:bg-picker-hover data-[highlighted]:bg-picker-selected",
    header: "bg-picker-background/95 px-1.5 pt-1 text-[16px] font-medium",
    searchRow: "px-1.5 pt-1.5 pb-0.5 [--search-icon-x:10px]",
    input: "h-[30px] w-full rounded-picker border border-picker-input-border bg-picker-input pr-8 pl-2.5 text-[16px] outline-none placeholder:text-picker-subtle focus:border-picker-ring",
    searchIcon: "right",
    searchIconClass: "text-picker-muted",
    nav: {
      placement: "top",
      className: "h-[44px] border-b border-picker-border px-1.5",
      button: "relative flex h-[44px] w-[30px] items-center justify-center text-picker-muted after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-transparent hover:text-(--classic-strong)",
      active: "data-active:text-picker-accent data-active:after:bg-picker-accent",
      icons: I.ICONS.classic,
      iconSize: 22,
      strokeWidth: 1.6,
    },
    skinTone: "dot",
    footer: "classic",
    footerClass: "flex h-[70px] shrink-0 items-center gap-3 border-t border-picker-border px-4",
  },
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-picker border border-picker-border bg-picker-background",
    reactions: "flex items-center gap-0.5 p-1 [--emoji-image-size:24px] [&_button]:flex [&_button]:size-9 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:text-[24px] [&_button:hover]:bg-picker-hover",
  },
  autocomplete: {
    className: "rounded-picker border border-picker-border bg-picker-background py-1",
    item: "h-8 px-3 text-[15px] data-[highlighted]:bg-picker-accent data-[highlighted]:text-white",
    match: "font-bold",
  },
  pill: {
    base: "h-6 rounded-full border border-picker-border bg-picker-background px-1.5 text-[12px]",
    mine: "aria-pressed:border-picker-accent aria-pressed:bg-picker-accent/10 aria-pressed:text-picker-accent",
    add: "h-6 rounded-full border border-picker-border px-1.5 text-picker-muted",
  },
};
