import type { ShortcodeAutocompleteOptions } from "@brianhung/emoji-picker";
import * as I from "@/styles/icons";
import { Tabs, type Style, type Tokens } from "@/styles/style-picker";

const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #242429)",
  "--emoji-picker-foreground": "light-dark(#2e2e34, #efeff1)",
  "--emoji-picker-muted": "light-dark(#2e2e34, #efeff1)",
  "--emoji-picker-subtle": "light-dark(#595a63, #949ba4)",
  "--emoji-picker-border": "light-dark(color-mix(in oklab, #97979f 28%, transparent), color-mix(in oklab, #97979f 12%, transparent))",
  "--emoji-picker-input": "light-dark(color-mix(in oklab, #000 2%, transparent), color-mix(in oklab, #000 12%, transparent))",
  "--emoji-picker-input-border": "light-dark(color-mix(in oklab, #97979f 40%, transparent), color-mix(in oklab, #97979f 20%, transparent))",
  "--emoji-picker-panel": "light-dark(#fbfbfb, #1a1a1e)",
  "--emoji-picker-hover": "light-dark(color-mix(in oklab, #97979f 24%, transparent), color-mix(in oklab, #97979f 20%, transparent))",
  "--emoji-picker-selected": "light-dark(#fbfbfb, #202024)",
  "--emoji-picker-accent": "#5865f2",
  "--emoji-picker-ring": "#5865f2",
  "--emoji-picker-radius": "8px",
  "--emoji-picker-font": "'gg sans', 'Noto Sans', system-ui, sans-serif",
  "--emoji-picker-shadow": "0 12px 24px light-dark(transparent, rgb(0 0 0 / 0.24)), 0 12px 36px light-dark(rgb(0 0 0 / 0.12), transparent)",
  "--discord-strong": "light-dark(#28282d, #fbfbfb)",
  "--discord-placeholder": "light-dark(#696a73, #8f9097)",
  "--discord-chip": "color-mix(in oklab, #97979f 12%, transparent)",
  "--discord-tab": "color-mix(in oklab, #97979f 16%, transparent)",
  "--discord-chip-border": "light-dark(color-mix(in oklab, #97979f 20%, transparent), color-mix(in oklab, #97979f 4%, transparent))",
  "--discord-popup": "light-dark(#ffffff, #2b2b31)",
  "--discord-popup-border": "light-dark(#e1e2e4, color-mix(in oklab, #3f3f46 60%, transparent))",
  "--discord-pill-foreground": "light-dark(#595a63, #b5bac1)",
  "--discord-mine": "light-dark(#e6eaff, color-mix(in oklab, #5865f2 24%, transparent))",
  "--discord-mine-foreground": "light-dark(#4654c0, oklab(0.840364 0.0038172 -0.0788282))",
  "--discord-thumb": "light-dark(#8b8c94, #5f606a)",
  "--discord-icon": "light-dark(#595a63, #abacb2)",
  "--discord-autocomplete": "light-dark(#ffffff, oklab(0.2624 0.0025 -0.0089))",
  "--discord-autocomplete-text": "light-dark(#28282d, oklab(0.988 0 0))",
  "--discord-autocomplete-muted": "light-dark(#595a63, oklab(0.7454 0.0013 -0.0085))",
  "--discord-autocomplete-hover": "light-dark(color-mix(in oklab, #97979f 12%, transparent), oklab(0.6789 0.0033 -0.0112 / 0.12))",
  "--discord-autocomplete-shadow": "0 0 0 1px light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.08)), 0 12px 24px light-dark(transparent, rgb(0 0 0 / 0.24)), 0 12px 36px light-dark(rgb(0 0 0 / 0.12), transparent)",
};

/** Discord lists `:smi` matches A–Z: codes starting with the query, then the rest. */
export const discordAutocompleteOptions = { order: "alphabetical", limit: 14 } satisfies Partial<ShortcodeAutocompleteOptions>;

export const discord: Style = {
  id: "discord",
  label: "Discord",
  renderer: "twemoji",
  size: { width: 498, height: 486 },
  layout: {
    id: "discord",
    tokens,
    root: "h-[486px] w-[498px] rounded-picker border-[0.8px] border-picker-border bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-size:40px] [--emoji-cell-size:48px] [--emoji-image-size:40px] [--emoji-header-height:32px] [--emoji-list-padding:4px]",
    columns: 9,
    frequent: 18,
    placeholder: "Find the perfect emoji",
    categories: [
      { id: "suggested", name: "Frequently Used" },
      { id: "custom" },
      { id: "smileys_people", name: "People" },
      { id: "animals_nature", name: "Nature" },
      { id: "food_drink", name: "Food" },
      { id: "activities", name: "Activities" },
      { id: "travel_places", name: "Travel" },
      { id: "objects", name: "Objects" },
      { id: "symbols", name: "Symbols" },
      { id: "flags", name: "Flags" },
    ],
    cell: "rounded hover:bg-picker-hover data-[highlighted]:bg-picker-hover data-focus-visible:bg-picker-hover",
    header: "flex h-8 items-center gap-1 bg-picker-background pr-1 pl-1 text-[14px] leading-[18px] font-semibold text-picker-muted",
    headerIcon: { size: 16, chevron: true },
    top: (
      <Tabs
        items={["GIFs", "Stickers", "Emoji"]}
        active={2}
        className="flex h-[58px] shrink-0 items-start gap-2 px-4 pt-4"
        tab="flex h-[30px] items-center rounded-[8px] px-3 text-[14px] leading-[14px] font-semibold"
        activeTab="bg-(--discord-tab) text-(--discord-strong)"
        inactiveTab="text-picker-muted"
      />
    ),
    searchRow: "h-[53px] gap-3 px-4 pb-[13px] [--search-icon-x:27.8px]",
    input:
      "h-10 w-full rounded-[8px] border-[0.8px] border-picker-input-border bg-picker-input pr-3 pl-[38.8px] text-[16px] leading-5 text-picker-foreground outline-none placeholder:text-(--discord-placeholder) focus:border-picker-ring focus:outline-2 focus:outline-picker-ring",
    searchIcon: "left",
    searchIconClass: "top-3 translate-y-0 text-picker-muted",
    skinTone: "hand",
    toneEmoji: "1f44f",
    toneButton: "size-[38px] text-[28px]",
    nav: {
      placement: "left",
      className: "w-12 items-center rounded-bl-lg bg-picker-panel pt-2 pb-[9px]",
      listClassName: "gap-2",
      button: "relative flex size-8 items-center justify-center rounded text-picker-subtle hover:bg-picker-hover hover:text-(--discord-strong)",
      active: "data-active:bg-picker-selected data-active:text-(--discord-strong) data-active:before:absolute data-active:before:top-1 data-active:before:-left-3 data-active:before:h-6 data-active:before:w-2 data-active:before:rounded-r-full data-active:before:bg-(--discord-strong)",
      icons: I.ICONS.apple,
      iconSize: 24,
      strokeWidth: 2,
      trailing: (
        <span className="mt-auto flex size-8 shrink-0 items-center justify-center text-picker-subtle">
          <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
            <circle cx="12" cy="12" r="11" fill="currentColor" />
            <circle cx="8.5" cy="10" r="1.5" fill="var(--emoji-picker-panel)" />
            <circle cx="15.5" cy="10" r="1.5" fill="var(--emoji-picker-panel)" />
            <path d="M7 14.2a5.5 5.5 0 0 0 10 0" fill="none" stroke="var(--emoji-picker-panel)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      ),
    },
    // Nine 48px columns fit beside the 8px scrollbar only without the end padding.
    scrollbar:
      "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:min-h-10 [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-(--discord-thumb) [&::-webkit-scrollbar-thumb]:bg-clip-padding [--emoji-list-padding-end:0px]",
    fixedColumns: true,
    viewport: "pl-1",
    footer: "discord",
    footerInColumn: true,
    footerClass: "flex h-12 shrink-0 items-center gap-2 bg-picker-panel px-4",
  },
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-[8px] border-[0.8px] border-(--discord-chip-border) bg-picker-background shadow-[0_1px_4px_rgb(0_0_0/0.14)]",
    reactions: "flex items-center p-0.5 [--emoji-image-size:20px] [&_button]:flex [&_button]:size-7 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[6px] [&_button]:text-[20px] [&_button:hover]:bg-picker-hover",
    more: { className: "text-(--discord-icon)", icon: <I.SmilePlus size={20} strokeWidth={2} /> },
  },
  autocomplete: {
    className: "mx-3 rounded-[5px] bg-(--discord-autocomplete) font-picker text-(--discord-autocomplete-text) shadow-(--discord-autocomplete-shadow)",
    headerClassName: "px-2 pt-2 pb-4 text-[14px] leading-[18.67px] font-medium text-(--discord-autocomplete-muted)",
    list: "max-h-[437px] px-2 pb-2 [scrollbar-width:thin]",
    item: "h-[31.2px] gap-2 rounded-[3px] px-2 py-0 text-[16px] leading-5 font-normal data-[highlighted]:bg-(--discord-autocomplete-hover)",
    match: "",
    emoji: 20,
    header: (q) => `Emoji matching :${q}`,
  },
  pill: {
    base: "h-[29.6px] gap-1.5 rounded-[8px] border-[0.8px] border-transparent bg-(--discord-chip) px-1.5 text-[16px] leading-4 font-semibold text-(--discord-pill-foreground)",
    mine: "aria-pressed:border-picker-accent aria-pressed:bg-(--discord-mine) aria-pressed:text-(--discord-mine-foreground)",
    add: "h-[29.6px] rounded-[8px] bg-(--discord-chip) px-1.5 text-(--discord-pill-foreground)",
    emoji: 20,
  },
};
