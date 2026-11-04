import type { ShortcodeAutocompleteOptions } from "@brianhung/emoji-picker";
import * as I from "@/styles/icons";
import { Tabs, type Style, type Tokens } from "@/styles/style-picker";

// Measured from Discord's web client (composer emoji button, dark theme), Nov 2026:
// 498×486 popover, 30px tabs at 16.8, a 414.4px search + 38px skin tone (no "Add
// Emoji" any more), a 48px rail down the left with a 4px white pill on the active
// tab, 48px Twemoji cells on a 48px pitch from x=56.8 beside an 8px scrollbar,
// 32px section titles (icon at 56.8, text at 76.8, chevron), a 48px preview.
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
  "--discord-placeholder": "light-dark(#80848e, #8f9097)",
  "--discord-chip": "color-mix(in oklab, #97979f 12%, transparent)",
  "--discord-tab": "color-mix(in oklab, #97979f 16%, transparent)",
  "--discord-chip-border": "color-mix(in oklab, #97979f 4%, transparent)",
  "--discord-popup": "light-dark(#ffffff, #2b2b31)",
  "--discord-popup-border": "light-dark(#e1e2e4, color-mix(in oklab, #3f3f46 60%, transparent))",
  "--discord-pill-foreground": "light-dark(#5c5e66, #b5bac1)",
  "--discord-mine": "color-mix(in oklab, #5865f2 24%, transparent)",
  "--discord-mine-foreground": "light-dark(#4752c4, oklab(0.840364 0.0038172 -0.0788282))",
  "--discord-thumb": "light-dark(#c4c9ce, #5f606a)",
  "--discord-icon": "light-dark(#5c5e66, #abacb2)",
  "--discord-autocomplete": "light-dark(#ffffff, oklab(0.2624 0.0025 -0.0089))",
  "--discord-autocomplete-text": "light-dark(#313338, oklab(0.988 0 0))",
  "--discord-autocomplete-muted": "light-dark(#5c5e66, oklab(0.7454 0.0013 -0.0085))",
  "--discord-autocomplete-hover": "light-dark(rgb(0 0 0 / 0.06), oklab(0.6789 0.0033 -0.0112 / 0.12))",
  "--discord-autocomplete-shadow": "0 0 0 1px light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.08)), 0 12px 24px rgb(0 0 0 / 0.24)",
};

/**
 * Discord lists `:smi` matches A–Z: codes starting with the query, then the rest.
 * Pass to an emoji typeahead (`useTextFieldEmojiTypeahead`, `useTiptapEmojiTypeahead`…) with this style.
 */
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
      // The active tab's pill: 8×24 at the rail's edge, half of it clipped.
      active: "data-active:bg-picker-selected data-active:text-(--discord-strong) data-active:before:absolute data-active:before:top-1 data-active:before:-left-3 data-active:before:h-6 data-active:before:w-2 data-active:before:rounded-r-full data-active:before:bg-(--discord-strong)",
      icons: I.ICONS.apple,
      iconSize: 24,
      strokeWidth: 2,
      trailing: (
        <span className="mt-auto flex size-8 shrink-0 items-center justify-center text-picker-subtle">
          {/* Discord's filled face: a disc with the features cut out in the rail's color. */}
          <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
            <circle cx="12" cy="12" r="11" fill="currentColor" />
            <circle cx="8.5" cy="10" r="1.5" fill="var(--emoji-picker-panel)" />
            <circle cx="15.5" cy="10" r="1.5" fill="var(--emoji-picker-panel)" />
            <path d="M7 14.2a5.5 5.5 0 0 0 10 0" fill="none" stroke="var(--emoji-picker-panel)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      ),
    },
    // Discord's 8px scrollbar: a 4px #5f606a thumb in a transparent track. The cells
    // right margin goes so nine 48px columns still fit beside it.
    scrollbar:
      "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:min-h-10 [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-(--discord-thumb) [&::-webkit-scrollbar-thumb]:bg-clip-padding [--emoji-list-padding-end:0px]",
    fixedColumns: true,
    viewport: "pl-1",
    footer: "discord",
    footerInColumn: true,
    footerClass: "flex h-12 shrink-0 items-center gap-2 bg-picker-panel px-4",
  },
  // The message hover bar: 33.6px tall, radius 8, 28px buttons (radius 6) with 20px emoji.
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-[8px] border-[0.8px] border-(--discord-chip-border) bg-picker-background shadow-[0_1px_4px_rgb(0_0_0/0.14)]",
    reactions: "flex items-center p-0.5 [--emoji-image-size:20px] [&_button]:flex [&_button]:size-7 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[6px] [&_button]:text-[20px] [&_button:hover]:bg-picker-hover",
    more: { className: "text-(--discord-icon)", icon: <I.SmilePlus size={20} strokeWidth={2} /> },
  },
  // Discord's ":smi" popup (dark, re-measured Nov 2026): 12px narrower than the composer
  // on each side, radius 5, a 1px 8% white ring over a 0 12 24 shadow; an "Emoji matching
  // :smi" title (14px/18.67px, 500) 8px in and 8px down, rows from 42.7px: 31.2px tall,
  // padding 0 8px in an 8px inset, 20px Twemoji 8px before the 16px `:code:`, the
  // selected one on a 12% wash at radius 3. Ordered A–Z: `discordAutocompleteOptions`.
  autocomplete: {
    className: "mx-3 rounded-[5px] bg-(--discord-autocomplete) font-picker text-(--discord-autocomplete-text) shadow-(--discord-autocomplete-shadow)",
    headerClassName: "px-2 pt-2 pb-4 text-[14px] leading-[18.67px] font-medium text-(--discord-autocomplete-muted)",
    list: "max-h-[437px] px-2 pb-2 [scrollbar-width:thin]",
    item: "h-[31.2px] gap-2 rounded-[3px] px-2 py-0 text-[16px] leading-5 font-normal data-[highlighted]:bg-(--discord-autocomplete-hover)",
    match: "",
    emoji: 20,
    header: (q) => `Emoji matching :${q}`,
  },
  // 29.6px pills, radius 8, a 0.8px border, 20px Twemoji 6px before a 16px/600 count.
  pill: {
    base: "h-[29.6px] gap-1.5 rounded-[8px] border-[0.8px] border-transparent bg-(--discord-chip) px-1.5 text-[16px] leading-4 font-semibold text-(--discord-pill-foreground)",
    mine: "aria-pressed:border-picker-accent aria-pressed:bg-(--discord-mine) aria-pressed:text-(--discord-mine-foreground)",
    add: "h-[29.6px] rounded-[8px] bg-(--discord-chip) px-1.5 text-(--discord-pill-foreground)",
    emoji: 20,
  },
};
