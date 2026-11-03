import * as I from "@/styles/icons";
import { type Style, type Tokens } from "@/styles/style-picker";

// Measured from Slack's web client (composer emoji button, light theme), Nov 2026:
// 361×454 popover (no Emoji/GIFs tabs any more), a 38px bar of ten 34.3px tabs from
// x=8 at y=4, a 36px search at (17.5,56), 35×32 cells on a 36×33 pitch from x=15,
// 27px section titles at x=21 with 1px between sections, a 60px gray footer.

/** Slack's first section, pinned rather than learned. */
const GETTING_WORK_DONE = [
  "2705", "1f440", "1f64c", "1f64f", "2795", "1f44f", "1f4a1", "1f3af", "1f44b",
  "1f44d", "1f389", "31-fe0f-20e3", "32-fe0f-20e3", "33-fe0f-20e3", "1f4e3", "26aa", "1f535", "1f534",
];

/** The four-pill mark on Slack's "Custom" tab, drawn at its 20px size. */
function CustomTabIcon() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} fill="currentColor" aria-hidden>
      <rect x="5.72" y="1" width="3.8" height="3.8" rx="1.9" />
      <rect x="10.47" y="1" width="3.8" height="8.53" rx="1.9" />
      <rect x="1" y="5.72" width="8.53" height="3.8" rx="1.9" />
      <rect x="15.2" y="5.72" width="3.8" height="3.8" rx="1.9" />
      <rect x="1" y="10.47" width="3.8" height="3.8" rx="1.9" />
      <rect x="5.72" y="10.47" width="3.8" height="8.53" rx="1.9" />
      <rect x="10.47" y="10.47" width="8.53" height="3.8" rx="1.9" />
      <rect x="10.47" y="15.2" width="3.8" height="3.8" rx="1.9" />
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
  "--slack-button-border": "light-dark(color-mix(in oklab, #5e5d60 45%, transparent), #565856)",
  "--slack-placeholder": "light-dark(#5e5d60, #ababad)",
  "--emoji-picker-border": "light-dark(rgb(94 93 96 / 0.13), rgb(232 232 232 / 0.13))",
  "--emoji-picker-input-border": "light-dark(#7c7a7f, #565856)",
  "--emoji-picker-panel": "light-dark(#f8f8f8, #222529)",
  "--emoji-picker-hover": "light-dark(#f8f8f8, #222529)",
  "--emoji-picker-selected": "light-dark(#e8f5fa, color-mix(in oklab, #1d9bd1 20%, transparent))",
  "--emoji-picker-accent": "light-dark(#83388a, #d18fd6)",
  "--emoji-picker-ring": "#1264a3",
  "--emoji-picker-radius": "6px",
  "--emoji-picker-font": "Lato, 'Slack-Lato', system-ui, sans-serif",
  "--emoji-picker-shadow": "0 0 0 1px light-dark(rgb(29 28 29 / 0.13), rgb(232 232 232 / 0.13)), 0 4px 12px light-dark(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.4))",
  "--slack-divider": "light-dark(color-mix(in oklab, #000 15%, transparent), color-mix(in oklab, #fff 15%, transparent))",
  "--slack-thumb": "light-dark(#c1c1c1, #6b6b6b)",
  "--slack-track": "light-dark(#fafafa, #2c2c2c)",
  "--slack-track-rule": "light-dark(#e8e8e8, #3a3a3a)",
  "--slack-icon": "light-dark(#616061, #ababad)",
  "--slack-link": "light-dark(#1264a3, #1d9bd1)",
  "--slack-pill": "light-dark(#f1f1f1, #2c2d30)",
  "--slack-match": "light-dark(#fdf2d0, #5c4813)",
  "--slack-match-foreground": "light-dark(#1d1c1d, #f2c744)",
  "--slack-match-active": "#f2c744",
  "--slack-mine-border": "#1d9bd1",
  "--slack-pill-hover-border": "#bdbdbd",
};

const DIVIDER = "shadow-[inset_0_-1px_0_var(--emoji-picker-border)]";

export const slack: Style = {
  id: "slack",
  label: "Slack",
  size: { width: 361, height: 454 },
  layout: {
    id: "slack",
    tokens,
    root: "group h-[454px] w-[361px] rounded-picker bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-size:22px] [--emoji-cell-size:33px] [--emoji-image-size:22px] [--emoji-header-height:28px] [--emoji-list-padding:9px]",
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
    // Slack's 35×32 hover box (radius 6) sits 1px left of the 33px cell and stops 1px above the next row.
    cell: "relative isolate before:absolute before:inset-[0_1px_1px_-1px] before:-z-10 before:rounded-[6px] hover:before:bg-picker-hover data-[highlighted]:before:bg-picker-selected",
    header: "block h-7 bg-picker-background/95 pt-px pr-3.5 pl-3.5 text-[13px] leading-6 font-bold text-picker-foreground",
    searchRow: "px-[17.5px] pt-3.5 pb-[7px]",
    input:
      "h-9 w-full rounded-[8px] border border-picker-input-border bg-picker-background px-3 py-1 text-[15px] outline-none placeholder:text-(--slack-placeholder) focus:border-transparent focus:shadow-[0_0_0_1px_var(--emoji-picker-ring),0_0_0_5px_color-mix(in_oklab,var(--emoji-picker-ring)_30%,transparent)]",
    nav: {
      placement: "top",
      className: `mt-1 h-[38px] pr-[10px] pl-2 ${DIVIDER}`,
      // The search tab is underlined while search has focus, like Slack's.
      leading: (
        <span className="flex h-[38px] w-[34.3px] shrink-0 items-start rounded-t-[9.6px] pt-[3px] pl-[4.8px] text-picker-subtle group-has-[input:focus]:text-picker-foreground group-has-[input:focus]:shadow-[inset_0_-2px_0_var(--emoji-picker-accent)]">
          <I.Search size={22} strokeWidth={2} />
        </span>
      ),
      trailing: (
        <span className="flex h-[38px] w-[34.3px] shrink-0 items-start pt-1 pl-[5.8px] text-picker-subtle">
          <CustomTabIcon />
        </span>
      ),
      // Icons sit left of center, as Slack's 20px icons do in their 34.3px tabs.
      button: "flex h-[38px] w-[34.3px] items-start rounded-t-[9.6px] pt-[3px] pl-[4.8px] text-picker-subtle hover:text-picker-foreground",
      active: `data-active:text-picker-foreground data-active:shadow-[inset_0_-2px_0_var(--emoji-picker-accent)] data-active:group-has-[input:focus]:text-picker-subtle data-active:group-has-[input:focus]:shadow-none`,
      icons: I.ICONS.slack,
      iconSize: 22,
      strokeWidth: 1.7,
      hide: ["suggested", "custom"],
    },
    viewport: "ml-[7px]",
    // The classic macOS scrollbar Slack shows: a #fafafa track with a 1px rule, an 8px thumb.
    scrollbar:
      "[&::-webkit-scrollbar]:w-[15px] [&::-webkit-scrollbar-track]:bg-(--slack-track) [&::-webkit-scrollbar-track]:shadow-[inset_1px_0_var(--slack-track-rule)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:[border-width:2px_3px_2px_4px] [&::-webkit-scrollbar-thumb]:bg-(--slack-thumb) [&::-webkit-scrollbar-thumb]:bg-clip-padding",
    skinTone: "hand",
    skinTonePlacement: "footer",
    toneButton: "h-[26px] w-[22px] text-[22px]",
    footer: "slack",
    footerClass: "flex h-[60px] shrink-0 items-center border-t border-(--slack-divider) bg-picker-panel pt-0.5 pr-[26px] pl-3.5",
  },
  // The message hover bar: 40px tall, radius 12, 32px buttons with 16px emoji, an 18px add-reaction icon.
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-[12px] bg-picker-background shadow-[0_0_0_1px_light-dark(rgb(29_28_29/0.13),rgb(232_232_232/0.13)),0_1px_3px_rgb(0_0_0/0.08)]",
    reactions: "flex items-center p-1 [--emoji-image-size:16px] [&_button]:flex [&_button]:size-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[8px] [&_button]:text-[16px] [&_button:hover]:bg-picker-hover",
    more: { className: "text-(--slack-icon)", icon: <I.SmilePlus size={18} strokeWidth={1.75} /> },
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
