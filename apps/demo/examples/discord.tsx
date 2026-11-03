import type { ShortcodeAutocompleteOptions } from "@brianhung/emoji-picker";
import { cn } from "../components/code";
import * as I from "./icons";
import { Tabs, type Skin, type Tokens } from "./kit";

// Measured from Discord's web client (composer emoji button, dark theme), Nov 2026:
// 498×486 popover, 30px tabs at 16.8, 40px search + 38px skin tone + "Add Emoji",
// a 48px rail down the left, 48px Twemoji cells on a 48px pitch from x=56.8,
// 32px section titles with icon + chevron, a 48px preview under the list only.
// Dark values measured from Discord; light values follow Discord's light theme by eye.
const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #242429)",
  "--emoji-picker-foreground": "light-dark(#313338, #efeff1)",
  "--emoji-picker-muted": "light-dark(#5c5e66, #efeff1)",
  "--emoji-picker-subtle": "light-dark(#5c5e66, #949ba4)",
  "--emoji-picker-border": "color-mix(in oklab, #97979f 12%, transparent)",
  "--emoji-picker-input": "light-dark(color-mix(in oklab, #000 6%, transparent), color-mix(in oklab, #000 12%, transparent))",
  "--emoji-picker-input-border": "color-mix(in oklab, #97979f 20%, transparent)",
  "--emoji-picker-panel": "light-dark(#f2f3f5, #1a1a1e)",
  "--emoji-picker-hover": "color-mix(in oklab, #97979f 20%, transparent)",
  "--emoji-picker-selected": "light-dark(#e3e5e8, #202024)",
  "--emoji-picker-accent": "#5865f2",
  "--emoji-picker-ring": "#5865f2",
  "--emoji-picker-radius": "8px",
  "--emoji-picker-font": "'gg sans', 'Noto Sans', system-ui, sans-serif",
  "--emoji-picker-shadow": "0 12px 24px rgb(0 0 0 / 0.24)",
  "--discord-strong": "light-dark(#060607, #fbfbfb)",
  "--discord-placeholder": "#80848e",
  "--discord-chip": "color-mix(in oklab, #97979f 12%, transparent)",
  "--discord-tab": "color-mix(in oklab, #97979f 16%, transparent)",
  "--discord-chip-border": "color-mix(in oklab, #97979f 4%, transparent)",
  "--discord-popup": "light-dark(#ffffff, #2b2b31)",
  "--discord-popup-border": "light-dark(#e1e2e4, color-mix(in oklab, #3f3f46 60%, transparent))",
  "--discord-pill-foreground": "light-dark(#5c5e66, #b5bac1)",
  "--discord-mine": "color-mix(in oklab, #5865f2 15%, transparent)",
  "--discord-mine-foreground": "light-dark(#4752c4, #c9cdfb)",
  "--discord-autocomplete": "light-dark(#ffffff, #2b2d31)",
  "--discord-autocomplete-text": "light-dark(#313338, #dbdee1)",
  "--discord-autocomplete-muted": "light-dark(#5c5e66, #b5bac1)",
  "--discord-autocomplete-hover": "light-dark(rgb(0 0 0 / 0.06), rgb(255 255 255 / 0.06))",
};

/**
 * Discord lists `:smi` matches A–Z: codes starting with the query, then the rest.
 * Pass to `useShortcodeAutocomplete` (or `useAutocompleteInput`) with this skin.
 */
export const discordAutocompleteOptions = { order: "alphabetical", limit: 14 } satisfies Partial<ShortcodeAutocompleteOptions>;

export const discord: Skin = {
  id: "discord",
  label: "Discord",
  note: "Tabs, a category rail on the left, Twemoji in 48px cells and a shortcode preview.",
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
    cell: "rounded hover:bg-picker-hover data-[highlighted]:bg-picker-hover",
    header: "flex h-8 items-center gap-1 bg-picker-background pr-1 pl-2 text-[14px] leading-[18px] font-semibold text-picker-muted",
    headerIcon: { size: 16, chevron: true },
    top: (
      <Tabs
        items={["GIFs", "Stickers", "Emoji"]}
        active={2}
        className="flex h-[58px] shrink-0 items-start gap-2 px-4 pt-4"
        tab="flex h-[30px] items-center rounded-lg px-3 text-[14px] leading-[14px] font-semibold"
        activeTab="bg-(--discord-tab) text-(--discord-strong)"
        inactiveTab="text-picker-muted"
      />
    ),
    searchRow: "h-[53px] gap-3 px-4 pb-[13px] [--search-icon-x:27.8px]",
    input:
      "h-10 w-full rounded-lg border-[0.8px] border-picker-input-border bg-picker-input pr-3 pl-[38.8px] text-[16px] leading-5 text-picker-foreground outline-none placeholder:text-(--discord-placeholder) focus:border-picker-ring focus:outline-2 focus:outline-picker-ring",
    searchIcon: "left",
    searchIconClass: "top-3 translate-y-0 text-picker-muted",
    skinTone: "hand",
    toneButton: "size-[38px] text-[28px]",
    trailing: () => (
      <button type="button" className="flex h-[39.6px] w-[101.6px] shrink-0 items-center justify-center rounded-lg border-[0.8px] border-(--discord-chip-border) bg-(--discord-chip) text-[16px] text-(--discord-strong)">
        Add Emoji
      </button>
    ),
    nav: {
      placement: "left",
      className: "w-12 items-center rounded-bl-lg bg-picker-panel pt-2 pb-[9px]",
      listClassName: "gap-2",
      button: "flex size-8 items-center justify-center rounded text-picker-subtle hover:bg-picker-hover hover:text-(--discord-strong)",
      active: "data-active:bg-picker-selected data-active:text-(--discord-strong)",
      icons: I.ICONS.apple,
      iconSize: 24,
      strokeWidth: 2,
      trailing: (
        <span className="mt-auto flex size-8 shrink-0 items-center justify-center text-picker-subtle">
          <I.Smile size={22} strokeWidth={2} />
        </span>
      ),
    },
    // Discord's 8px scrollbar sits over its right gutter; a native one would take
    // 8px from the row and drop a column, so it's hidden here.
    scrollbar: "[scrollbar-width:none]",
    viewport: "pl-1",
    footer: "discord",
    footerInColumn: true,
    footerClass: "flex h-12 shrink-0 items-center gap-2 bg-picker-panel px-4",
  },
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-lg border border-(--discord-popup-border) bg-(--discord-popup) shadow-[0_4px_8px_rgb(0_0_0/0.16)]",
    reactions: "flex items-center gap-0.5 p-1 [--emoji-image-size:22px] [&_button]:flex [&_button]:size-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded [&_button]:text-[22px] [&_button:hover]:bg-picker-hover",
  },
  // Discord's ":smi" popup (dark): as wide as the composer, a 32px "Emoji matching :smi"
  // row in 12px muted text, then 28.5px rows (20px Twemoji at x=16, 14px `:code:`),
  // about 14 visible before a thin scrollbar. Ordered A–Z: `discordAutocompleteOptions`.
  autocomplete: {
    className: cn(
      "rounded-lg border border-(--discord-popup-border) bg-(--discord-autocomplete) font-picker text-(--discord-autocomplete-text) shadow-[0_8px_16px_rgb(0_0_0/0.24)]",
      // The header row and the list are the popup's own elements.
      "[&>div:first-child]:flex [&>div:first-child]:h-8 [&>div:first-child]:items-center [&>div:first-child]:border-0 [&>div:first-child]:px-2 [&>div:first-child]:py-0 [&>div:first-child]:text-[12px] [&>div:first-child]:text-(--discord-autocomplete-muted)",
      "[&>ul]:max-h-[407px] [&>ul]:px-2 [&>ul]:pt-0 [&>ul]:pb-2 [&>ul]:[scrollbar-width:thin]",
    ),
    item: "h-[28.5px] gap-2 rounded px-2 py-0 text-[14px] leading-[18px] data-[highlighted]:bg-(--discord-autocomplete-hover) [&_[data-emoji]]:size-5 [&_[data-emoji]]:text-[20px]",
    match: "",
    header: (q) => (
      <span className="font-medium">
        Emoji matching :{q}
      </span>
    ),
  },
  pill: {
    base: "h-[26px] rounded-lg border border-transparent bg-(--discord-chip) px-1.5 text-[14px] font-semibold text-(--discord-pill-foreground)",
    mine: "aria-pressed:border-picker-accent aria-pressed:bg-(--discord-mine) aria-pressed:text-(--discord-mine-foreground)",
    add: "h-[26px] rounded-lg bg-(--discord-chip) px-1.5 text-(--discord-pill-foreground)",
  },
};
