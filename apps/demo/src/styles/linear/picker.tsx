import { type Style, type Tokens } from "@/styles/style-picker";

// Measured from Linear's web app (issue reaction button, light theme), Nov 2026:
// 273×321 popover, borderless 28px search (radius 8) at (5.5,4.5), a lch(97.3) divider
// at 37, 28px section titles with 12px/500 text at x=14.5, 28px cells (radius 8, 19px
// emoji) on a 28px pitch from x=10.5. Its thin scrollbar sits over the ninth column.

// Light and dark values measured from Linear with DevTools (its own lch() palette).
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
};

const POPUP = "rounded-picker border-[0.5px] border-picker-border bg-picker-background shadow-picker";

export const linear: Style = {
  id: "linear",
  label: "Linear",
  size: { width: 273, height: 321 },
  layout: {
    id: "linear",
    tokens,
    root: `h-[321px] w-[273px] ${POPUP} font-picker text-picker-foreground [--emoji-size:19px] [--emoji-cell-size:28px] [--emoji-image-size:20px] [--emoji-header-height:28px] [--emoji-list-padding:9.5px]`,
    columns: 9,
    frequent: 18,
    placeholder: "Search emoji…",
    cell: "rounded-[8px] hover:bg-picker-hover data-[highlighted]:bg-picker-selected",
    header: "h-7 bg-picker-background pt-1.5 pr-1.5 pl-3.5 text-[12px] leading-[22px] font-medium text-picker-muted",
    searchRow: "border-b border-(--linear-divider) px-[5px] pt-1 pb-1",
    input: "h-7 w-full rounded-[8px] bg-transparent py-1.5 pr-7 pl-[9px] text-[13px] outline-none placeholder:text-picker-subtle",
    // The rows keep nine columns and run under the scrollbar, as Linear's do.
    scrollbar: "overflow-x-hidden [scrollbar-color:var(--linear-thumb)_transparent] [scrollbar-width:thin] [&_[data-epr-part=category-content]]:max-w-none",
    categories: [{ id: "suggested", name: "Frequently used" }, { id: "custom" }, { id: "smileys_people" }, { id: "animals_nature" }, { id: "food_drink" }, { id: "travel_places" }, { id: "activities" }, { id: "objects" }, { id: "symbols" }, { id: "flags" }],
  },
  tapback: {
    className: `flex w-fit flex-col overflow-hidden ${POPUP}`,
    reactions: "flex items-center gap-0.5 p-1 [--emoji-image-size:18px] [&_button]:flex [&_button]:size-7 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[8px] [&_button]:text-[18px] [&_button:hover]:bg-picker-hover",
  },
  autocomplete: {
    className: `${POPUP} p-1 font-picker`,
    item: "h-7 rounded-md px-2 text-[13px] data-[highlighted]:bg-picker-selected",
    match: "font-semibold",
    showName: true,
  },
  pill: {
    base: "h-6 rounded-full border-[0.5px] border-picker-border bg-(--linear-pill) px-2 text-[12px] text-(--linear-pill-foreground)",
    mine: "aria-pressed:border-picker-accent/60 aria-pressed:bg-picker-accent/10 aria-pressed:text-picker-accent",
    add: "h-6 rounded-full px-1.5 text-picker-subtle hover:bg-picker-hover",
  },
};
