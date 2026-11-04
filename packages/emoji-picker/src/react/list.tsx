// EmojiPicker.List: a listbox (React Aria's useListBox, a "grid" of options) of sections,
// virtualized inside the Viewport by EmojiGridLayout. Categories, or the search results
// as their own small collection; items are shared objects (see sections.ts), and the
// collection is built from them directly (collection.ts), never by rendering them.
// Not React Aria's ListBox: its collection is a hidden React tree with a fiber, props and
// node per emoji per picker (+6.4 MB heap on open, 2.4x per extra picker), and +2.7 KB gzip.
import * as React from "react";
import type { Key, Node as CollectionNode } from "@react-types/shared";
import { useFocusRing } from "react-aria/useFocusRing";
import { useFocusVisible } from "react-aria/useFocusVisible";
import { useListBox, useListBoxSection } from "react-aria/useListBox";
import { mergeProps } from "react-aria/mergeProps";
import { useListState, type ListState } from "react-stately/useListState";
import { moveVirtualFocus } from "./virtual-focus";
import { Rect, type VirtualizerState } from "react-stately/useVirtualizerState";
import { AutocompleteStateContext, SelectableCollectionContext } from "react-aria-components/Autocomplete";
import { EmojiCollection } from "./collection";
import { GROUPS, unifiedToNative } from "../core/dataset";
import type { CategoryHeaderProps, EmojiCellProps, HeaderActionsProps, ListComponents, ListEmoji } from "./components";
import { signal, usePicker, type ListHandle } from "./context";
import { Glyph } from "./glyph";
import { mergeRefs, useKeyRegion, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { EmojiGridLayout, type EmojiGridLayoutOptions, type GridMetrics } from "./layout";
import { EmojiGridNavigation } from "./navigation";
import { findArtwork, useArtworkMap } from "./overrides";
import { itemFactory, resultSections, type EmojiItem, type EmojiSection } from "./sections";
import { SLOTS, joinClasses } from "./slots";
import { useDrawable } from "./native-support";
import { useEmptyState } from "./viewport";
import { Variations } from "./variations";
import { VirtualBranch, VirtualCollection } from "./virtualizer";

export type ListProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "onKeyDown" | "dangerouslySetInnerHTML"> & {
  /** Runs before the picker handles the key (on any cell); see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
  components?: ListComponents;
  /**
   * "vertical" (default): sections stacked, scrolling down. "horizontal": sections side
   * by side, each a column-major grid of `rows` rows with its title above its first
   * column, scrolling sideways (the iOS and Gboard emoji keyboards).
   */
  orientation?: "vertical" | "horizontal";
  /** Horizontal only: rows per section. Default 5. */
  rows?: number;
  /** Horizontal only: rows while search results show. Default `rows`; 1 gives a single scrolling row, as iOS does. */
  searchRows?: number;
  /** Classes for every emoji cell (`data-slot="emoji"`); state via data-highlighted, data-focused, data-hovered, data-active. */
  cellClassName?: string;
  /** Classes for every section title (`data-slot="category-header"`). */
  headerClassName?: string;
  /** A value picker (a page icon): the emoji shown as chosen, with `aria-selected`. Compared without skin tone. */
  value?: string | null;
  /** Paging a large custom pack: called as the end of the list scrolls into view (React Aria's ListBoxLoadMoreItem). */
  onLoadMore?: () => void;
  /** A page is loading: the end of the list shows `loadingMore`. */
  isLoadingMore?: boolean;
  loadingMore?: React.ReactNode;
};

/**
 * Hover moves the keyboard position only on a real pointer move: a keyboard scroll
 * slides cells under a resting pointer, and the browser reports hovers (and moves at
 * the same spot) for them.
 */
const pointer = { x: NaN, y: NaN, moved: false, tracking: false };
function trackPointer() {
  if (pointer.tracking) return;
  pointer.tracking = true;
  addEventListener(
    "pointermove",
    (e) => {
      pointer.moved = e.clientX !== pointer.x || e.clientY !== pointer.y;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    },
    { capture: true, passive: true },
  );
}

/** Per-cell state the list sets and each cell reads as one number (one subscription per cell). */
const STOP = 1;
const ACTIVE = 2;
const HOVERED = 4;
const PRESSED = 8;
function cellMarks() {
  const marks = { stop: signal<Key | null>(null), active: signal<Key | null>(null), hovered: signal<Key | null>(null), pressed: signal<Key | null>(null) };
  const all = Object.values(marks);
  return {
    ...marks,
    subscribe(listener: () => void) {
      const off = all.map((s) => s.subscribe(listener));
      return () => off.forEach((f) => f());
    },
    of: (key: Key) => (marks.stop.get() === key ? STOP : 0) | (marks.active.get() === key ? ACTIVE : 0) | (marks.hovered.get() === key ? HOVERED : 0) | (marks.pressed.get() === key ? PRESSED : 0),
  };
}
type CellMarks = ReturnType<typeof cellMarks>;

type Cells = {
  state: ListState<unknown>;
  /** The listbox's id (options are `${id}-option-${key}`) and collection id. */
  listId: string;
  collectionId?: string;
  focusVisible: boolean;
  /** Position in its section, the section's size, and the index in the whole list. */
  position: (id: Key) => readonly [number, number, number] | undefined;
  components: ListComponents;
  cellClassName?: string;
  headerClassName?: string;
  virtual: boolean;
  marks: CellMarks;
  /** Scrolls the Viewport (never the page) so the cell is in view. */
  reveal(id: Key): void;
  sectionDomId(id: string): string;
  toggle(id: string): void;
};
const CellsContext = React.createContext<Cells | null>(null);

const PROBE: React.CSSProperties = {
  position: "absolute",
  visibility: "hidden",
  pointerEvents: "none",
  boxSizing: "content-box",
  top: 0,
  left: 0,
  width: "var(--emoji-cell-width, var(--ep-cell))",
  height: "var(--emoji-cell-height, var(--ep-cell))",
  paddingTop: "var(--ep-header)",
  paddingLeft: "var(--ep-pad)",
  paddingRight: "var(--emoji-section-gap, var(--ep-pad))",
  paddingBottom: "var(--emoji-section-min-width, 0px)",
  marginRight: "var(--emoji-list-padding-end, var(--ep-pad))",
};

/**
 * A row height in layout units (1/64 px) at the element's CSS zoom, as the browser lays out a flow
 * of rows: absolutely placed rows then land on the same device pixels, also under zoom.
 */
function layoutUnits(el: HTMLElement) {
  const zoom = (el as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom || 1;
  return (n: number) => (zoom === 1 ? Math.trunc(n * 64) / 64 : Math.trunc(n * zoom * 64) / 64 / zoom + 1e-6);
}

function readProbe(probe: HTMLElement): GridMetrics {
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  const unit = layoutUnits(probe);
  return { cellWidth: px(cs.width) || 40, cellHeight: unit(px(cs.height)) || 40, headerHeight: unit(px(cs.paddingTop)), padding: px(cs.paddingLeft), paddingEnd: px(cs.marginRight), sectionGap: px(cs.paddingRight), sectionMinWidth: px(cs.paddingBottom) };
}

const sameMetrics = (a: GridMetrics, b: GridMetrics) => (Object.keys(a) as (keyof GridMetrics)[]).every((k) => Math.abs(a[k] - b[k]) < 0.01);

export const List = React.forwardRef<HTMLDivElement, ListProps>(function List(
  { components: listComponents, cellClassName, headerClassName, orientation = "vertical", rows = 5, searchRows, onKeyDown, value, onLoadMore, isLoadingMore, loadingMore, className, style, ...rest },
  ref,
) {
  const picker = usePicker("EmojiPicker.List");
  const { store, labels, searching, focusModel } = picker;
  const horizontal = orientation === "horizontal";
  const components = React.useMemo(() => ({ ...picker.components, ...listComponents }), [picker.components, listComponents]);

  // --- The collection -----------------------------------------------------------
  const item = React.useMemo(() => itemFactory(labels), [labels]);
  const groupNames = store.status() === "ready" ? store.groupNames() : [];
  const categoryName = React.useCallback(
    (group: string) => picker.categories.find((c) => c.id === group)?.name ?? (group === "custom" ? labels.custom : (groupNames[GROUPS.indexOf(group as (typeof GROUPS)[number])] ?? group)),
    [picker.categories, labels, groupNames],
  );
  // The vertical category list leaves out emoji the system can't draw (and repeats within a section).
  const probeRoot = React.useRef<HTMLElement | null>(null);
  const { drawable, request } = useDrawable(probeRoot);
  const categories = React.useMemo(
    () =>
      horizontal
        ? picker.categorySections
        : picker.categorySections.flatMap((s) => {
            const seen = new Set<string>();
            const items = s.items.filter((i) => drawable(i.record, i.unified) && !seen.has(i.unified) && seen.add(i.unified));
            if (items.length === s.items.length) return [s];
            return items.length || s.collapsed ? [{ ...s, items }] : [];
          }),
    [horizontal, picker.categorySections, drawable],
  );
  const resultList = React.useMemo(
    () => (searching ? resultSections(picker.results, picker.searchResults, categoryName, (u) => store.withSkinTone(u), item, labels.searchResults) : null),
    [searching, picker.results, picker.searchResults, categoryName, store, item, labels.searchResults],
  );
  const sections = resultList ?? categories;
  const loader = Boolean(onLoadMore && !searching);
  const collection = React.useMemo(() => new EmojiCollection(sections, loader), [sections, loader]);

  // --- Geometry ---------------------------------------------------------------
  const [layout] = React.useState(() => new EmojiGridLayout());
  const [navigation] = React.useState(() => new EmojiGridNavigation(layout));
  const [metrics, setMetrics] = React.useState<GridMetrics>(layout.metrics);
  const probeRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const results = searching ? picker.searchResults : undefined;
  const layoutOptions = React.useMemo<EmojiGridLayoutOptions>(
    () => ({ orientation, metrics, columns: picker.columns, fitColumns: picker.fitColumns, results: horizontal ? undefined : results, rows: searching ? (searchRows ?? rows) : rows }),
    [orientation, metrics, picker.columns, picker.fitColumns, horizontal, results, searching, searchRows, rows],
  );
  // Sizes come from CSS: the probe reads the variables; a rendered cell and title give their
  // real size (classes may change them). Re-read after every render of the list or its rows.
  const measure = React.useCallback(() => {
    const probe = probeRef.current;
    const list = listRef.current;
    if (!probe || !list) return;
    const next = readProbe(probe);
    if (!horizontal && !results) {
      const cell = list.querySelector<HTMLElement>(`[data-slot="${SLOTS.emoji}"]`);
      const header = list.querySelector<HTMLElement>(`[data-slot="${SLOTS.categoryHeader}"]`);
      const unit = layoutUnits(list);
      if (cell?.offsetHeight) {
        next.cellWidth = cell.offsetHeight;
        next.cellHeight = unit(cell.offsetHeight);
      }
      if (header) next.headerHeight = unit(header.offsetHeight);
    }
    setMetrics((m) => (sameMetrics(m, next) ? m : next));
  }, [horizontal, results]);
  React.useLayoutEffect(measure);

  // --- Focus state --------------------------------------------------------------
  const selected = React.useMemo(() => (value == null ? undefined : sections.flatMap((s) => s.items.filter((i) => baseOf(i.unified) === baseOf(value)).map((i) => i.id))), [value, sections]);
  const state = useListState<unknown>({ collection, selectionMode: value === undefined ? "none" : "single", selectedKeys: selected ?? [], disallowEmptySelection: value !== undefined, layoutDelegate: layout });
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const virtualizer = React.useRef<VirtualizerState<CollectionNode<unknown>, React.ReactNode> | null>(null);
  const autocomplete = React.useContext(AutocompleteStateContext);
  // DOM focus in a cell (Tab from the field): the list leaves virtual focus while it's there.
  const [domFocus, setDomFocus] = React.useState(false);
  const virtual = focusModel === "input" && picker.hasSearch && !domFocus;
  const [marks] = React.useState(cellMarks);
  const pendingFocus = React.useRef<Key | null>(null);
  const lastFocused = React.useRef<Key | null>(null);
  const latest = React.useRef({ collection, virtual, horizontal });
  latest.current = { collection, virtual, horizontal };

  const scroller = React.useCallback((list: HTMLElement | null = listRef.current) => list?.closest<HTMLElement>(`[data-slot="${SLOTS.viewport}"]`) ?? list?.parentElement ?? null, []);
  const rtl = () => (listRef.current ? getComputedStyle(listRef.current).direction === "rtl" : false);
  const visibleRect = () => virtualizer.current?.virtualizer.visibleRect ?? null;

  /** Keys in view, in reading order (below a stuck title). */
  const firstVisible = React.useCallback((): Key | null => {
    const rect = visibleRect();
    if (!rect) return navigation.getFirstKey();
    const horizontal = layout.orientation === "horizontal";
    for (const g of layout.groups)
      for (const key of g.keys) {
        const r = layout.getLayoutInfo(key)?.rect;
        if (!r) continue;
        const inset = !horizontal && g.header ? layout.metrics.headerHeight : 0;
        if (horizontal ? r.maxX > rect.x + 1 && r.x < rect.maxX : r.maxY > rect.y + inset + 1 && r.y < rect.maxY) return key;
      }
    return navigation.getFirstKey();
  }, [layout, navigation]);

  /** Scrolls only the Viewport so `key` is in view (never the page), clear of a stuck title. */
  const reveal = React.useCallback(
    (key: Key, moved = 0) => {
      const el = scroller();
      const seen = visibleRect();
      const info = layout.getLayoutInfo(key);
      if (!el || !seen || !info) return;
      // The visible rect follows scroll events: a scroll made just now (`moved`) isn't in it yet.
      const rect = layout.orientation === "horizontal" ? new Rect(seen.x + moved, seen.y, seen.width, seen.height) : new Rect(seen.x, seen.y + moved, seen.width, seen.height);
      if (layout.orientation === "horizontal") {
        const pad = layout.metrics.padding;
        const sign = rtl() ? -1 : 1;
        if (info.rect.x < rect.x) el.scrollLeft += sign * (info.rect.x - pad - rect.x);
        else if (info.rect.maxX > rect.maxX) el.scrollLeft += sign * (info.rect.maxX + pad - rect.maxX);
        return;
      }
      const group = layout.groups[layout.position(key)?.[0] ?? -1];
      const inset = group?.header ? layout.metrics.headerHeight : 0;
      if (info.rect.y < rect.y + inset) el.scrollTop -= rect.y + inset - info.rect.y;
      else if (info.rect.maxY > rect.maxY) el.scrollTop += info.rect.maxY - rect.maxY;
    },
    [layout, scroller],
  );

  const revealRef = React.useRef(reveal);
  revealRef.current = reveal;

  const setActive = React.useCallback(
    (key: Key | null) => {
      marks.active.set(key);
      picker.activeEmoji.set(latest.current.collection.emoji(key)?.record ?? null);
    },
    [marks, picker.activeEmoji],
  );

  const moveTo = React.useCallback(
    (key: Key, dom: boolean, from?: Key) => {
      const manager = stateRef.current?.selectionManager;
      if (!manager) return;
      // A page keeps the highlight where it is on screen: the list scrolls as far as it moved.
      const el = scroller();
      const a = from != null ? layout.getLayoutInfo(from)?.rect : null;
      const b = layout.getLayoutInfo(key)?.rect;
      let moved = 0;
      if (el && a && b) {
        if (layout.orientation === "horizontal") {
          const sign = rtl() ? -1 : 1;
          const before = el.scrollLeft;
          el.scrollLeft += (b.x - a.x) * sign;
          moved = (el.scrollLeft - before) * sign;
        } else {
          const before = el.scrollTop;
          el.scrollTop += b.y - a.y;
          moved = el.scrollTop - before;
        }
      }
      reveal(key, moved);
      if (dom) pendingFocus.current = key;
      manager.setFocused(true);
      manager.setFocusedKey(key);
      if (dom) marks.stop.set(key);
      setActive(marks.hovered.get() ?? key);
    },
    [reveal, marks, setActive, scroller, layout],
  );

  const pick = React.useCallback(
    (key: Key) => {
      const it = latest.current.collection.emoji(key);
      if (it) picker.pick(it.unified);
    },
    [picker],
  );

  const highlight = (): Key | null => {
    const m = stateRef.current?.selectionManager;
    return m && m.isFocused && latest.current.collection.emoji(m.focusedKey) ? m.focusedKey : null;
  };

  const focusInput = () => listRef.current?.closest(`[data-slot="${SLOTS.root}"]`)?.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`) ?? null;

  // --- Skin-tone variations of one emoji ---------------------------------------------
  const [variations, setVariations] = React.useState<{ key: Key; back: HTMLElement | null } | null>(null);
  const openVariations = (key: Key | null) => {
    const record = latest.current.collection.emoji(key)?.record;
    if (key == null || !record?.tones.length || record.imageUrl || picker.disableVariations) return false;
    setVariations({ key, back: document.activeElement instanceof HTMLElement ? document.activeElement : null });
    return true;
  };
  const closeVariations = (restore: boolean) => {
    if (!variations) return;
    setVariations(null);
    if (!restore) return;
    // Back to the emoji: its cell (grid), or the field with the emoji highlighted.
    const m = stateRef.current.selectionManager;
    (variations.back ?? cellElement(variations.key))?.focus({ preventScroll: true });
    m.setFocused(true);
    m.setFocusedKey(variations.key);
  };

  const focusSearch = () => {
    const input = listRef.current?.closest(`[data-slot="${SLOTS.root}"]`)?.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`);
    if (!input) return false;
    input.focus();
    return true;
  };

  const handle: ListHandle = {
    orientation,
    key(action: KeyboardAction, from: "input" | "list", event?: KeyboardEvent | React.KeyboardEvent) {
      const dom = from === "list";
      if (action === "select") {
        const key = highlight();
        if (key == null) return false;
        pick(key);
        return true;
      }
      let move = action;
      if (rtl() && (move === "move-left" || move === "move-right")) move = move === "move-left" ? "move-right" : "move-left";
      // With focus in the grid, the move starts from the focused cell.
      const cell = dom ? (event?.target as Element | undefined)?.closest?.(`[data-slot="${SLOTS.emoji}"]`)?.getAttribute("data-key") : null;
      const current = cell ?? highlight();
      const viewport = scroller();
      const page = (by: 1 | -1, key: Key) => navigation.page(key, by, viewport ? (layout.orientation === "horizontal" ? viewport.clientWidth : viewport.clientHeight) : 0);
      if (current == null) {
        // Nothing highlighted: Down (and the keys that go forward) start at the first emoji in view.
        const start = move === "first" ? navigation.getFirstKey() : move === "last" ? navigation.getLastKey() : move === "move-down" || move === "move-right" || move === "page-down" ? firstVisible() : null;
        if (start == null) return false;
        moveTo(start, dom);
        return true;
      }
      const next =
        move === "move-down" ? navigation.getKeyBelow(current) : move === "move-up" ? navigation.getKeyAbove(current) : move === "move-right" ? navigation.getKeyRightOf(current) : move === "move-left" ? navigation.getKeyLeftOf(current) : move === "page-down" ? page(1, current) : move === "page-up" ? page(-1, current) : move === "first" ? navigation.getFirstKey() : move === "last" ? navigation.getLastKey() : undefined;
      if (next === undefined) return false;
      if (next == null || next === current) {
        // Up from the top row: back to typing (the field keeps focus), or back to the field.
        if (move === "move-up") {
          if (dom) focusSearch();
          else handle.clear();
        }
        return true;
      }
      moveTo(next, dom, move === "page-down" || move === "page-up" ? current : undefined);
      return true;
    },
    clear() {
      const m = stateRef.current?.selectionManager;
      if (!m || !latest.current.virtual || !m.isFocused || m.focusedKey == null) return false;
      m.setFocused(false);
      autocomplete?.setFocusedNodeId(null);
      setActive(marks.hovered.get());
      return true;
    },
    focus() {
      const m = stateRef.current?.selectionManager;
      const key = m && latest.current.collection.emoji(m.focusedKey) ? m.focusedKey : firstVisible();
      if (key == null) return false;
      setDomFocus(true);
      moveTo(key, true);
      return true;
    },
    jump(id, { instant = false } = {}) {
      const el = scroller();
      const rect = visibleRect();
      const info = layout.getLayoutInfo(id);
      if (!el || !rect || !info) return;
      picker.activeSection.set(id);
      jumping.current = info.rect;
      const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = instant || reduce ? "auto" : "smooth";
      if (layout.orientation === "horizontal") {
        const max = Math.max(0, layout.getContentSize().width - el.clientWidth);
        const target = Math.max(0, Math.min(info.rect.x - layout.metrics.padding, max));
        el.scrollBy({ left: (target - rect.x) * (rtl() ? -1 : 1), behavior });
      } else el.scrollBy({ top: info.rect.y - rect.y, behavior });
      const first = layout.groups.find((g) => g.key === id)?.keys[0];
      if (first != null) marks.stop.set(first);
    },
    focusedItem() {
      const key = highlight();
      return latest.current.collection.emoji(key) ?? null;
    },
    atStart() {
      const key = highlight();
      return key != null && key === navigation.getFirstKey();
    },
    variations(target) {
      const cell = target.closest(`[data-slot="${SLOTS.emoji}"]`);
      const key = cell && listRef.current?.contains(cell) ? cell.getAttribute("data-key") : target === focusInput() ? highlight() : null;
      return openVariations(key);
    },
  };
  const applyHighlightRef = React.useRef<() => void>(() => {});
  const handleRef = React.useRef(handle);
  handleRef.current = handle;
  React.useLayoutEffect(() => {
    const proxy: ListHandle = {
      get orientation() {
        return handleRef.current.orientation;
      },
      key: (a, f, e) => handleRef.current.key(a, f, e),
      clear: () => handleRef.current.clear(),
      focus: () => handleRef.current.focus(),
      jump: (id, o) => handleRef.current.jump(id, o),
      focusedItem: () => handleRef.current.focusedItem(),
      atStart: () => handleRef.current.atStart(),
      variations: (t) => handleRef.current.variations(t),
    };
    picker.list.current = proxy;
    return () => {
      if (picker.list.current === proxy) picker.list.current = null;
    };
  }, [picker.list]);

  // Search results: the best match is highlighted as you type (Enter picks it). New
  // results for the same query keep the highlighted emoji, so a pick doesn't move it.
  // React Aria builds the new collection in a later render, so the highlight is applied
  // once a render has it (see onRendered).
  const kept = React.useRef<{ query: string; unified?: string }>({ query: "" });
  const pendingHighlight = React.useRef<{ key: Key | null } | null>(null);
  React.useLayoutEffect(() => {
    if (!searching) {
      if (kept.current.query) {
        kept.current = { query: "" };
        pendingHighlight.current = { key: null };
      }
      return;
    }
    const all = sections.flatMap((s) => s.items);
    const focused = stateRef.current.selectionManager.focusedKey;
    const unified = all.find((i) => i.id === focused)?.unified ?? kept.current.unified;
    const previous = kept.current.query === picker.query ? all.find((i) => i.unified === unified) : undefined;
    const target = previous ?? all[0];
    kept.current = { query: picker.query, unified: target?.unified };
    pendingHighlight.current = { key: target?.id ?? null };
  }, [sections]);
  const applyHighlight = () => {
    const pending = pendingHighlight.current;
    const state = stateRef.current;
    if (!pending || !state || (pending.key != null && !state.collection.getItem(pending.key))) return;
    pendingHighlight.current = null;
    const m = state.selectionManager;
    if (pending.key == null) {
      m.setFocusedKey(null);
      m.setFocused(false);
      return;
    }
    const input = listRef.current?.closest(`[data-slot="${SLOTS.root}"]`)?.querySelector(`[data-slot="${SLOTS.searchInput}"]`);
    if (latest.current.virtual && document.activeElement === input) m.setFocused(true);
    m.setFocusedKey(pending.key);
    setActive(marks.hovered.get() ?? pending.key);
  };
  applyHighlightRef.current = applyHighlight;
  // Track the highlighted emoji for useActiveEmoji while the field keeps focus.
  const focusedKey = state.selectionManager.focusedKey;
  React.useEffect(() => {
    if (focusedKey != null && searching) kept.current.unified = latest.current.collection.emoji(focusedKey)?.unified;
  }, [focusedKey, searching]);

  // --- Scroll: the current section and the tab stop ---------------------------------
  const jumping = React.useRef<{ x: number; y: number } | null>(null);
  const onState = React.useCallback(
    (state: VirtualizerState<CollectionNode<unknown>, React.ReactNode>) => {
      virtualizer.current = state;
    },
    [],
  );
  const onRendered = React.useCallback(() => {
    measure();
    applyHighlightRef.current();
    const shown = virtualizer.current?.virtualizer.getVisibleLayoutInfos();
    if (shown && !latest.current.horizontal) request([...shown.keys()].flatMap((key) => latest.current.collection.emoji(key)?.unified ?? []));
    const rect = visibleRect();
    if (!rect) return;
    const horizontal = layout.orientation === "horizontal";
    const offset = horizontal ? rect.x : rect.y;
    if (jumping.current) {
      const target = horizontal ? jumping.current.x - layout.metrics.padding : jumping.current.y;
      const max = horizontal ? layout.getContentSize().width - rect.width : layout.getContentSize().height - rect.height;
      if (Math.abs(offset - Math.max(0, Math.min(target, max))) > 1) return;
      jumping.current = null;
    }
    if (!searching) {
      // At the end, the last section is current even when it's short.
      const end = horizontal ? layout.getContentSize().width - rect.width : layout.getContentSize().height - rect.height;
      const key = end > 0 && offset >= end - 1 && horizontal ? (layout.groups[layout.groups.length - 1]?.key ?? null) : layout.sectionAt(horizontal ? offset + layout.metrics.padding + layout.metrics.cellWidth / 2 : offset);
      picker.activeSection.set(key == null ? null : String(key));
    }
    // The tab stop: the focused cell while focus is in the grid; else the last one while
    // it's in view, else the first in view (Tab enters where the user looks).
    const list = listRef.current;
    const inside = list?.contains(document.activeElement) && document.activeElement !== list;
    const stop = marks.stop.get();
    if (!inside) {
      const r = stop != null ? layout.getLayoutInfo(stop)?.rect : null;
      const visible = r && (horizontal ? r.maxX > rect.x && r.x < rect.maxX : r.maxY > rect.y && r.y < rect.maxY);
      if (!visible || !latest.current.collection.emoji(stop)) marks.stop.set(latest.current.collection.emoji(lastFocused.current) && isVisible(lastFocused.current!) ? lastFocused.current : firstVisible());
    }
  }, [measure, layout, picker.activeSection, searching, marks, firstVisible, request]);
  // DOM focus landing on a cell (Tab from the search field, a script, a screen reader) while the
  // list is in virtual-focus mode: the cell becomes the focused key before React Aria's collection
  // sees the focus, or it would treat focus as entering with no key and move it to the first cell.
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onFocusIn = (e: FocusEvent) => {
      const cell = e.target instanceof Element ? e.target.closest(`[data-slot="${SLOTS.emoji}"]`) : null;
      const manager = stateRef.current?.selectionManager;
      const id = cell?.getAttribute("data-key");
      if (!manager || id == null || e.target !== document.activeElement || manager.focusedKey === id) return;
      manager.setFocusedKey(id);
    };
    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
  }, []);
  const isVisible = (key: Key) => {
    const r = layout.getLayoutInfo(key)?.rect;
    const rect = visibleRect();
    return Boolean(r && rect && r.intersects(rect));
  };

  // --- Keys on a focused cell, from Root's dispatcher -------------------------------
  const region = useKeyRegion((action, event) => {
    const cell = (event.target as Element).closest?.(`[data-slot="${SLOTS.emoji}"]`);
    if (!action || !cell || !listRef.current?.contains(cell)) return "pass";
    if (action === "select") {
      const id = cell.getAttribute("data-key");
      if (id != null) pick(id);
      return "handled";
    }
    return handle.key(action, "list", event) ? "handled" : "pass";
  });
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);

  /** The rendered cell for a key (in this list, not a nested one). */
  const cellElement = (key: Key | null | undefined) => (key == null ? null : (listRef.current?.querySelector<HTMLElement>(`[data-slot="${SLOTS.emoji}"][data-key="${CSS.escape(String(key))}"]`) ?? null));
  const hover = (key: Key | null) => {
    marks.hovered.set(key);
    setActive(key ?? highlight());
  };
  /** A real pointer move over a cell: the keyboard position follows (pointer "follows"). */
  const follow = (key: Key) => {
    const m = state.selectionManager;
    if (!pointer.moved || picker.pointer !== "follows" || m.focusedKey === key) return;
    const active = document.activeElement;
    const list = listRef.current;
    const root = list?.closest(`[data-slot="${SLOTS.root}"]`);
    // Hover moves the keyboard position: the highlight while the field has focus, focus
    // itself once it's in the grid. Never from outside the picker.
    if (list?.contains(active) && active !== list) {
      pendingFocus.current = key;
      m.setFocused(true);
      m.setFocusedKey(key);
      marks.stop.set(key);
    } else if (virtual && active instanceof HTMLInputElement && root?.contains(active)) {
      m.setFocused(true);
      m.setFocusedKey(key);
    }
  };
  // Cells have no handlers of their own: the list handles presses, hover and focus for all of them.
  const keyOf = (e: React.SyntheticEvent) => (e.target as Element).closest?.(`[data-slot="${SLOTS.emoji}"]`)?.getAttribute("data-key") ?? null;
  // A long press on an emoji with tones opens its variations; the release then doesn't pick.
  const longPress = React.useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const endPress = () => {
    marks.pressed.set(null);
    if (longPress.current) clearTimeout(longPress.current.timer);
  };
  const cellHandlers: React.HTMLAttributes<HTMLElement> = {
    onPointerDown(e) {
      const key = keyOf(e);
      if (key == null || e.button !== 0) return;
      endPress();
      marks.pressed.set(key);
      longPress.current = { x: e.clientX, y: e.clientY, fired: false, timer: window.setTimeout(() => longPress.current && (longPress.current.fired = openVariations(key)), LONG_PRESS_MS) };
      // Focus stays in the field (virtual focus) or moves to the cell without scrolling.
      e.preventDefault();
      if (e.pointerType === "touch") return;
      const m = state.selectionManager;
      if (virtual) {
        m.setFocused(true);
        m.setFocusedKey(key);
      } else cellElement(key)?.focus({ preventScroll: true });
    },
    onMouseDown(e) {
      if (keyOf(e) != null) e.preventDefault();
    },
    onPointerUp: endPress,
    onPointerCancel: endPress,
    onContextMenu(e) {
      if (longPress.current?.fired) e.preventDefault();
    },
    onClick(e) {
      const key = keyOf(e);
      const held = longPress.current?.fired;
      longPress.current = null;
      if (key == null || held) return;
      if (virtual && (e.nativeEvent as PointerEvent).pointerType === "touch") {
        state.selectionManager.setFocused(true);
        state.selectionManager.setFocusedKey(key);
      }
      pick(key);
    },
    onPointerOver(e) {
      const key = keyOf(e);
      if (e.pointerType !== "touch" && key !== marks.hovered.get()) hover(key);
    },
    onPointerOut(e) {
      const cell = (e.target as Element).closest?.(`[data-slot="${SLOTS.emoji}"]`);
      if (cell && !cell.contains(e.relatedTarget as Node | null) && marks.hovered.get() === cell.getAttribute("data-key")) hover(null);
    },
    onPointerMove(e) {
      const press = longPress.current;
      if (press && !press.fired && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) endPress();
      const key = keyOf(e);
      if (key != null) follow(key);
    },
  };
  const { isFocusVisible: focusVisible } = useFocusVisible();
  React.useEffect(trackPointer, []);

  /** Over the emoji (under it in the first row in view), centered on it and inside the list. */
  const variationsStyle = (key: Key): React.CSSProperties => {
    const cell = layout.getLayoutInfo(key)?.rect;
    const list = listRef.current;
    if (!cell || !list) return { position: "absolute", visibility: "hidden" };
    const { cellWidth, cellHeight } = layout.metrics;
    const width = 6 * cellWidth;
    const left = Math.max(0, Math.min(cell.x + cell.width / 2 - width / 2, layout.getContentSize().width - width));
    const above = cell.y - cellHeight;
    const top = above >= (visibleRect()?.y ?? 0) ? above : cell.maxY;
    return { position: "absolute", top: list.offsetTop + top, insetInlineStart: list.offsetLeft + left };
  };
  const empty = useEmptyState();
  // Under Autocomplete the field drives the list: its id, virtual focus and the keys it forwards.
  const selectable = React.useContext(SelectableCollectionContext) as { ref?: React.Ref<HTMLElement>; filter?: unknown } | null;
  const { ref: fieldRef, filter: _filter, ...collectionProps } = (virtual && selectable) || {};
  const merged = React.useMemo(() => mergeRefs(listRef, probeRoot, ref, userKeys, region, fieldRef as React.Ref<HTMLDivElement>), [ref, userKeys, region, fieldRef]);
  const { listBoxProps } = useListBox(
    {
      ...mergeProps(collectionProps, {
        id: virtual ? undefined : picker.listId,
        "aria-label": rest["aria-label"] ?? (searching ? labels.searchResults : labels.emojiList),
        "aria-labelledby": rest["aria-labelledby"],
      }),
      keyboardDelegate: navigation,
      layoutDelegate: layout,
      isVirtualized: true,
      orientation,
      escapeKeyBehavior: "none",
      shouldFocusWrap: false,
      onAction: pick,
      onFocus(e: React.FocusEvent) {
        // Real DOM focus only: virtual focus (aria-activedescendant) dispatches focus events too.
        const cell = (e.target as Element).closest?.(`[data-slot="${SLOTS.emoji}"]`);
        if (!cell || e.target !== document.activeElement) return;
        const id = cell.getAttribute("data-key");
        lastFocused.current = id;
        marks.stop.set(id);
        setActive(marks.hovered.get() ?? id);
        if (focusModel === "input" && !domFocus) setDomFocus(true);
      },
      onBlur(e: React.FocusEvent) {
        if (!e.nativeEvent.isTrusted || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (domFocus) setDomFocus(false);
        setActive(marks.hovered.get());
      },
    },
    state,
    listRef,
  );
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();
  const listId = (listBoxProps.id as string | undefined) ?? picker.listId;
  const collectionId = (listBoxProps as { "data-collection"?: string })["data-collection"];
  const cells = React.useMemo<Cells>(
    () => ({
      state,
      listId,
      collectionId,
      focusVisible,
      position(id) {
        const p = layout.position(id);
        const group = p && layout.groups[p[0]];
        if (!group) return undefined;
        let index = p[1];
        for (let g = 0; g < p[0]; g++) index += layout.groups[g]!.keys.length;
        return [p[1] + 1, group.keys.length, index];
      },
      components,
      cellClassName,
      headerClassName,
      virtual,
      marks,
      reveal: (id) => revealRef.current(id),
      sectionDomId: (id) => `${picker.listId}-section-${id}`,
      toggle: (id) => picker.collapse.toggle(id),
    }),
    [state, listId, collectionId, focusVisible, layout, components, cellClassName, headerClassName, virtual, marks, picker.listId, picker.collapse],
  );
  // React Aria's per-item focus, for every cell at once: the focused key's cell gets DOM focus
  // (grid) or virtual focus (the field's aria-activedescendant), when it changes or mounts.
  const applied = React.useRef<{ el: Element | null; virtual: boolean }>({ el: null, virtual });
  React.useEffect(() => {
    const m = state.selectionManager;
    const el = m.isFocused ? cellElement(m.focusedKey) : null;
    const last = applied.current;
    applied.current = { el, virtual };
    if (!el || (el === last.el && virtual === last.virtual)) return;
    if (virtual) moveVirtualFocus(el);
    else if (document.activeElement !== el) el.focus({ preventScroll: true });
  });
  // A move from the keyboard (or hover) with focus in the grid lands focus on the cell once rendered.
  React.useLayoutEffect(() => {
    const el = cellElement(pendingFocus.current);
    if (!el) return;
    pendingFocus.current = null;
    el.focus({ preventScroll: true });
  });
  const persistedKeys = React.useMemo(() => new Set(focusedKey == null ? [] : [focusedKey]), [focusedKey]);
  const renderNode = React.useCallback((node: CollectionNode<unknown>) => {
    if (node.type === "section") return <SectionView section={node.value as EmojiSection} />;
    if (node.type === "header") return <SectionHeader section={node.value as EmojiSection} />;
    if (node.type === "loader") return <LoadMore />;
    return <EmojiCell item={node as unknown as EmojiItem} />;
  }, []);
  const isEmpty = collection.size === 0;
  const varied = variations && collection.emoji(variations.key);

  return (
    <CellsContext.Provider value={cells}>
      <LoadMoreContext.Provider value={loader ? { onLoadMore: onLoadMore!, isLoading: isLoadingMore, children: loadingMore, collection } : null}>
        <div
          {...rest}
          {...mergeProps(listBoxProps, focusProps, cellHandlers)}
          ref={merged}
          // One tab stop, a cell, never the list itself. (Under Autocomplete the list has no
          // tabindex: Autocomplete turns virtual focus off for a collection that has one.)
          tabIndex={fieldRef ? undefined : -1}
          className={className}
          style={style}
          data-slot={SLOTS.list}
          data-orientation={orientation}
          data-layout="grid"
          data-empty={isEmpty || undefined}
          data-focused={isFocused || undefined}
          data-focus-visible={isFocusVisible || undefined}
          data-results={searching ? picker.searchResults : undefined}
          aria-busy={(searching && picker.pending) || undefined}
        >
          <VirtualCollection collection={collection} layout={layout} layoutOptions={layoutOptions} scroller={scroller} renderNode={renderNode} persistedKeys={persistedKeys} onState={onState} onRendered={onRendered} />
          <div ref={probeRef} aria-hidden style={PROBE} />
          {isEmpty ? (
            <div role="option" style={{ display: "contents" }}>
              {empty}
            </div>
          ) : null}
        </div>
      </LoadMoreContext.Provider>
      {varied ? (
        <Variations
          record={varied.record}
          style={variationsStyle(variations.key)}
          onPick={(unified) => {
            closeVariations(true);
            picker.pick(unified);
          }}
          onClose={closeVariations}
        />
      ) : null}
      {components.HeaderActions && !horizontal && !searching ? <ActionsLayer layout={layout} list={listRef} Actions={components.HeaderActions} sections={sections} /> : null}
    </CellsContext.Provider>
  );
});

const LONG_PRESS_MS = 500;

const baseOf = (unified: string) => unified.toLowerCase().replace(/-1f3f[b-f]/g, "");

const HeadingContext = React.createContext<React.HTMLAttributes<HTMLElement>>({});

function SectionView({ section }: { section: EmojiSection }) {
  const cells = React.useContext(CellsContext)!;
  const { headingProps, groupProps } = useListBoxSection({ heading: section.header ? section.name : undefined, "aria-label": section.header ? undefined : section.name });
  return (
    <section {...groupProps} id={cells.sectionDomId(section.id)} data-slot={SLOTS.category} data-category={section.category} data-collapsed={section.collapsed || undefined}>
      <HeadingContext.Provider value={headingProps}>
        <VirtualBranch parent={section.id} />
      </HeadingContext.Provider>
    </section>
  );
}

function SectionHeader({ section }: { section: EmojiSection }) {
  const cells = React.useContext(CellsContext)!;
  const heading = React.useContext(HeadingContext);
  const User = cells.components.CategoryHeader;
  const props = { ...heading, className: cells.headerClassName, "data-slot": SLOTS.categoryHeader, "data-collapsed": section.collapsed || undefined, children: section.name };
  if (!User) return <header {...props} />;
  const category: CategoryHeaderProps["category"] = { id: section.category, name: section.name, collapsed: section.collapsed, toggleCollapsed: () => cells.toggle(section.id) };
  return <User {...(props as Omit<CategoryHeaderProps, "category">)} category={category} />;
}

type LoadMoreState = { onLoadMore: () => void; isLoading?: boolean; children: React.ReactNode; collection: object };
const LoadMoreContext = React.createContext<LoadMoreState | null>(null);

/** The end of the list: loads the next page as it nears the viewport, and shows `loadingMore` while one loads. */
function LoadMore() {
  const more = React.useContext(LoadMoreContext);
  const sentinel = React.useRef<HTMLDivElement | null>(null);
  const latest = React.useRef(more?.onLoadMore);
  latest.current = more?.onLoadMore;
  React.useLayoutEffect(() => {
    const el = sentinel.current;
    const root = el?.closest<HTMLElement>(`[data-slot="${SLOTS.viewport}"]`);
    if (!el || typeof IntersectionObserver === "undefined") return;
    // Observed again for every collection: a page that still leaves room loads the next.
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && latest.current?.(), { root, rootMargin: "0px 100% 100% 100%" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [more?.collection]);
  if (!more) return null;
  return (
    <>
      <div style={{ position: "relative", width: 0, height: 0 }} inert>
        <div ref={sentinel} style={{ position: "absolute", height: 1, width: 1 }} />
      </div>
      {more.isLoading && more.children ? (
        <div role="option" tabIndex={-1}>
          {more.children}
        </div>
      ) : null}
    </>
  );
}

function EmojiCell({ item }: { item: EmojiItem }) {
  const cells = React.useContext(CellsContext)!;
  const artwork = useArtworkMap();
  const flags = React.useSyncExternalStore(cells.marks.subscribe, () => cells.marks.of(item.id));
  const own = React.useCallback(
    (el: HTMLElement | null) => {
      // React Aria scrolls a newly focused item into view with the page too (scrollIntoViewport):
      // a cell scrolls only its Viewport, which the keyboard moves already did.
      if (el) el.scrollIntoView = () => cells.reveal(item.id);
    },
    [cells, item.id],
  );
  const { selectionManager: m } = cells.state;
  const { record, unified } = item;
  const position = cells.position(item.id);
  const isFocused = m.isFocused && m.focusedKey === item.id;
  const isSelected = m.selectionMode !== "none" && m.isSelected(item.id);
  const highlighted = cells.virtual && isFocused;
  const isActive = Boolean(flags & ACTIVE) || highlighted;
  const attrs = {
    ref: own,
    id: `${cells.listId}-option-${item.id}`,
    role: "option",
    "aria-label": item.label,
    "aria-selected": m.selectionMode === "none" ? undefined : isSelected,
    "aria-posinset": position?.[0],
    "aria-setsize": position?.[1],
    tabIndex: flags & STOP ? 0 : -1,
    className: cells.cellClassName ?? "",
    "data-slot": SLOTS.emoji,
    "data-key": item.id,
    "data-collection": cells.collectionId,
    "data-unified": unified,
    "data-index": position?.[2],
    "data-selected": isSelected || undefined,
    "data-hovered": flags & HOVERED ? true : undefined,
    "data-focused": isFocused || undefined,
    "data-focus-visible": (isFocused && cells.focusVisible) || undefined,
    "data-pressed": flags & PRESSED ? true : undefined,
    "data-selection-mode": m.selectionMode === "none" ? undefined : m.selectionMode,
    "data-highlighted": highlighted ? "" : undefined,
    "data-active": isActive ? "" : undefined,
    "data-overridden": artwork && findArtwork(artwork, unified) !== undefined ? "" : undefined,
    "data-has-variations": record.tones.length && !record.imageUrl ? "" : undefined,
  };
  const glyph = <Glyph unified={unified} record={record} animate={isActive} />;
  const User = cells.components.Emoji;
  if (!User) return <div {...(attrs as React.HTMLAttributes<HTMLDivElement>)}>{glyph}</div>;
  const emoji: ListEmoji = { isActive, unified, names: [...record.shortcodes, record.name], emoji: record.imageUrl ? unified : unifiedToNative(unified), isCustom: Boolean(record.imageUrl), imageUrl: record.imageUrl, hasVariations: record.tones.length > 0 };
  return (
    <User {...(attrs as Omit<EmojiCellProps, "emoji" | "children">)} emoji={emoji} className={joinClasses(attrs.className)}>
      {glyph}
    </User>
  );
}

function ActionsLayer({ layout, list, Actions, sections }: { layout: EmojiGridLayout; list: React.RefObject<HTMLDivElement | null>; Actions: React.ComponentType<HeaderActionsProps>; sections: readonly EmojiSection[] }) {
  const cells = React.useContext(CellsContext)!;
  const [top, setTop] = React.useState(0);
  const layer = React.useRef<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    const el = list.current;
    if (el && el.offsetTop !== top) setTop(el.offsetTop);
  });
  // The actions sit after the list in the DOM (a listbox holds only options), but Tab keeps reading
  // order: from a cell, forward to the next section's actions, back to its own section's.
  const order = React.useRef(sections);
  order.current = sections;
  React.useEffect(() => {
    const el = list.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const cell = e.target instanceof Element ? e.target.closest(`[data-slot="${SLOTS.emoji}"]`) : null;
      const at = order.current.findIndex((s) => s.items.some((i) => i.id === cell?.getAttribute("data-key")));
      if (!cell || at < 0) return;
      const actions = (i: number) => layer.current?.querySelector<HTMLElement>(`[data-section="${CSS.escape(order.current[i]!.id)}"]`)?.querySelector<HTMLElement>(TABBABLE) ?? null;
      let target: HTMLElement | null = null;
      if (e.shiftKey) for (let i = at; i >= 0 && !target; i--) target = actions(i);
      else {
        for (let i = at + 1; i < order.current.length && !target; i++) target = actions(i);
        // None after: past the actions too, to what follows the list.
        if (!target && layer.current) target = nextTabbable(layer.current);
      }
      if (!target) return;
      // Not on to React Aria, which would put focus back on the collection's last tabbable cell.
      e.preventDefault();
      e.stopPropagation();
      target.focus();
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [list]);
  return (
    <div ref={layer} role="presentation" style={{ position: "absolute", top, insetInlineStart: 0, width: "100%", height: layout.getContentSize().height, pointerEvents: "none" }}>
      {sections.map((s) => {
        const info = layout.getLayoutInfo(s.id);
        if (!info || !s.header) return null;
        return (
          <div key={s.id} style={{ position: "absolute", top: info.rect.y, insetInlineStart: 0, width: "100%", height: info.rect.height }}>
            <div data-slot={SLOTS.headerActions} data-section={s.id} style={{ position: "sticky", top: 0, height: layout.metrics.headerHeight, zIndex: 3, pointerEvents: "none" }}>
              <Actions section={{ id: s.category, name: s.name }} collapsed={s.collapsed} toggle={() => cells.toggle(s.id)} toggleProps={{ "aria-expanded": !s.collapsed }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TABBABLE = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** The first tabbable element after `after` (and outside it) in document order. */
function nextTabbable(after: Element): HTMLElement | null {
  for (const el of after.ownerDocument.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (after.contains(el) || el.tabIndex < 0 || !(after.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (el.getClientRects().length && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}
