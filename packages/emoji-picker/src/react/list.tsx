// EmojiPicker.List: the emoji grid (grid.tsx: a React Aria listbox of sections), virtualized
// inside the Viewport by EmojiGridLayout. Categories, or the search results as their own small
// collection; items are shared objects (see sections.ts), and the collection is built from them
// directly (collection.ts), never by rendering them.
// Not React Aria's ListBox: its collection is a hidden React tree with a fiber, props and
// node per emoji per picker (+6.4 MB heap on open, 2.4x per extra picker), and +2.7 KB gzip.
import * as React from "react";
import type { Node as CollectionNode } from "@react-types/shared";
import { useListBoxSection } from "react-aria/useListBox";
import { Rect, type VirtualizerState } from "react-stately/useVirtualizerState";
import { unifiedToNative } from "../core/dataset";
import type { CategoryHeaderProps, EmojiCellProps, HeaderActionsProps, ListComponents, ListEmoji } from "./components";
import { usePicker } from "./context";
import { cellProps, isRtl, useGridController, useGridSections, type Cells, type GridGeometry } from "./grid";
import type { PickerKeyboardEventHandler } from "./keyboard";
import { EmojiGridLayout, type EmojiGridLayoutOptions, type GridMetrics } from "./layout";
import { EmojiGridNavigation } from "./navigation";
import { useArtworkMap } from "./overrides";
import type { EmojiItem, EmojiSection } from "../core/sections";
import { SLOTS, joinClasses } from "./slots";
import { useEmptyState } from "./viewport";
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
  const { searching } = picker;
  const horizontal = orientation === "horizontal";
  const components = React.useMemo(() => ({ ...picker.components, ...listComponents }), [picker.components, listComponents]);
  const { sections, request, probeRoot } = useGridSections(horizontal);
  const loader = Boolean(onLoadMore && !searching);

  // --- Geometry ---------------------------------------------------------------
  const [layout] = React.useState(() => new EmojiGridLayout());
  const [navigation] = React.useState(() => new EmojiGridNavigation(() => layout));
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

  const virtualizer = React.useRef<VirtualizerState<CollectionNode<unknown>, React.ReactNode> | null>(null);
  const jumping = React.useRef<{ x: number; y: number } | null>(null);
  const scroller = React.useCallback((list: HTMLElement | null = listRef.current) => list?.closest<HTMLElement>(`[data-slot="${SLOTS.viewport}"]`) ?? list?.parentElement ?? null, []);
  const geometry = React.useMemo<GridGeometry>(() => {
    const visibleRect = () => virtualizer.current?.virtualizer.visibleRect ?? null;
    const rtl = () => isRtl(listRef.current);
    const horizontal = () => layout.orientation === "horizontal";
    return {
      grid: () => layout.grid,
      navigation,
      layoutDelegate: layout,
      isVisible(key) {
        const r = layout.getLayoutInfo(key)?.rect;
        const rect = visibleRect();
        return Boolean(r && rect && (horizontal() ? r.maxX > rect.x && r.x < rect.maxX : r.maxY > rect.y && r.y < rect.maxY));
      },
      /** The first emoji in view, in reading order (below a stuck title). */
      firstVisible() {
        const rect = visibleRect();
        const { grid, metrics } = layout;
        if (rect && !horizontal()) {
          for (const row of grid.rows) if (row.type === "emojis" && row.offset + row.size > rect.y + (row.section.header ? metrics.headerHeight : 0) + 1 && row.offset < rect.maxY) return row.items[0]!.id;
        } else if (rect)
          for (let i = 0; i < grid.count; i++) {
            const r = layout.getLayoutInfo(grid.at(i)!.id)!.rect;
            if (r.maxX > rect.x + 1 && r.x < rect.maxX) return grid.at(i)!.id;
          }
        return navigation.getFirstKey();
      },
      reveal(key, from) {
        const el = scroller();
        const seen = visibleRect();
        const info = layout.getLayoutInfo(key);
        if (!el || !seen || !info) return;
        // A page scrolls as far as it moves. The visible rect follows scroll events: that scroll isn't in it yet.
        const a = from != null ? layout.getLayoutInfo(from)?.rect : null;
        const sign = horizontal() && rtl() ? -1 : 1;
        const before = horizontal() ? el.scrollLeft : el.scrollTop;
        if (a && horizontal()) el.scrollLeft += (info.rect.x - a.x) * sign;
        else if (a) el.scrollTop += info.rect.y - a.y;
        const moved = ((horizontal() ? el.scrollLeft : el.scrollTop) - before) * sign;
        const rect = horizontal() ? new Rect(seen.x + moved, seen.y, seen.width, seen.height) : new Rect(seen.x, seen.y + moved, seen.width, seen.height);
        if (horizontal()) {
          const pad = layout.metrics.padding;
          if (info.rect.x < rect.x) el.scrollLeft += sign * (info.rect.x - pad - rect.x);
          else if (info.rect.maxX > rect.maxX) el.scrollLeft += sign * (info.rect.maxX + pad - rect.maxX);
          return;
        }
        const inset = layout.grid.locate(layout.grid.indexOf(String(key)))?.section.header ? layout.metrics.headerHeight : 0;
        if (info.rect.y < rect.y + inset) el.scrollTop -= rect.y + inset - info.rect.y;
        else if (info.rect.maxY > rect.maxY) el.scrollTop += info.rect.maxY - rect.maxY;
      },
      viewport() {
        const el = scroller();
        return el ? (horizontal() ? el.clientWidth : el.clientHeight) : 0;
      },
      jump(id, instant) {
        const el = scroller();
        const rect = visibleRect();
        const info = layout.getLayoutInfo(id);
        if (!el || !rect || !info) return false;
        jumping.current = info.rect;
        const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const behavior = instant || reduce ? "auto" : "smooth";
        if (horizontal()) {
          const max = Math.max(0, layout.getContentSize().width - el.clientWidth);
          const target = Math.max(0, Math.min(info.rect.x - layout.metrics.padding, max));
          el.scrollBy({ left: (target - rect.x) * (rtl() ? -1 : 1), behavior });
        } else el.scrollBy({ top: info.rect.y - rect.y, behavior });
        return true;
      },
      /** Over the emoji (under it in the first row in view), centered on it and inside the list. */
      overlay(key) {
        const cell = layout.getLayoutInfo(key)?.rect;
        const list = listRef.current;
        if (!cell || !list) return { position: "absolute", visibility: "hidden" };
        const { cellWidth, cellHeight } = layout.metrics;
        const width = 6 * cellWidth;
        const left = Math.max(0, Math.min(cell.x + cell.width / 2 - width / 2, layout.getContentSize().width - width));
        const above = cell.y - cellHeight;
        const top = above >= (visibleRect()?.y ?? 0) ? above : cell.maxY;
        return { position: "absolute", top: list.offsetTop + top, insetInlineStart: list.offsetLeft + left };
      },
    };
  }, [layout, navigation, scroller]);

  const grid = useGridController({ owner: "react-aria", sections, geometry, orientation, listRef, ref: ref as React.Ref<HTMLElement>, probeRoot, loader, value, onKeyDown, components, cellClassName, headerClassName, "aria-label": rest["aria-label"], "aria-labelledby": rest["aria-labelledby"] });
  const latest = React.useRef(grid);
  latest.current = grid;

  // --- Scroll: the current section and the tab stop ---------------------------------
  const onState = React.useCallback((state: VirtualizerState<CollectionNode<unknown>, React.ReactNode>) => {
    virtualizer.current = state;
  }, []);
  const onRendered = React.useCallback(() => {
    measure();
    latest.current.applyHighlight();
    const shown = virtualizer.current?.virtualizer.getVisibleLayoutInfos();
    if (shown && !horizontal) request([...shown.keys()].flatMap((key) => latest.current.collection.emoji(key)?.unified ?? []));
    const rect = virtualizer.current?.virtualizer.visibleRect;
    if (!rect) return;
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
      const key = end > 0 && offset >= end - 1 && horizontal ? (layout.sections[layout.sections.length - 1]?.key ?? null) : layout.sectionAt(horizontal ? offset + layout.metrics.padding + layout.metrics.cellWidth / 2 : offset);
      picker.state.setActiveSection(key == null ? null : String(key));
    }
    latest.current.syncStop();
  }, [measure, layout, picker.state, searching, horizontal, request]);

  const empty = useEmptyState();
  const { collection, focusedKey } = grid;
  const persistedKeys = React.useMemo(() => new Set(focusedKey == null ? [] : [focusedKey]), [focusedKey]);
  const renderNode = React.useCallback((node: CollectionNode<unknown>) => {
    if (node.type === "section") return <SectionView section={node.value as EmojiSection} />;
    if (node.type === "header") return <SectionHeader section={node.value as EmojiSection} />;
    if (node.type === "loader") return <LoadMore />;
    return <EmojiCell item={node as unknown as EmojiItem} />;
  }, []);

  return (
    <CellsContext.Provider value={grid.cells}>
      <LoadMoreContext.Provider value={loader ? { onLoadMore: onLoadMore!, isLoading: isLoadingMore, children: loadingMore, collection } : null}>
        <div {...rest} {...(grid.gridProps as React.HTMLAttributes<HTMLDivElement>)} className={className} style={style}>
          <VirtualCollection collection={collection} layout={layout} layoutOptions={layoutOptions} scroller={scroller} renderNode={renderNode} persistedKeys={persistedKeys} onState={onState} onRendered={onRendered} />
          <div ref={probeRef} aria-hidden style={PROBE} />
          {collection.size === 0 ? (
            <div role="option" style={{ display: "contents" }}>
              {empty}
            </div>
          ) : null}
        </div>
      </LoadMoreContext.Provider>
      {grid.variations}
      {components.HeaderActions && !horizontal && !searching ? <ActionsLayer layout={layout} list={listRef} Actions={components.HeaderActions} sections={sections} /> : null}
    </CellsContext.Provider>
  );
});

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
  const { props, isActive } = cellProps(cells, item, flags, artwork);
  const User = cells.components.Emoji;
  if (!User) return <div {...(props as React.HTMLAttributes<HTMLDivElement>)} ref={own} />;
  const { record, unified } = item;
  const emoji: ListEmoji = { isActive, unified, names: [...record.shortcodes, record.name], emoji: record.imageUrl ? unified : unifiedToNative(unified), isCustom: Boolean(record.imageUrl), imageUrl: record.imageUrl, hasVariations: record.tones.length > 0 };
  return <User {...({ ...props, ref: own } as Omit<EmojiCellProps, "emoji">)} emoji={emoji} className={joinClasses(props.className)} />;
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
