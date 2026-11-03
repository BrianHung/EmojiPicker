import * as I from "@/styles/icons";
import { Shuffle, Tabs, type Style, type Tokens } from "@/styles/style-picker";

// From a Notion page-icon picker screenshot at 2x.
// Notion's own palette: warm ink #37352f at fixed alphas, and white alphas in dark mode.
const tokens: Tokens = {
  "--emoji-picker-background": "light-dark(#ffffff, #252525)",
  "--emoji-picker-foreground": "light-dark(#37352f, #ffffffcf)",
  "--emoji-picker-muted": "light-dark(color-mix(in oklab, #37352f 65%, transparent), color-mix(in oklab, #fff 45%, transparent))",
  "--emoji-picker-subtle": "light-dark(color-mix(in oklab, #37352f 45%, transparent), color-mix(in oklab, #fff 40%, transparent))",
  "--emoji-picker-border": "light-dark(color-mix(in oklab, #37352f 9%, transparent), color-mix(in oklab, #fff 9.4%, transparent))",
  "--emoji-picker-input": "light-dark(#f2f1ee, color-mix(in oklab, #fff 5.5%, transparent))",
  "--emoji-picker-hover": "light-dark(color-mix(in oklab, #37352f 8%, transparent), color-mix(in oklab, #fff 5.5%, transparent))",
  "--emoji-picker-selected": "light-dark(color-mix(in oklab, #37352f 8%, transparent), color-mix(in oklab, #fff 5.5%, transparent))",
  "--emoji-picker-accent": "#2383e2",
  "--emoji-picker-ring": "#2383e2",
  "--emoji-picker-radius": "10px",
  "--emoji-picker-shadow": "0 0 0 1px rgb(15 15 15 / 0.05), 0 3px 6px rgb(15 15 15 / 0.1), 0 9px 24px rgb(15 15 15 / 0.2)",
  "--notion-control": "light-dark(color-mix(in oklab, #37352f 65%, transparent), color-mix(in oklab, #fff 60%, transparent))",
  "--notion-placeholder": "light-dark(color-mix(in oklab, #37352f 45%, transparent), color-mix(in oklab, #fff 30%, transparent))",
  "--notion-edge": "light-dark(rgb(15 15 15 / 0.1), rgb(255 255 255 / 0.094))",
  "--notion-pill-border": "light-dark(color-mix(in oklab, #37352f 16%, transparent), color-mix(in oklab, #fff 15%, transparent))",
};

export const notion: Style = {
  id: "notion",
  label: "Notion",
  size: { width: 408, height: 390 },
  layout: {
    id: "notion",
    tokens,
    root: "h-[390px] w-[408px] rounded-picker bg-picker-background text-picker-foreground shadow-picker [--emoji-size:24px] [--emoji-cell-size:32px] [--emoji-image-size:24px] [--emoji-header-height:28px] [--emoji-list-padding:6px]",
    columns: 12,
    placeholder: "Filter…",
    cell: "rounded-[5px] hover:bg-picker-hover data-[highlighted]:bg-picker-selected",
    header: "bg-picker-background px-1 pt-1.5 pb-0.5 text-[12px] font-medium text-picker-muted",
    top: (
      <Tabs
        items={["Emoji", "Icons", "Upload"]}
        active={0}
        className="flex h-[40px] shrink-0 items-end gap-3 border-b border-picker-border px-4"
        // Every tab carries the 2px underline slot, so the active one doesn't sit 2px higher (items-end).
        tab="border-b-2 border-transparent pb-2 text-[14px] font-medium"
        activeTab="border-picker-foreground text-picker-foreground"
        inactiveTab="text-picker-muted"
        right={<span className="ml-auto pb-2 text-[14px] text-picker-muted">Remove</span>}
      />
    ),
    searchRow: "gap-2 px-2 py-2 [--search-icon-x:18px]",
    input:
      "h-8 w-full rounded-md bg-picker-input pr-2 pl-[30px] text-[14px] outline-none shadow-[inset_0_0_0_1px_var(--notion-edge)] placeholder:text-(--notion-placeholder) focus:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--emoji-picker-ring)_57%,transparent),0_0_0_2px_color-mix(in_oklab,var(--emoji-picker-ring)_35%,transparent)]",
    searchIcon: "left",
    searchIconClass: "text-picker-subtle",
    trailing: (pick) => (
      <Shuffle onPick={pick} className="flex size-8 shrink-0 items-center justify-center rounded-md text-(--notion-control) shadow-[inset_0_0_0_1px_var(--notion-edge)] hover:bg-picker-hover" />
    ),
    skinTone: "hand",
    toneButton: "size-8 rounded-md text-[20px] hover:bg-picker-hover",
    nav: {
      placement: "bottom",
      className: "h-[50px] border-t border-picker-border px-2",
      button: "flex size-8 items-center justify-center rounded-md text-picker-subtle hover:bg-picker-hover",
      active: "data-active:bg-picker-selected data-active:text-picker-foreground/80",
      icons: I.ICONS.notion,
      iconSize: 20,
      strokeWidth: 1.5,
      trailing: (
        <span className="flex size-8 items-center justify-center text-picker-subtle">
          <I.PlusCircleFilled size={20} />
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
