// Internal: the styling contract. Every part carries a stable `data-slot`, sizes
// come from our own CSS variables, and the engine's wrapper elements are made
// layout-transparent, so no consumer ever targets emoji-picker-react markup.
import * as React from "react";
import type * as Epr from "emoji-picker-react/primitives";
import { CollapseContext } from "./collapse";
import { StripNavContext } from "./strip-context";

export const SLOTS = {
  root: "emoji-picker",
  search: "search",
  searchInput: "search-input",
  searchClear: "search-clear",
  categoryNav: "category-nav",
  categoryTab: "category-tab",
  viewport: "viewport",
  list: "list",
  category: "category",
  categoryHeader: "category-header",
  emoji: "emoji",
  skinTone: "skin-tone",
  skinToneOption: "skin-tone-option",
  skinToneOptions: "skin-tone-options",
  reactions: "reactions",
  reactionsExpand: "reactions-expand",
  preview: "preview",
  panel: "panel",
  empty: "empty",
  loading: "loading",
} as const;

/**
 * Public size variables → the engine's. Read on Root, so they can be set on Root
 * itself (a class like `[--emoji-size:22px]`) or inherited from any ancestor.
 * Defaults equal the engine's own.
 */
export const SIZE_VARIABLES: Record<string, string> = {
  "--epr-emoji-size": "var(--emoji-size, 30px)",
  "--epr-emoji-padding": "calc((var(--emoji-cell-size, calc(var(--emoji-size, 30px) + 10px)) - var(--emoji-size, 30px)) / 2)",
  "--epr-horizontal-padding": "var(--emoji-list-padding, 10px)",
  "--epr-category-label-height": "var(--emoji-header-height, 40px)",
  // No fallback: unset stays unset (the engine's emoji font stack applies).
  "--epr-emoji-font-family": "var(--emoji-font-family)",
};

// In the `base` cascade layer, after Tailwind's preflight, so any utility class or
// unlayered CSS overrides it with no @layer setup. The engine's own rules share
// that layer, so the wrapper overrides need real specificity to beat them.
const STRUCTURE = `@layer base{
[data-slot="${SLOTS.search}"]>div,
[data-slot="${SLOTS.categoryNav}"]>div{display:contents}
/* Scrolling past the list's ends stops there instead of scrolling the page (scroll chaining). */
:where([data-slot="${SLOTS.viewport}"]){overscroll-behavior:contain}
/* A horizontal List: the Viewport scrolls sideways, and a swipe past either end doesn't navigate back or forward. */
[data-slot="${SLOTS.viewport}"]:has([data-slot="${SLOTS.list}"][data-orientation="horizontal"]){overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain}
:where([data-slot="${SLOTS.root}"]) [data-epr-part="emoji"] img{padding:calc((var(--epr-emoji-fullsize) - var(--emoji-image-size,var(--emoji-size,30px)))/2)!important}
:where([data-slot="${SLOTS.skinTone}"]){position:relative;display:inline-flex}
/* A collapsed section reaches the engine with no emoji, which hides it; keep its header. */
[data-epr-part="category"]:has(>[data-slot="${SLOTS.categoryHeader}"][data-collapsed]){display:block!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;overflow:visible!important;min-height:0!important}
:where([data-slot="${SLOTS.skinToneOptions}"]){position:absolute;inset-block-start:0;inset-inline-end:0;z-index:3;display:flex}
}`;

/** Injects the structural stylesheet once per document. */
export function useStructureStyles(nonce?: string) {
  const useIsoEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;
  useIsoEffect(() => {
    if (document.querySelector("style[data-emoji-picker-structure]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-emoji-picker-structure", "");
    if (nonce) style.nonce = nonce;
    style.textContent = STRUCTURE;
    document.head.appendChild(style);
  }, [nonce]);
}

/** Wraps an engine part so its root element carries `data-slot`. */
export function slotted<C extends React.ComponentType<any>>(Part: C, slot: string, name: string): C {
  const Slotted = React.forwardRef<unknown, React.ComponentProps<C>>((props, ref) =>
    React.createElement(Part, { "data-slot": slot, ...props, ref }),
  );
  Slotted.displayName = `EmojiPicker.${name}`;
  return Slotted as unknown as C;
}

type Comp<P> = React.ComponentType<P> | undefined;

/**
 * Stable state attributes for styling: the engine's reserved `data-epr-*` state
 * (`data-epr-highlighted`) as plain `data-*`, plus the item's own flags.
 */
function stateAttributes(props: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of ["highlighted", "unified"]) {
    const value = props[`data-epr-${name}`];
    if (value != null && value !== false) out[`data-${name}`] = String(value);
  }
  const item = (props.emoji ?? props.category) as { isActive?: boolean; hasVariations?: boolean } | undefined;
  if (item?.isActive) out["data-active"] = "";
  if (item?.hasVariations) out["data-has-variations"] = "";
  return out;
}

/** Joins class names; the later wins on conflicts only by CSS order (use tailwind-merge in your own `cn`). */
export const joinClasses = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ") || undefined;

/**
 * A render slot: the consumer's component (given `data-slot`, state attributes and
 * the part's class props), or a plain element with the engine's props.
 */
function slot<P extends { children?: React.ReactNode; className?: string }>(
  name: string,
  User: Comp<P>,
  tag: "button" | "div",
  strip: string[],
  useExtra: (props: P) => { className?: string; hidden?: boolean; props?: Partial<P>; attrs?: Record<string, string> } = () => ({}),
) {
  function Slot(incoming: P) {
    const extra = useExtra(incoming);
    if (extra.hidden) return null;
    let props = extra.props ? ({ ...incoming, ...extra.props } as P) : incoming;
    if (extra.className) props = { ...props, className: joinClasses(extra.className, incoming.className) };
    const attrs = { ...stateAttributes(props as Record<string, unknown>), ...extra.attrs, "data-slot": name };
    if (User) return React.createElement(User, { ...props, ...attrs } as P);
    const dom: Record<string, unknown> = { ...props };
    for (const key of strip) delete dom[key];
    return React.createElement(tag, { ...dom, ...attrs });
  }
  Slot.displayName = `Slot(${name})`;
  return Slot;
}

/** A header's section with its collapse state (what custom headers receive). */
export type HeaderCategory = { id: string; name: string; collapsed: boolean; toggleCollapsed: () => void };
type HeaderProps = Omit<Epr.CategoryHeaderRenderProps, "category"> & { category: HeaderCategory };
type UserList = Omit<Epr.ListComponents, "CategoryHeader"> & { CategoryHeader?: React.ComponentType<HeaderProps> };

/** List components with `data-slot` on every cell and header, plus the List's class props. */
export function listSlots(user: UserList = {}, classes: { cell?: string; header?: string } = {}): Epr.ListComponents {
  return {
    Emoji: slot(SLOTS.emoji, user.Emoji, "button", ["emoji"], () => ({ className: classes.cell })),
    CategoryHeader: slot(SLOTS.categoryHeader, user.CategoryHeader, "div", ["category"], function useHeader(props) {
      const collapse = React.useContext(CollapseContext);
      const id = props.category.id;
      const collapsed = collapse.isCollapsed(id);
      const category: HeaderCategory = { ...props.category, collapsed, toggleCollapsed: () => collapse.toggle(id) };
      return { className: classes.header, props: { category }, attrs: collapsed ? { "data-collapsed": "" } : undefined };
    }) as unknown as Epr.ListComponents["CategoryHeader"],
  };
}

/** What CategoryNav and Root tell the tab slots: `tabClassName`, and sections kept out of the bar. */
export const NavContext = React.createContext<{ tabClassName?: string; hidden: ReadonlySet<string> }>({ hidden: new Set() });

/** Root components with `data-slot` on category tabs and buttons. */
export function rootSlots(user: Omit<Epr.PickerComponents, "CategoryHeader"> & UserList = {}): Epr.PickerComponents {
  return {
    ...(user as Epr.PickerComponents),
    CategoryButton: slot(SLOTS.categoryTab, user.CategoryButton, "button", ["category"], function useTab(props) {
      const nav = React.useContext(NavContext);
      const collapse = React.useContext(CollapseContext);
      const strip = React.useContext(StripNavContext);
      const id = props.category.id;
      // With a horizontal List the engine doesn't know the current section or how to
      // reach one; the List does.
      const isActive = strip ? strip.active === id : props.category.isActive;
      const jump = strip ? () => strip.jump(id) : props.onClick;
      const override: Partial<typeof props> | undefined = strip
        ? {
            category: { ...props.category, isActive },
            "aria-selected": isActive,
            tabIndex: isActive || props.tabIndex === -1 && !props.category.isActive ? -1 : 0,
            onClick: () => strip.jump(id),
            ...{ "data-epr-active": isActive ? "" : undefined },
          }
        : undefined;
      // A tab for a collapsed section expands it, then jumps there once the rows are
      // laid out (the engine drops a jump that starts while its layout changes).
      const onClick = collapse.isCollapsed(id)
        ? (e: React.MouseEvent<HTMLButtonElement>) => {
            collapse.setCollapsed(id, false);
            if (jump) requestAnimationFrame(() => requestAnimationFrame(() => (jump as (e: React.MouseEvent<HTMLButtonElement>) => void)(e)));
          }
        : undefined;
      const extra = onClick ? { ...override, onClick } : override;
      return { className: nav.tabClassName, hidden: nav.hidden.has(id), props: extra };
    }),
    ClearButton: slot(SLOTS.searchClear, user.ClearButton, "button", []),
    ExpandButton: slot(SLOTS.reactionsExpand, user.ExpandButton, "button", []),
  };
}
