import * as React from "react";
import {
  Emoji,
  EmojiPicker,
  useEmojiStore,
  useFrequentEmoji,
  type CategoryHeaderProps,
  type HeaderActionsProps,
  type CategoryOption,
  type EmojiSelection,
  type PickerComponents,
} from "@brianhung/emoji-picker";
import { cn } from "@/lib/utils";
import * as I from "./icons";

type SkinToneButtonProps = React.ComponentProps<NonNullable<PickerComponents["SkinToneButton"]>>;

/** CSS variables for one style, values in light-dark() so one definition covers both themes. */
export type Tokens = Record<`--${string}`, string>;

/**
 * Applies a style's tokens to every element marked `data-style="<id>"` (pickers,
 * portaled popovers, tapbacks). Zero specificity: any class or CSS on the
 * element still overrides a token.
 */
export function useStyleTokens(id: string | undefined, tokens: Tokens | undefined) {
  React.useInsertionEffect(() => {
    if (!id || !tokens) return;
    const css = `:where([data-style="${id}"]){${Object.entries(tokens).map(([k, v]) => `${k}:${v}`).join(";")}}`;
    let style = document.head.querySelector<HTMLStyleElement>(`style[data-style-tokens="${id}"]`);
    if (!style) {
      style = document.createElement("style");
      style.dataset.styleTokens = id;
      document.head.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }, [id, tokens]);
}

export type PickerLayout = {
  /** Style id for `data-style` and its tokens. */
  id?: string;
  tokens?: Tokens;
  /** Root box: size, background, border, radius, shadow, font, and engine size tokens. */
  root: string;
  columns: number;
  placeholder: string;
  /** Sections in order, with names (Slack: "Getting Work Done" first). */
  categories?: CategoryOption[];
  /** Pinned emoji for the suggested section instead of frequents. */
  suggested?: string[];
  /** How many frequents the suggested section shows (Linear: two rows of 9). */
  frequent?: number;
  /** Scrollbar classes for the viewport. Default thin. */
  scrollbar?: string;
  /** Keep `columns` per row even when the list is a little narrower (cells run under the scrollbar). */
  fixedColumns?: boolean;
  cell: string;
  header: string;
  /** macOS shows no section titles. */
  hideHeaders?: boolean;
  /** Discord: the section's nav icon before its title, and a chevron after. */
  headerIcon?: { size: number; className?: string; chevron?: boolean };
  /** Rows above search (Notion / Discord tabs). */
  top?: React.ReactNode;
  searchRow: string;
  input: string;
  searchIcon?: "left" | "right";
  searchIconClass?: string;
  /** Controls after the input (Notion shuffle, macOS add, Discord "Add Emoji"). */
  trailing?: (pick: (s: EmojiSelection) => void) => React.ReactNode;
  skinTone?: "hand" | "dot";
  /** The emoji the "hand" control shows in each tone. Default ✋ (Discord: 👏). */
  toneEmoji?: string;
  /** Where the skin-tone control sits. Default "search". */
  skinTonePlacement?: "search" | "footer";
  toneButton?: string;
  nav?: {
    placement: "top" | "bottom" | "left";
    className: string;
    button: string;
    /** Active-tab classes, written as `data-active:` variants. */
    active: string;
    icons: I.IconSet;
    iconSize?: number;
    strokeWidth?: number;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    /** Sections that stay in the list but get no nav button. */
    hide?: string[];
    /** Classes for the category bar itself (gap, padding); replaces the default gap. */
    listClassName?: string;
  };
  viewport?: string;
  footer?: "discord" | "slack";
  footerClass?: string;
  /** With a left rail, the footer sits under the list only (Discord). */
  footerInColumn?: boolean;
};

const DEFAULT_ORDER = ["suggested", "custom", "smileys_people", "animals_nature", "food_drink", "travel_places", "activities", "objects", "symbols", "flags"];

/** Sections with the layout's nav icons, and `nav: false` for the ones kept out of the bar. */
function categoriesFor(layout: PickerLayout): CategoryOption[] | undefined {
  const nav = layout.nav;
  if (!nav) return layout.categories;
  return (layout.categories ?? DEFAULT_ORDER.map((id): CategoryOption => ({ id }))).map((c) => {
    const Icon = nav.icons[c.id];
    return { ...c, icon: Icon ? <Icon size={nav.iconSize ?? 20} strokeWidth={nav.strokeWidth ?? 1.75} /> : c.icon, ...(nav.hide?.includes(c.id) ? { nav: false } : {}) };
  });
}

/** Only headers that aren't plain text need a component: hidden (macOS) or icon + chevron (Discord). */
function headerComponent(layout: PickerLayout): PickerComponents | undefined {
  if (!layout.hideHeaders && !layout.headerIcon) return undefined;
  function Header({ category, children, className, ...props }: CategoryHeaderProps) {
    // macOS: no visible titles; the clipped text still names the section's group.
    if (layout.hideHeaders) return <header {...props} className={cn("pointer-events-none h-0 overflow-hidden", className)}>{children}</header>;
    const hi = layout.headerIcon!;
    const Icon = layout.nav?.icons[category.id];
    const icon = Icon ? <Icon size={hi.size} strokeWidth={2} className={hi.className} /> : null;
    if (!hi.chevron) {
      return (
        <header {...props} className={className}>
          {icon}
          {children}
        </header>
      );
    }
    // Discord: the chevron turns -90° when collapsed. The title is text; the row's toggle is HeaderActions.
    return (
      <header {...props} className={className}>
        <div className="flex h-full min-w-0 flex-1 items-center gap-1">
          {icon}
          <span className="truncate">{children}</span>
          <I.ChevronDown size={hi.size} strokeWidth={2} aria-hidden className={cn("shrink-0 transition-transform duration-150", category.collapsed && "-rotate-90", hi.className)} />
        </div>
      </header>
    );
  }
  // The whole row toggles its section: a control over the title, outside the listbox.
  function Toggle({ section, toggle, toggleProps }: HeaderActionsProps) {
    return <button type="button" {...toggleProps} aria-label={section.name} onClick={toggle} className="absolute inset-0 cursor-pointer outline-none" />;
  }
  return layout.headerIcon?.chevron ? { CategoryHeader: Header, HeaderActions: Toggle } : { CategoryHeader: Header };
}

const DOT_COLORS: Record<string, string> = { neutral: "#ffc93a", "1f3fb": "#fadcbc", "1f3fc": "#e0bb95", "1f3fd": "#bf8f68", "1f3fe": "#9b643d", "1f3ff": "#594539" };

/** emoji-mart / iOS style: a ringed color dot. */
function DotTone({ tone, className, children: _children, ...props }: SkinToneButtonProps) {
  return (
    <button {...props} className={cn("flex size-7 items-center justify-center rounded-full", className)}>
      <span className="size-[18px] rounded-full ring-1 ring-black/10 ring-offset-2 ring-offset-transparent" style={{ background: DOT_COLORS[tone.skinTone] }} />
    </button>
  );
}

/** The layout's skin-tone control: Slack/Discord's ✋ in each tone, or a dot. */
function Tone({ layout }: { layout: PickerLayout }) {
  if (layout.skinTone === "dot") return <EmojiPicker.SkinTone button={DotTone} />;
  return <EmojiPicker.SkinTone emoji={layout.toneEmoji ?? "270b"} buttonClassName={cn("flex items-center justify-center", layout.toneButton, "leading-none")} />;
}

/** Footer previews: Discord ":code: :alias:" and Slack's "Add Emoji" + skin tone. */
function Footer({ kind, layout, className }: { kind: NonNullable<PickerLayout["footer"]>; layout: PickerLayout; className?: string }) {
  const active = EmojiPicker.useActiveEmoji();
  const store = useEmojiStore();
  const first = useFrequentEmoji(1)[0];
  // A preview, not a pick: read the record (select() would count a use).
  const fallback = first ? store.get(first) : undefined;
  if (kind === "discord") {
    const shown = active ?? fallback;
    return (
      <div className={className}>
        <span className="flex size-7 items-center justify-center">{shown ? <Emoji emoji={shown.unified} size={28} /> : null}</span>
        <span className="truncate text-base leading-5 font-semibold">{shown ? shown.shortcodes.map((c) => `:${c}:`).join(" ") || shown.name : ""}</span>
      </div>
    );
  }
  // Slack: "Add Emoji" on the left, the skin-tone control on the right.
  return (
    <div className={className}>
      <button type="button" className="h-7 rounded border border-(--slack-button-border,var(--emoji-picker-input-border)) bg-picker-background px-3 pt-[0.5px] text-[13px] font-bold hover:bg-picker-hover">
        Add Emoji
      </button>
      <div className="ml-auto flex items-center gap-[3px] text-[14.4px] font-bold text-picker-muted">
        <Tone layout={layout} />
        Skin Tone
      </div>
    </div>
  );
}

export type StylePickerProps = {
  layout: PickerLayout;
  onSelect?: (selection: EmojiSelection) => void;
  /** Include the search row. Default true. */
  search?: boolean;
  /** Focus search on mount, as the real popovers do on open. */
  autoFocus?: boolean;
  /** "ranked" (default) or "grouped" search results. */
  searchResults?: "ranked" | "grouped";
  /** Fit as many columns as the width allows instead of the layout's count (a full-width sheet). */
  fluid?: boolean;
  className?: string;
};

/**
 * Keeps the active tab of a scrolling category bar in view. It sets the bar's own
 * scroll offset (scrollIntoView would also scroll the page).
 */
function useActiveTabInView(vertical: boolean) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const reveal = () => {
      const tab = bar.querySelector<HTMLElement>("[data-active]");
      if (!tab) return;
      const b = bar.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      // Rects are in screen px; a scaled picker (FitBox) scrolls in its own px.
      if (vertical) {
        const k = bar.offsetHeight / b.height || 1;
        if (t.top < b.top) bar.scrollTop -= (b.top - t.top) * k;
        else if (t.bottom > b.bottom) bar.scrollTop += (t.bottom - b.bottom) * k;
      } else {
        const k = bar.offsetWidth / b.width || 1;
        if (t.left < b.left) bar.scrollLeft -= (b.left - t.left) * k;
        else if (t.right > b.right) bar.scrollLeft += (t.right - b.right) * k;
      }
    };
    reveal();
    const observer = new MutationObserver(reveal);
    observer.observe(bar, { subtree: true, attributes: true, attributeFilter: ["data-active"] });
    return () => observer.disconnect();
  }, [vertical]);
  return ref;
}

export function StylePicker({ layout, onSelect, search = true, autoFocus = false, searchResults, fluid = false, className }: StylePickerProps) {
  useStyleTokens(layout.id, layout.tokens);
  const navRef = useActiveTabInView(layout.nav?.placement === "left");
  const categories = React.useMemo(() => categoriesFor(layout), [layout]);
  const headers = React.useMemo(() => headerComponent(layout), [layout]);
  const pick = (s: EmojiSelection) => onSelect?.(s);
  const nav = layout.nav ? (
    <div className={cn("flex shrink-0", layout.nav.placement === "left" ? "flex-col" : "items-center", layout.nav.className)}>
      {layout.nav.leading}
      <EmojiPicker.CategoryNav
        ref={navRef}
        orientation={layout.nav.placement === "left" ? "vertical" : "horizontal"}
        // `nav.active` is written with data-active: variants, so it applies only to the current tab.
        tabClassName={cn("shrink-0", layout.nav.button, layout.nav.active)}
        className={cn(
          "flex",
          // Tabs that don't fit scroll (the bar's scrollbar hidden, as the apps hide theirs).
          layout.nav.placement === "left" ? "min-h-0 w-full flex-1 flex-col items-center overflow-y-auto [scrollbar-width:none]" : "min-w-0 flex-1 items-center justify-between overflow-x-auto [scrollbar-width:none]",
          layout.nav.listClassName ?? (layout.nav.placement === "left" ? "gap-1" : "gap-0"),
        )}
      />
      {layout.nav.trailing}
    </div>
  ) : null;
  const footer = layout.footer ? <Footer kind={layout.footer} layout={layout} className={layout.footerClass} /> : null;
  const viewport = (
    <EmojiPicker.Viewport className={cn("relative min-h-0 flex-1", layout.scrollbar ?? "[scrollbar-width:thin]", !search && "pt-[var(--emoji-list-padding,8px)]", layout.viewport)}>
      <EmojiPicker.List components={headers} cellClassName={cn("flex items-center justify-center leading-none outline-none", layout.cell)} headerClassName={layout.header} />
      <EmojiPicker.Empty className="py-10 text-center text-sm opacity-60">No emoji found</EmojiPicker.Empty>
    </EmojiPicker.Viewport>
  );
  return (
    <EmojiPicker.Root
      columns={fluid ? undefined : layout.columns}
      fitColumns={!layout.fixedColumns}
      categories={categories}
      suggested={layout.suggested}
      frequent={layout.frequent}
      searchResults={searchResults}
      autoFocusSearch={search && autoFocus}
      searchPlaceholder={layout.placeholder}
      onSelect={pick}
      data-style={layout.id}
      className={cn("flex flex-col overflow-hidden", layout.root, className)}
    >
      {layout.top}
      {layout.nav?.placement === "top" ? nav : null}
      {search ? (
        <EmojiPicker.Search className={cn("relative flex shrink-0 items-center", layout.searchRow)} inputProps={{ className: layout.input }}>
          {layout.searchIcon ? (
            <I.Search
              size={16}
              strokeWidth={2}
              className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2", layout.searchIcon === "left" ? "left-[var(--search-icon-x,12px)]" : "right-[var(--search-icon-x,12px)]", layout.searchIconClass)}
            />
          ) : null}
          {layout.skinTone && layout.skinTonePlacement !== "footer" ? <Tone layout={layout} /> : null}
          {layout.trailing?.(pick)}
        </EmojiPicker.Search>
      ) : null}
      {layout.nav?.placement === "left" ? (
        <div className="flex min-h-0 flex-1">
          {nav}
          {layout.footerInColumn ? (
            <div className="flex min-w-0 flex-1 flex-col">
              {viewport}
              {footer}
            </div>
          ) : (
            viewport
          )}
        </div>
      ) : (
        viewport
      )}
      {layout.nav?.placement === "bottom" ? nav : null}
      {layout.footerInColumn && layout.nav?.placement === "left" ? null : footer}
    </EmojiPicker.Root>
  );
}

/** Notion's shuffle: picks a random emoji. */
export function Shuffle({ onPick, className }: { onPick: (s: EmojiSelection) => void; className?: string }) {
  const store = useEmojiStore();
  return (
    <button
      type="button"
      title="Random"
      className={className}
      onClick={() => {
        const all = store.records().filter((r) => !r.imageUrl);
        const r = all[Math.floor(Math.random() * all.length)];
        const s = r && store.select(store.withSkinTone(r.unified));
        if (s) onPick(s);
      }}
    >
      <I.Shuffle size={16} strokeWidth={2} />
    </button>
  );
}

export function Tabs({ items, active, className, tab, activeTab, inactiveTab, right }: { items: React.ReactNode[]; active: number; className: string; tab: string; activeTab: string; inactiveTab?: string; right?: React.ReactNode }) {
  return (
    <div className={className} role="tablist">
      {items.map((t, i) => (
        <span key={i} role="tab" aria-selected={i === active} aria-disabled={i !== active || undefined} className={cn(tab, i === active ? activeTab : inactiveTab)}>
          {t}
        </span>
      ))}
      {right}
    </div>
  );
}

export type Style = {
  id: string;
  label: string;
  layout: PickerLayout;
  /** The picker reactions open, when it differs from `layout` (Notion's has no tabs or shuffle). */
  reaction?: PickerLayout;
  /** Fixed renderer for this style (Discord draws Twemoji everywhere). */
  renderer?: "native" | "twemoji";
  /** Popover size, for positioning. */
  size: { width: number; height: number };
  tapback: {
    className: string;
    reactions: string;
    /** Fixed reactions instead of the user's top frequents (Instagram, Messenger). */
    pinned?: string[];
    /** Classes and contents of the "+" that opens the full picker. */
    more?: { className: string; icon: React.ReactNode };
  };
  autocomplete: {
    className: string;
    /** The options list (padding, height); replaces the default `max-h-64 p-1`. */
    list?: string;
    item: string;
    match: string;
    matchActive?: string;
    header?: (q: string) => React.ReactNode;
    headerClassName?: string;
    showName?: boolean;
    /** Emoji size in px (default 22). */
    emoji?: number;
    /** Shown at the end of the highlighted option (Slack's "Enter"). */
    hint?: React.ReactNode;
  };
  /** `emoji`: pill emoji size in px (default 16); `count`: count classes (default semibold). */
  pill: { base: string; mine: string; add: string; emoji?: number; count?: string; addIcon?: React.ReactNode };
};

