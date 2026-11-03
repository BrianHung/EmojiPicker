import * as I from "./icons";
import { Tabs, type Skin, type Tokens } from "./kit";

// Measured from Slack's web client (composer emoji button, light theme), Nov 2026:
// 361×504 popover, 50px tabs, 38px category bar, 36px search, 35×32 cells on a
// 36×33 pitch from x=15, 26px section titles at x=20, 60px gray footer.

/** Slack's first section, pinned rather than learned. */
const GETTING_WORK_DONE = [
  "2705", "1f440", "1f64c", "1f64f", "2795", "1f44f", "1f4a1", "1f3af", "1f44b",
  "1f44d", "1f389", "31-fe0f-20e3", "32-fe0f-20e3", "33-fe0f-20e3", "1f4e3", "26aa", "1f535", "1f534",
];

/** The yellow face on Slack's "Emoji" tab. */
function EmojiTabIcon() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden>
      <circle cx="10" cy="10" r="8.6" fill="#ffc935" stroke="#1d1c1d" strokeWidth="1.6" />
      <path d="M6.2 10.6h7.6a3.8 3.8 0 0 1-7.6 0Z" fill="#1d1c1d" />
      <circle cx="7.4" cy="7.4" r="1.1" fill="#1d1c1d" />
      <circle cx="12.6" cy="7.4" r="1.1" fill="#1d1c1d" />
    </svg>
  );
}

// Light values measured from Slack; dark values follow Slack's dark theme by eye
// (no dark reference was captured). Standard roles first, then Slack-only ones.
const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #1a1d21)",
  "--emoji-picker-foreground": "light-dark(#1d1c1d, #d1d2d3)",
  "--emoji-picker-muted": "light-dark(#454447, #ababad)",
  "--emoji-picker-subtle": "#868686",
  "--emoji-picker-border": "light-dark(rgb(94 93 96 / 0.13), rgb(232 232 232 / 0.13))",
  "--emoji-picker-input-border": "light-dark(color-mix(in oklab, #5e5d60 45%, transparent), #565856)",
  "--emoji-picker-panel": "light-dark(#f8f8f8, #222529)",
  "--emoji-picker-hover": "light-dark(#f8f8f8, #222529)",
  "--emoji-picker-selected": "light-dark(#e8f5fa, color-mix(in oklab, #1d9bd1 20%, transparent))",
  "--emoji-picker-accent": "light-dark(#83388a, #d18fd6)",
  "--emoji-picker-ring": "#1264a3",
  "--emoji-picker-radius": "6px",
  "--emoji-picker-font": "Lato, 'Slack-Lato', system-ui, sans-serif",
  "--emoji-picker-shadow": "0 0 0 1px var(--emoji-picker-border), 0 4px 6px -4px var(--slack-drop), 0 10px 15px -3px var(--slack-drop)",
  "--slack-drop": "light-dark(rgb(0 0 0 / 0.1), rgb(0 0 0 / 0.4))",
  "--slack-divider": "light-dark(color-mix(in oklab, #000 15%, transparent), color-mix(in oklab, #fff 15%, transparent))",
  "--slack-thumb": "light-dark(color-mix(in oklab, #000 25%, transparent), color-mix(in oklab, #fff 25%, transparent))",
  "--slack-link": "light-dark(#1264a3, #1d9bd1)",
  "--slack-badge": "light-dark(#e9edf9, color-mix(in oklab, #1d4ab7 30%, transparent))",
  "--slack-badge-foreground": "light-dark(#1e328f, #9fb6f5)",
  "--slack-pill": "light-dark(#f1f1f1, #2c2d30)",
  "--slack-match": "light-dark(#fdf2d0, #5c4813)",
  "--slack-match-foreground": "light-dark(#1d1c1d, #f2c744)",
  "--slack-match-active": "#f2c744",
  "--slack-mine-border": "#1d9bd1",
  "--slack-pill-hover-border": "#bdbdbd",
};

const UNDERLINE = "shadow-[inset_0_-2px_0_var(--emoji-picker-accent)]";
const DIVIDER = "shadow-[inset_0_-1px_0_var(--emoji-picker-border)]";

export const slack: Skin = {
  id: "slack",
  label: "Slack",
  note: "Tabs, a category bar, a pinned section and a footer with skin tone.",
  size: { width: 361, height: 504 },
  layout: {
    id: "slack",
    tokens,
    root: "group h-[504px] w-[361px] rounded-picker bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-size:22px] [--emoji-cell-size:33px] [--emoji-image-size:22px] [--emoji-header-height:27px] [--emoji-list-padding:8.5px]",
    columns: 9,
    placeholder: "Search all emoji",
    categories: [
      { id: "suggested", name: "Getting Work Done" },
      { id: "smileys_people" },
      { id: "animals_nature" },
      { id: "food_drink" },
      { id: "travel_places" },
      { id: "activities" },
      { id: "objects" },
      { id: "symbols" },
      { id: "flags" },
      { id: "custom" },
    ],
    suggested: GETTING_WORK_DONE,
    cell: "rounded-md hover:bg-picker-hover data-[highlighted]:bg-picker-selected",
    header: "h-[27px] bg-picker-background/95 px-[13.5px] text-[13px] leading-[26px] font-bold text-picker-foreground",
    top: (
      <Tabs
        items={[
          <>
            <EmojiTabIcon />
            Emoji
          </>,
          <>
            <I.Sticker size={20} strokeWidth={1.6} />
            GIFs
            <span className="rounded bg-(--slack-badge) px-1 py-px text-[13px] font-normal text-(--slack-badge-foreground)">New</span>
          </>,
        ]}
        active={0}
        className={`grid h-[50px] shrink-0 grid-cols-2 ${DIVIDER}`}
        tab="flex items-center justify-center gap-[7px] pb-px text-[15px] font-bold"
        inactiveTab="text-picker-muted"
        activeTab={`text-picker-foreground ${UNDERLINE}`}
      />
    ),
    searchRow: "px-[17.5px] pt-3.5 pb-[7px]",
    input:
      "h-9 w-full rounded-lg border border-picker-input-border bg-picker-background px-3 py-1 text-[15px] outline-none placeholder:text-picker-subtle focus:border-transparent focus:shadow-[0_0_0_1px_var(--emoji-picker-ring),0_0_0_5px_color-mix(in_oklab,var(--emoji-picker-ring)_30%,transparent)]",
    nav: {
      placement: "top",
      className: `mt-1 h-[38px] pl-2.5 pr-[10px] ${DIVIDER}`,
      // The search tab is underlined while search has focus, like Slack's.
      leading: (
        <span className="flex h-[38px] w-[34px] shrink-0 items-start justify-center rounded-t-[9.6px] pt-1 text-picker-subtle group-has-[input:focus]:text-picker-foreground group-has-[input:focus]:shadow-[inset_0_-2px_0_var(--emoji-picker-accent)]">
          <I.Search size={22} strokeWidth={2} />
        </span>
      ),
      trailing: (
        <span className="flex h-[38px] w-[34px] shrink-0 items-start justify-center pt-1 text-picker-subtle">
          <I.Grid size={22} strokeWidth={1.7} />
        </span>
      ),
      button: "flex h-[38px] w-[34px] items-start justify-center rounded-t-[9.6px] pt-1 text-picker-subtle hover:text-picker-foreground",
      active: `data-active:text-picker-foreground data-active:shadow-[inset_0_-2px_0_var(--emoji-picker-accent)] data-active:group-has-[input:focus]:text-picker-subtle data-active:group-has-[input:focus]:shadow-none`,
      icons: I.ICONS.slack,
      iconSize: 23,
      strokeWidth: 1.7,
      hide: ["suggested", "custom"],
    },
    viewport: "ml-[6.5px]",
    scrollbar:
      "[&::-webkit-scrollbar]:w-[15px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-4 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-(--slack-thumb) [&::-webkit-scrollbar-thumb]:bg-clip-padding",
    skinTone: "hand",
    skinTonePlacement: "footer",
    toneButton: "h-[26px] w-[22px] text-[22px]",
    footer: "slack",
    footerClass: "flex h-[60px] shrink-0 items-center border-t border-(--slack-divider) bg-picker-panel pr-[26px] pl-3.5",
  },
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-lg bg-picker-background shadow-picker",
    reactions: "flex items-center gap-0.5 p-0.5 [--emoji-image-size:18px] [&_button]:flex [&_button]:size-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-md [&_button]:text-[18px] [&_button:hover]:bg-picker-hover",
  },
  autocomplete: {
    className: "rounded-lg bg-picker-background py-1 font-picker shadow-picker",
    item: "h-8 rounded-none px-4 text-[15px] text-picker-foreground data-[highlighted]:bg-(--slack-link) data-[highlighted]:text-white",
    match: "rounded-[2px] bg-(--slack-match) text-(--slack-match-foreground)",
    matchActive: "data-active:bg-(--slack-match-active) data-active:text-[#1d1c1d]",
  },
  pill: {
    base: "h-6 rounded-[12px] border border-transparent bg-(--slack-pill) px-1.5 text-[12px] text-picker-foreground hover:border-(--slack-pill-hover-border) hover:bg-picker-background",
    mine: "aria-pressed:border-(--slack-mine-border) aria-pressed:bg-picker-selected aria-pressed:text-(--slack-link)",
    add: "h-6 rounded-[12px] bg-(--slack-pill) px-1.5 text-picker-muted",
  },
};
