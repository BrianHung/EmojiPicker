import { EmojiPicker } from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import * as I from "@/styles/icons";
import { HandTone, SearchClear, useActiveTabInView, withIcons } from "@/styles/parts";
import { CELL, ROOT, type Style, type StylePickerProps, type Tokens } from "@/styles/style";

/** Slack's first section, pinned rather than learned. */
const GETTING_WORK_DONE = [
  "2705", "1f440", "1f64c", "1f64f", "2795", "1f44f", "1f4a1", "1f3af", "1f44b",
  "1f44d", "1f389", "31-fe0f-20e3", "32-fe0f-20e3", "33-fe0f-20e3", "1f4e3", "26aa", "1f535", "1f534",
];

const CATEGORIES = withIcons(I.ICONS.slack, {
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
  size: 22,
  strokeWidth: 1.7,
  hide: ["suggested", "custom"],
});

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

const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #1a1d21)",
  "--emoji-picker-foreground": "light-dark(#1d1c1d, #d1d2d3)",
  "--emoji-picker-muted": "light-dark(#454447, #ababad)",
  "--emoji-picker-subtle": "light-dark(#868686, #818385)",
  "--slack-button-border": "light-dark(color-mix(in oklab, #5e5d60 45%, transparent), #565856)",
  "--slack-placeholder": "light-dark(#5e5d60, #9a9b9e)",
  "--emoji-picker-border": "light-dark(rgb(94 93 96 / 0.13), rgb(121 124 129 / 0.3))",
  "--emoji-picker-input-border": "light-dark(#7c7a7f, #797c81)",
  "--emoji-picker-panel": "light-dark(#f8f8f8, #222529)",
  "--emoji-picker-hover": "light-dark(#f8f8f8, #222529)",
  "--emoji-picker-selected": "light-dark(#e8f5fa, color-mix(in oklab, #1d9bd1 20%, transparent))",
  "--emoji-picker-accent": "light-dark(#83388a, #e3ceeb)",
  "--emoji-picker-ring": "#1264a3",
  "--emoji-picker-radius": "6px",
  "--emoji-picker-font": "Lato, 'Slack-Lato', system-ui, sans-serif",
  "--emoji-picker-shadow": "0 0 0 1px light-dark(rgb(29 28 29 / 0.13), rgb(232 232 232 / 0.13)), 0 4px 12px rgb(0 0 0 / 0.08)",
  "--slack-divider": "color-mix(in oklab, #000 15%, transparent)",
  "--slack-thumb": "light-dark(#c1c1c1, #6b6b6b)",
  "--slack-track": "light-dark(#fafafa, #2c2c2c)",
  "--slack-track-rule": "light-dark(#e8e8e8, #3a3a3a)",
  "--slack-icon": "light-dark(#616061, #ababad)",
  "--slack-link": "light-dark(#1264a3, #1d9bd1)",
  "--slack-wash": "light-dark(rgb(29 28 29 / 0.06), rgb(248 248 248 / 0.06))",
  "--slack-mine": "light-dark(#e3f8ff, #0a77a7)",
  "--slack-mine-foreground": "light-dark(#1264a3, #f8f8f8)",
  "--slack-mine-ring": "light-dark(#1264a3, transparent)",
  "--slack-pill-hover-border": "#bdbdbd",
};

const TAB = "flex h-[38px] w-[34.3px] shrink-0 items-start justify-center rounded-t-[9.6px] pt-[3px] pl-[4.8px] text-picker-subtle hover:text-picker-foreground";

export function SlackPicker({ onSelect, search = true, autoFocus = false, fluid = false, searchResults, className }: StylePickerProps) {
  const nav = useActiveTabInView();
  return (
    <EmojiPicker.Root
      columns={fluid ? undefined : 9}
      categories={CATEGORIES}
      suggested={GETTING_WORK_DONE}
      searchResults={searchResults}
      onSelect={onSelect}
      data-style="slack"
      style={tokens}
      className={cn(
        ROOT,
        "group h-[454px] w-[361px] rounded-picker bg-picker-background font-picker text-picker-foreground shadow-picker [--emoji-cell-size:33px] [--emoji-header-height:28px] [--emoji-image-size:22px] [--emoji-list-padding:9px] [--emoji-size:22px]",
        className,
      )}
    >
      <div className="mt-1 flex h-[38px] shrink-0 items-center pr-[10px] pl-2 shadow-[inset_0_-1px_0_var(--emoji-picker-border)]">
        <span className="flex h-[38px] w-[34.3px] shrink-0 items-start rounded-t-[9.6px] pt-[3px] pl-[4.8px] text-picker-subtle group-has-[input:focus]:text-picker-foreground group-has-[input:focus]:shadow-[inset_0_-2px_0_var(--emoji-picker-accent)]">
          <I.Search size={22} strokeWidth={2} />
        </span>
        <EmojiPicker.CategoryNav ref={nav} className="flex min-w-0 flex-1 items-center justify-between gap-0 overflow-x-auto [scrollbar-width:none]">
          {() => (
            <EmojiPicker.CategoryNav.Tab
              className={cn(TAB, "relative data-active:text-picker-foreground data-active:shadow-[inset_0_-2px_0_var(--emoji-picker-accent)] data-active:group-has-[input:focus]:text-picker-subtle data-active:group-has-[input:focus]:shadow-none")}
            />
          )}
        </EmojiPicker.CategoryNav>
        <span className="flex h-[38px] w-[34.3px] shrink-0 items-start pt-1 pl-[5.8px] text-picker-subtle">
          <CustomTabIcon />
        </span>
      </div>
      {search ? (
        <EmojiPicker.Search className="relative flex shrink-0 items-center px-[17.5px] pt-3.5 pb-[7px]">
          <EmojiPicker.Search.Input
            placeholder="Search all emoji"
            autoFocus={autoFocus}
            className="h-9 w-full rounded-[8px] border border-picker-input-border bg-picker-background px-3 py-1 text-[15px] outline-none placeholder:text-(--slack-placeholder) focus:border-transparent focus:shadow-[0_0_0_1px_var(--emoji-picker-ring),0_0_0_5px_color-mix(in_oklab,var(--emoji-picker-ring)_30%,transparent)]"
          >
            <SearchClear />
          </EmojiPicker.Search.Input>
        </EmojiPicker.Search>
      ) : null}
      <EmojiPicker.Viewport
        className={cn(
          "relative ml-[7px] min-h-0 flex-1 [&::-webkit-scrollbar]:w-[15px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-(--slack-thumb) [&::-webkit-scrollbar-thumb]:bg-clip-padding [&::-webkit-scrollbar-thumb]:[border-width:2px_3px_2px_4px] [&::-webkit-scrollbar-track]:bg-(--slack-track) [&::-webkit-scrollbar-track]:shadow-[inset_1px_0_var(--slack-track-rule)]",
          !search && "pt-[var(--emoji-list-padding,8px)]",
        )}
      >
        <EmojiPicker.List className="outline-none">
          {() => (
            <EmojiPicker.List.Section>
              <EmojiPicker.List.SectionTitle className="block h-7 bg-picker-background/95 pt-px pr-3.5 pl-3.5 text-[13px] leading-6 font-bold text-picker-foreground" />
              <EmojiPicker.List.Items>
                {() => (
                  // The 35×32 hover box sits 1px left of the 33px cell and stops 1px above the next row.
                  <EmojiPicker.List.Cell className={cn(CELL, "isolate before:absolute before:inset-[0_1px_1px_-1px] before:-z-10 before:rounded-[6px] hover:before:bg-picker-hover data-focus-visible:before:bg-picker-selected data-[highlighted]:before:bg-picker-selected")} />
                )}
              </EmojiPicker.List.Items>
            </EmojiPicker.List.Section>
          )}
        </EmojiPicker.List>
        <EmojiPicker.Empty className="py-10 text-center text-sm opacity-60">No emoji found</EmojiPicker.Empty>
      </EmojiPicker.Viewport>
      <div className="flex h-[60px] shrink-0 items-center border-t border-(--slack-divider) bg-picker-panel pt-0.5 pr-[26px] pl-3.5">
        <button type="button" className="h-7 rounded border border-(--slack-button-border,var(--emoji-picker-input-border)) bg-picker-background px-3 pt-[0.5px] text-[13px] font-bold hover:bg-picker-hover">
          Add Emoji
        </button>
        <div className="ml-auto flex items-center gap-[3px] text-[14.4px] font-bold text-picker-muted">
          <HandTone className="flex h-[26px] w-[22px] items-center justify-center text-[22px] leading-none" />
          Skin Tone
        </div>
      </div>
    </EmojiPicker.Root>
  );
}

export const slack: Style = {
  id: "slack",
  label: "Slack",
  tokens,
  Picker: SlackPicker,
  size: { width: 361, height: 454 },
  tapback: {
    className: "flex w-fit flex-col overflow-hidden rounded-[12px] bg-picker-background shadow-[0_0_0_1px_light-dark(rgb(29_28_29/0.13),rgb(232_232_232/0.13)),0_1px_3px_rgb(0_0_0/0.08)]",
    reactions: "flex items-center p-1 [--emoji-image-size:16px] [&_button]:flex [&_button]:size-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[8px] [&_button]:text-[16px] [&_button:hover]:bg-picker-hover",
    more: { className: "text-(--slack-icon)", icon: <I.SmilePlus size={18} strokeWidth={1.75} /> },
  },
  autocomplete: {
    className: "w-[473.5px] max-w-full rounded-picker bg-picker-panel font-picker shadow-picker",
    list: "max-h-[220px] pt-2",
    item: "h-8 gap-3 rounded-none px-4 py-0 text-[15px] leading-[22.4px] text-picker-foreground data-[highlighted]:bg-(--slack-wash)",
    match: "",
    hint: <span className="text-[13px] text-picker-foreground">Enter</span>,
  },
  pill: {
    base: "h-6 rounded-full bg-(--slack-wash) px-2 text-[12px] leading-3 text-picker-foreground not-aria-pressed:hover:shadow-[0_0_0_1px_var(--slack-pill-hover-border)]",
    mine: "aria-pressed:bg-(--slack-mine) aria-pressed:text-(--slack-mine-foreground) aria-pressed:shadow-[0_0_0_1px_var(--slack-mine-ring)]",
    count: "font-bold",
    add: "h-6 rounded-full bg-(--slack-wash) px-2 text-picker-foreground",
    addIcon: <I.SmilePlus size={18} strokeWidth={1.75} />,
  },
};
