// EmojiPicker.List: the emoji grid (grid.tsx: a React Aria listbox of sections), virtualized
// inside the Viewport by EmojiGridLayout. Categories, or the search results as their own small
// collection; items are shared objects (see sections.ts), and the collection is built from them
// directly (collection.ts), never by rendering them.
// Not React Aria's ListBox: its collection is a hidden React tree with a fiber, props and
// node per emoji per picker (+6.4 MB heap on open, 2.4x per extra picker), and +2.7 KB gzip.
import * as React from "react";
import type { Node as CollectionNode } from "@react-types/shared";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { useListBoxSection } from "react-aria/useListBox";
import { Rect, type VirtualizerState } from "react-stately/useVirtualizerState";
import type { EmojiItem, EmojiSection } from "../core/sections";
import { usePicker, ViewportContext } from "./context";
import { isRtl, useEmojiCell, useGridController, useGridSections, type CellState, type Cells, type GridGeometry } from "./grid";
import type { PickerKeyboardEventHandler } from "./keyboard";
import { EmojiGridLayout, type EmojiGridLayoutOptions, type GridMetrics } from "./layout";
import { EmojiGridNavigation } from "./navigation";
import { renderElement, resolve, type PartElementProps, type PartProps } from "./render";
import { SLOTS } from "./slots";
import { useEmptyState } from "./viewport";
import { VirtualBranch, VirtualCollection } from "./virtualizer";

export type ListState = { orientation: "vertical" | "horizontal"; searching: boolean; empty: boolean };

export type ListProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "onKeyDown" | "dangerouslySetInnerHTML" | "className" | "style"> & PartProps<ListState> & {
  /** Runs before the picker handles the key (on any cell); see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
  /**
   * Each section, called only for the sections in view: a `List.Section` of `List.SectionTitle`,
   * `List.Items` (each emoji, called only for the emoji in view) and `List.SectionActions`.
   * Default: a title, and a `List.Cell` per emoji.
   */
  children?: (section: EmojiSection) => React.ReactNode;
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
  /** Paging a large custom pack: called as the end of the list scrolls into view (React Aria's ListBoxLoadMoreItem). */
  onLoadMore?: () => void;
  /** A page is loading: the end of the list shows `loadingMore`. */
  isLoadingMore?: boolean;
  loadingMore?: React.ReactNode;
};

const CellsContext = React.createContext<Cells | null>(null);
const HorizontalContext = React.createContext(false);
const TemplateContext = React.createContext<(section: EmojiSection) => React.ReactNode>(() => null);

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

const HORIZONTAL: React.CSSProperties = { flex: "none", width: "max-content" };
const UNPADDED = { "--ep-glyph-pad": "0px" } as React.CSSProperties;
/** Sizes a picker without a width to `columns`. */
const COLUMNS: React.CSSProperties = { height: 0, width: "calc(var(--ep-columns) * var(--ep-cell) + 2 * var(--ep-pad))", maxWidth: "100%" };

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

const ListRoot = React.forwardRef<HTMLDivElement, ListProps>(function List(
  { children, orientation = "vertical", rows = 5, searchRows, onKeyDown, onLoadMore, isLoadingMore, loadingMore, className, style, render, ...rest },
  ref,
) {
  const picker = usePicker("EmojiPicker.List");
  const { searching } = picker;
  const horizontal = orientation === "horizontal";
  const setViewportOrientation = React.useContext(ViewportContext);
  React.useLayoutEffect(() => setViewportOrientation?.(orientation), [setViewportOrientation, orientation]);

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

  const grid = useGridController({ sections, geometry, orientation, listRef, ref: ref as React.Ref<HTMLElement>, probeRoot, loader, onKeyDown, "aria-label": rest["aria-label"], "aria-labelledby": rest["aria-labelledby"] });
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
  const { collection, persisted } = grid;
  const renderNode = React.useCallback((node: CollectionNode<unknown>) => {
    if (node.type === "section") return <SectionView section={node.value as EmojiSection} />;
    if (node.type === "header") return <SectionHeader />;
    if (node.type === "loader") return <LoadMore />;
    return <ItemView item={node as unknown as EmojiItem} />;
  }, []);
  const template = children ?? defaultSection;
  const actions = React.useMemo(() => !horizontal && !searching && sections.some((s) => s.header && partsOf(template(s)).actions), [horizontal, searching, sections, template]);

  return (
    <CellsContext.Provider value={grid.cells}>
      <HorizontalContext.Provider value={horizontal}>
      <TemplateContext.Provider value={template}>
        <LoadMoreContext.Provider value={loader ? { onLoadMore: onLoadMore!, isLoading: isLoadingMore, children: loadingMore, collection } : null}>
          {renderElement(
            "div",
            {
              ...rest,
              ...grid.gridProps,
              className,
              style: (s: ListState) => ({ ...(horizontal ? HORIZONTAL : null), ...(horizontal || results ? UNPADDED : null), ...resolve(style, s) }),
              render,
              children: (
                <>
                  {picker.columns && !horizontal ? <div aria-hidden style={COLUMNS} /> : null}
                  <VirtualCollection collection={collection} layout={layout} layoutOptions={layoutOptions} scroller={scroller} renderNode={renderNode} persistedKeys={persisted} onState={onState} onRendered={onRendered} />
                  <div ref={probeRef} aria-hidden style={PROBE} />
                  {collection.size === 0 ? (
                    <div role="option" style={{ display: "contents" }}>
                      {empty}
                    </div>
                  ) : null}
                </>
              ),
            },
            { orientation, searching, empty: collection.size === 0 },
          )}
        </LoadMoreContext.Provider>
        {grid.variations}
        {actions ? <ActionsLayer layout={layout} list={listRef} sections={sections} /> : null}
      </TemplateContext.Provider>
      </HorizontalContext.Provider>
    </CellsContext.Provider>
  );
});

export type SectionState = { section: EmojiSection; collapsed: boolean };

type SectionData = { section: EmojiSection; groupProps: React.HTMLAttributes<HTMLElement>; headingProps: React.HTMLAttributes<HTMLElement> };
const SectionContext = React.createContext<SectionData | null>(null);
type Parts = { title?: React.ReactElement; items?: React.ReactElement<ItemsProps>; actions?: React.ReactElement<SectionActionsProps> };
const PartsContext = React.createContext<Parts>({});
const ItemContext = React.createContext<EmojiItem | null>(null);

function useSection(part: string) {
  const data = React.useContext(SectionContext);
  if (!data) throw new Error(`EmojiPicker.List.${part} must be in a List.Section, inside EmojiPicker.List's children.`);
  return data;
}

/** The parts a List.Section's children describe; they render where the layout places them, not in place. */
function collectParts(children: React.ReactNode): Parts {
  const parts: Parts = {};
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SectionTitle) parts.title = child;
    else if (child.type === Items) parts.items = child as React.ReactElement<ItemsProps>;
    else if (child.type === SectionActions) parts.actions = child as React.ReactElement<SectionActionsProps>;
  });
  return parts;
}

/** The parts of the List.Section a section's template returns. */
const partsOf = (node: React.ReactNode) => (React.isValidElement<SectionProps>(node) && node.type === Section ? collectParts(node.props.children) : {});

const defaultSection = () => (
  <Section>
    <SectionTitle />
    <Items />
  </Section>
);

function SectionView({ section }: { section: EmojiSection }) {
  const template = React.useContext(TemplateContext);
  const { headingProps, groupProps } = useListBoxSection({ heading: section.header ? section.name : undefined, "aria-label": section.header ? undefined : section.name });
  return <SectionContext.Provider value={{ section, groupProps, headingProps }}>{template(section)}</SectionContext.Provider>;
}

export type SectionProps = Omit<PartElementProps<SectionState, HTMLElement>, "children"> & {
  /** `List.SectionTitle`, `List.Items` and `List.SectionActions`. */
  children?: React.ReactNode;
};

/** A section of the list (a `group`): its title, items and title actions. */
const Section = React.forwardRef<HTMLElement, SectionProps>(function Section({ children, style, ...props }, ref) {
  const cells = React.useContext(CellsContext)!;
  const { section, groupProps } = useSection("Section");
  const parts = collectParts(children);
  return (
    <PartsContext.Provider value={parts}>
      {renderElement(
        "section",
        {
          ...groupProps,
          id: cells.sectionDomId(section.id),
          "data-slot": SLOTS.category,
          "data-category": section.category,
          "data-collapsed": section.collapsed || undefined,
          ...props,
          // The whole section's height: its title sticks within it.
          style: (s: SectionState) => ({ height: "100%", ...resolve(style, s) }),
          ref,
          children: <VirtualBranch parent={section.id} />,
        },
        { section, collapsed: section.collapsed },
      )}
    </PartsContext.Provider>
  );
});

export type SectionTitleProps = PartElementProps<SectionState, HTMLElement>;

/** A section's title, text in the listbox, sticky where the layout puts it. Children default to the section's name. */
const SectionTitle = React.forwardRef<HTMLElement, SectionTitleProps>(function SectionTitle({ children, style, ...props }, ref) {
  const { section, headingProps } = useSection("SectionTitle");
  return renderElement(
    "header",
    { ...headingProps, className: props.className, "data-slot": SLOTS.categoryHeader, "data-collapsed": section.collapsed || undefined, ...props, style: (s: SectionState) => ({ height: "var(--ep-header)", ...resolve(style, s) }), ref, children: children ?? section.name },
    { section, collapsed: section.collapsed },
  );
});

function SectionHeader() {
  const { title } = React.useContext(PartsContext);
  return title ?? <SectionTitle />;
}

export type ItemsProps = {
  /** Each emoji in view. Default: `List.Cell`. */
  children?: (emoji: EmojiItem) => React.ReactNode;
};

/** A section's emoji, each through `children`. */
function Items(_: ItemsProps): null {
  return null;
}

function ItemView({ item }: { item: EmojiItem }) {
  const template = React.useContext(PartsContext).items?.props.children;
  return <ItemContext.Provider value={item}>{template ? template(item) : <Cell />}</ItemContext.Provider>;
}

export type CellProps = PartElementProps<CellState>;

/** An emoji: an `option`, with its state on data attributes. Children default to its glyph. */
const Cell = React.forwardRef<HTMLElement, CellProps>(function Cell({ className, style, render, children, ...props }, ref) {
  const cells = React.useContext(CellsContext);
  const item = React.useContext(ItemContext);
  if (!cells || !item) throw new Error("EmojiPicker.List.Cell must be inside List.Items.");
  const horizontal = React.useContext(HorizontalContext);
  const { cellProps, state } = useEmojiCell(cells, item);
  const refs = React.useMemo(() => mergeRefs(cellProps.ref, ref), [cellProps.ref, ref]);
  return renderElement("div", { ...mergeProps(cellProps, props), ref: refs, className, style: (s: CellState) => ({ ...(horizontal ? FILL : CELL), ...resolve(style, s) }), render, children: children ?? cellProps.children }, state);
});

const CELL: React.CSSProperties = { width: "var(--ep-cell)", height: "var(--ep-cell)", maxWidth: "var(--ep-cell)", maxHeight: "var(--ep-cell)" };
const FILL: React.CSSProperties = { width: "100%", height: "100%" };

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

export type SectionActionsState = SectionState & {
  toggle: () => void;
  /** For the control that toggles: `aria-expanded`. No `aria-controls`: a section out of view has no element to name. */
  toggleProps: { "aria-expanded": boolean };
};

export type SectionActionsProps = PartElementProps<SectionActionsState>;

/**
 * Controls for a section's title (a collapse chevron, a "Customize" link): a layer over the list,
 * outside the listbox, pinned with the title as it sticks.
 */
function SectionActions(_: SectionActionsProps): null {
  return null;
}

function ActionsLayer({ layout, list, sections }: { layout: EmojiGridLayout; list: React.RefObject<HTMLDivElement | null>; sections: readonly EmojiSection[] }) {
  const cells = React.useContext(CellsContext)!;
  const template = React.useContext(TemplateContext);
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
        const actions = s.header ? partsOf(template(s)).actions : undefined;
        if (!info || !actions) return null;
        const { style, children, ...props } = actions.props;
        const state: SectionActionsState = { section: s, collapsed: s.collapsed, toggle: () => cells.toggle(s.id), toggleProps: { "aria-expanded": !s.collapsed } };
        return (
          <div key={s.id} style={{ position: "absolute", top: info.rect.y, insetInlineStart: 0, width: "100%", height: info.rect.height }}>
            {renderElement(
              "div",
              {
                ...props,
                "data-slot": SLOTS.headerActions,
                "data-section": s.id,
                style: (st: SectionActionsState) => ({ position: "sticky", top: 0, height: layout.metrics.headerHeight, zIndex: 3, pointerEvents: "auto", ...resolve(style, st) }),
                children,
              },
              state,
            )}
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

export const List = /* @__PURE__ */ Object.assign(ListRoot, { Section, SectionTitle, SectionActions, Items, Cell });
